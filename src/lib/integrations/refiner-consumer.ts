/**
 * Auto-refiner consumer for self-improvement
 * Ingests detections and feedback, tracks metrics per rule, and auto-refines when quality degrades
 */

import { Kafka, Consumer } from "kafkajs";
import type { DetectionEvent, FeedbackEvent } from "@/lib/types-telemetry";
import type { DefenseRuleSpec, AttackType } from "@/lib/types";
import { generateDefenseSpec } from "@/lib/integrations/openai";
import { publishDefense } from "@/lib/integrations/redpanda";
import { addRule } from "@/lib/defense/engine";
import { prisma } from "@/lib/data/prisma";

/**
 * Metrics counters per rule
 */
type Counters = {
  tp: number; // true positives
  tn: number; // true negatives
  fp: number; // false positives
  fn: number; // false negatives
  samples: string[]; // sample inputs for few-shot refinement
  lastUpdated: number; // timestamp of last update
};

const counters = new Map<string, Counters>();
let consumersStarted = false;

/**
 * Ensure counter exists for a rule
 * @param {string} ruleId - Rule identifier
 * @returns {Counters} Counter object
 */
function ensureCounter(ruleId: string): Counters {
  if (!counters.has(ruleId)) {
    counters.set(ruleId, {
      tp: 0,
      tn: 0,
      fp: 0,
      fn: 0,
      samples: [],
      lastUpdated: Date.now()
    });
  }
  return counters.get(ruleId)!;
}

/**
 * Calculate precision for a rule
 * @param {Counters} c - Counter object
 * @returns {number} Precision score (0-1)
 */
function precision(c: Counters): number {
  const denom = c.tp + c.fp;
  return denom === 0 ? 1 : c.tp / denom;
}

/**
 * Calculate recall for a rule
 * @param {Counters} c - Counter object
 * @returns {number} Recall score (0-1)
 */
function recall(c: Counters): number {
  const denom = c.tp + c.fn;
  return denom === 0 ? 1 : c.tp / denom;
}

/**
 * Check if rule needs refinement and refine if necessary
 * @param {string} ruleId - Rule identifier
 * @param {AttackType} attackType - Attack type classification
 * @returns {Promise<void>}
 */
async function maybeRefine(ruleId: string, attackType: AttackType): Promise<void> {
  const c = counters.get(ruleId);
  if (!c) return;

  const PREC_MIN = 0.9;
  const REC_MIN = 0.8;
  const MIN_SAMPLES = 20;
  const COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes

  // Check conditions
  if (c.samples.length < MIN_SAMPLES) return;
  if (Date.now() - c.lastUpdated < COOLDOWN_MS) return;

  const p = precision(c);
  const r = recall(c);

  if (p >= PREC_MIN && r >= REC_MIN) return;

  console.log(`[Refiner] Rule ${ruleId} needs refinement: precision=${p.toFixed(2)}, recall=${r.toFixed(2)}`);

  try {
    // Use accumulated samples to guide refinement (few-shot)
    const positives = c.samples.slice(0, 20).join("\n---\n");
    const refined = await generateDefenseSpec(positives, attackType);

    // Increment version
    const existingRule = await prisma.defenseRule.findUnique({
      where: { rule_id: ruleId }
    });

    const currentVersion = existingRule?.rule_spec ? (existingRule.rule_spec as any).version || "1.0.0" : "1.0.0";
    const [major, minor, patch] = currentVersion.split(".").map(Number);
    const newVersion = `${major}.${minor}.${patch + 1}`;

    const newSpec: DefenseRuleSpec = {
      rule_id: ruleId, // Replace in place
      attack_type: attackType,
      patterns: refined.patterns,
      flags: refined.flags ?? "i",
      block_if_matches: refined.block_if_matches,
      description: refined.description,
      version: newVersion
    };

    // Publish updated spec to Redpanda (other agents will pick it up)
    await publishDefense({
      rule_id: ruleId,
      threat_id: existingRule?.threat_id ?? 0,
      attack_type: attackType,
      defense_code: "# Auto-refined via self-improvement loop",
      confidence: 0.95,
      created_at: new Date().toISOString(),
      deployed: true,
      rule_spec: newSpec
    });

    // Update in Postgres
    await prisma.defenseRule.update({
      where: { rule_id: ruleId },
      data: {
        rule_spec: newSpec as any, // Prisma Json type
        confidence: 0.95
      }
    });

    // Hot-reload locally
    addRule(newSpec);

    console.log(`[Refiner] Refined rule ${ruleId} to version ${newVersion}`);

    // Reset counters
    c.samples = [];
    c.tp = 0;
    c.tn = 0;
    c.fp = 0;
    c.fn = 0;
    c.lastUpdated = Date.now();
  } catch (error) {
    console.error(`[Refiner] Failed to refine rule ${ruleId}:`, error);
  }
}

/**
 * Start refiner consumers (idempotent)
 * Consumes detections and feedback, triggers auto-refinement
 * @returns {Promise<void>}
 */
export async function ensureRefinementLoop(): Promise<void> {
  if (consumersStarted) return;
  consumersStarted = true;

  const kafka = new Kafka({
    clientId: "antivenom-refiner",
    brokers: [process.env.REDPANDA_BROKERS || "localhost:19092"]
  });

  const detConsumer = kafka.consumer({ groupId: "refiner-detections" });
  const fbConsumer = kafka.consumer({ groupId: "refiner-feedback" });

  try {
    await detConsumer.connect();
    await fbConsumer.connect();
    console.log("[Refiner] Consumers connected");

    await detConsumer.subscribe({ topic: "detections", fromBeginning: false });
    await fbConsumer.subscribe({ topic: "feedback", fromBeginning: false });

    // Detection consumer: accumulate samples
    await detConsumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        try {
          const ev = JSON.parse(message.value.toString()) as DetectionEvent;
          if (!ev.rule_id) return;

          const c = ensureCounter(ev.rule_id);
          c.samples.push(ev.input_preview);
          c.lastUpdated = Date.now();

          // Keep samples limited
          if (c.samples.length > 50) c.samples = c.samples.slice(-50);
        } catch (err) {
          console.error("[Refiner] Error processing detection:", err);
        }
      }
    });

    // Feedback consumer: update metrics and trigger refinement
    await fbConsumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;
        try {
          const ev = JSON.parse(message.value.toString()) as FeedbackEvent;
          const c = ensureCounter(ev.rule_id);

          // Increment counters
          if (ev.label === "false_positive") c.fp++;
          if (ev.label === "false_negative") c.fn++;
          if (ev.label === "true_positive") c.tp++;
          if (ev.label === "true_negative") c.tn++;

          c.samples.push(ev.input_preview);
          c.lastUpdated = Date.now();

          // Keep samples limited
          if (c.samples.length > 50) c.samples = c.samples.slice(-50);

          // Fetch attack type from database
          const rule = await prisma.defenseRule.findUnique({
            where: { rule_id: ev.rule_id },
            select: { attack_type: true }
          });

          if (rule) {
            await maybeRefine(ev.rule_id, rule.attack_type as AttackType);
          }
        } catch (err) {
          console.error("[Refiner] Error processing feedback:", err);
        }
      }
    });

    console.log("[Refiner] Refinement loop running");
  } catch (error) {
    console.error("[Refiner] Failed to start refinement loop:", error);
    consumersStarted = false;
  }
}
