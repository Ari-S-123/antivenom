/**
 * API Route: /api/feedback
 * Accepts feedback on defense rule effectiveness for self-improvement
 */

import { NextResponse } from "next/server";
import { publishFeedback } from "@/lib/integrations/redpanda-telemetry";
import { prisma } from "@/lib/data/prisma";

/**
 * Valid feedback labels
 */
const VALID_LABELS = ["false_positive", "false_negative", "true_positive", "true_negative"];

/**
 * POST /api/feedback
 * Submit feedback on a defense rule's effectiveness
 * Body: { rule_id: string, input_preview: string, label: string, notes?: string }
 * @param {Request} request - Request with feedback data
 * @returns {Promise<NextResponse>} JSON response confirming submission
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));

    const rule_id: string | undefined = body?.rule_id;
    const input_preview: string | undefined = body?.input_preview;
    const label: string | undefined = body?.label;
    const notes: string | undefined = body?.notes;

    // Validate required fields
    if (
      typeof rule_id !== "string" ||
      rule_id.trim() === "" ||
      typeof input_preview !== "string" ||
      input_preview.trim() === "" ||
      typeof label !== "string" ||
      !VALID_LABELS.includes(label)
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid feedback payload. Required: rule_id, input_preview, label (false_positive|false_negative|true_positive|true_negative)"
        },
        { status: 400 }
      );
    }

    const event = {
      event_id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      timestamp: new Date().toISOString(),
      rule_id,
      input_preview: input_preview.slice(0, 500),
      label: label as "false_positive" | "false_negative" | "true_positive" | "true_negative",
      notes
    };

    // Publish to Redpanda
    await publishFeedback(event);

    // Store in Postgres
    await prisma.feedbackEvent.create({
      data: {
        event_id: event.event_id,
        timestamp: new Date(event.timestamp),
        rule_id: event.rule_id,
        input_preview: event.input_preview,
        label: event.label,
        notes: event.notes
      }
    });

    console.log(`[API] Feedback recorded: ${event.event_id} for rule ${rule_id} (${label})`);

    return NextResponse.json({ status: "ok", event_id: event.event_id });
  } catch (error) {
    console.error("[API] Feedback submission error:", error);
    return NextResponse.json(
      {
        error: "Feedback submission failed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
