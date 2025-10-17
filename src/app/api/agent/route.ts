/**
 * API Route: /api/agent
 * Agent enforcement endpoint that applies defense rules to input text
 */

import { NextResponse } from "next/server";
import { shouldBlock, listRules } from "@/lib/defense/engine";
import { ensureDefenseStreaming, isConsumerConnected } from "@/lib/integrations/redpanda-consumer";
import { publishDetection } from "@/lib/integrations/redpanda-telemetry";
import { prisma } from "@/lib/data/prisma";

/**
 * Truncate text to preview length
 * @param {string} s - Input string
 * @returns {string} Truncated string with ellipsis if needed
 */
function preview(s: string): string {
  return s.length > 240 ? `${s.slice(0, 240)}…` : s;
}

/**
 * POST /api/agent
 * Apply current defenses to the provided input text
 * Body: { input: string }
 * @param {Request} request - Request with input text
 * @returns {Promise<NextResponse>} Decision response (allowed/blocked)
 */
export async function POST(request: Request) {
  try {
    // Ensure defense consumer is running
    await ensureDefenseStreaming();

    const body = await request.json().catch(() => ({}));
    const input: string | undefined = body?.input;

    if (typeof input !== "string" || input.trim() === "") {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }

    // Apply defense engine
    const decision = shouldBlock(input);

    // Generate telemetry event
    const baseEvent = {
      event_id: `det_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      timestamp: new Date().toISOString(),
      input_preview: preview(input)
    };

    if (decision.blocked) {
      const detectionEvent = {
        ...baseEvent,
        allowed: false,
        rule_id: decision.rule_id,
        matches: decision.matches,
        reason: "Matched defense rule"
      };

      // Publish to Redpanda
      await publishDetection(detectionEvent);

      // Store in Postgres
      await prisma.detectionEvent.create({
        data: {
          event_id: detectionEvent.event_id,
          timestamp: new Date(detectionEvent.timestamp),
          input_preview: detectionEvent.input_preview,
          allowed: false,
          rule_id: detectionEvent.rule_id,
          matches: detectionEvent.matches as any, // Prisma Json type
          reason: detectionEvent.reason
        }
      });

      return NextResponse.json(
        {
          allowed: false,
          reason: "Matched defense rule",
          rule_id: decision.rule_id,
          matches: decision.matches
        },
        { status: 403 }
      );
    }

    const detectionEvent = {
      ...baseEvent,
      allowed: true,
      reason: "No defenses triggered"
    };

    // Publish to Redpanda
    await publishDetection(detectionEvent);

    // Store in Postgres
    await prisma.detectionEvent.create({
      data: {
        event_id: detectionEvent.event_id,
        timestamp: new Date(detectionEvent.timestamp),
        input_preview: detectionEvent.input_preview,
        allowed: true,
        reason: detectionEvent.reason
      }
    });

    // If allowed, return success
    return NextResponse.json({
      allowed: true,
      message: "No defenses triggered",
      rules_loaded: listRules().length,
      consumer_connected: isConsumerConnected()
    });
  } catch (error) {
    console.error("[API] Agent apply error:", error);
    return NextResponse.json(
      { error: "Agent evaluation failed", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    );
  }
}
