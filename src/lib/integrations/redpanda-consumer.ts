/**
 * Redpanda consumer that ingests defense rules and updates the defense engine
 * Uses a singleton guard so it only starts once per Node process
 */

import { Kafka, Consumer } from "kafkajs";
import type { DefenseRule } from "@/lib/types";
import { addRule } from "@/lib/defense/engine";

let consumer: Consumer | undefined;
let consumerConnected = false;
let started = false;

/**
 * Check if consumer has an active connection
 * @returns {boolean} True if consumer is connected
 */
export function isConsumerConnected(): boolean {
  return consumerConnected;
}

/**
 * Ensure the defense consumer is running (idempotent)
 * Safe to call from any API route; starts only once
 * @returns {Promise<void>}
 */
export async function ensureDefenseStreaming(): Promise<void> {
  if (started) return;
  started = true;

  const kafka = new Kafka({
    clientId: "antivenom-engine",
    brokers: [process.env.REDPANDA_BROKERS || "localhost:19092"]
  });

  consumer = kafka.consumer({ groupId: "antivenom-engine" });

  try {
    await consumer.connect();
    consumerConnected = true;
    console.log("[Consumer] Defense consumer connected");

    await consumer.subscribe({ topic: "defense-rules", fromBeginning: false });

    await consumer.run({
      eachMessage: async ({ message }) => {
        if (!message.value) return;

        try {
          const parsed = JSON.parse(message.value.toString()) as DefenseRule;

          // Register rule into engine if it has a valid spec
          if (parsed?.rule_spec) {
            addRule(parsed.rule_spec);
            console.log(`[Consumer] Loaded defense rule: ${parsed.rule_id}`);
          }
        } catch (err) {
          // Log and continue so the stream doesn't die
          console.error("[Consumer] Failed to process defense message:", err);
        }
      }
    });

    console.log("[Consumer] Defense consumer running");
  } catch (err) {
    consumerConnected = false;
    started = false;
    console.error("[Consumer] Failed to start defense consumer:", err);
  }
}

/**
 * Stop the consumer (called on process shutdown)
 * @returns {Promise<void>}
 */
export async function stopDefenseStreaming(): Promise<void> {
  try {
    if (consumer) {
      await consumer.disconnect();
      console.log("[Consumer] Defense consumer disconnected");
    }
  } finally {
    consumerConnected = false;
    started = false;
    consumer = undefined;
  }
}

// Graceful shutdown
process.on("SIGTERM", stopDefenseStreaming);
process.on("SIGINT", stopDefenseStreaming);

