/**
 * Redpanda telemetry producer for detection events and feedback
 * Publishes to separate topics for observability and self-improvement
 */

import { Kafka, Producer } from "kafkajs";
import type { DetectionEvent, FeedbackEvent } from "@/lib/types-telemetry";

const kafka = new Kafka({
  clientId: "antivenom-telemetry",
  brokers: [process.env.REDPANDA_BROKERS || "localhost:19092"]
});

let producer: Producer | null = null;

/**
 * Ensure producer is connected (lazy initialization)
 * @returns {Promise<Producer>} Connected producer instance
 */
async function ensureProducer(): Promise<Producer> {
  if (producer) return producer;

  const p = kafka.producer();
  await p.connect();
  producer = p;
  console.log("[Telemetry] Producer connected");

  return p;
}

/**
 * Publish a detection event to the detections topic
 * @param {DetectionEvent} ev - Detection event to publish
 * @returns {Promise<void>}
 */
export async function publishDetection(ev: DetectionEvent): Promise<void> {
  try {
    const p = await ensureProducer();
    await p.send({
      topic: "detections",
      messages: [{ key: ev.event_id, value: JSON.stringify(ev) }]
    });
    console.log(`[Telemetry] Published detection event: ${ev.event_id}`);
  } catch (error) {
    console.error("[Telemetry] Error publishing detection:", error);
  }
}

/**
 * Publish a feedback event to the feedback topic
 * @param {FeedbackEvent} ev - Feedback event to publish
 * @returns {Promise<void>}
 */
export async function publishFeedback(ev: FeedbackEvent): Promise<void> {
  try {
    const p = await ensureProducer();
    await p.send({
      topic: "feedback",
      messages: [{ key: ev.event_id, value: JSON.stringify(ev) }]
    });
    console.log(`[Telemetry] Published feedback event: ${ev.event_id} (${ev.label})`);
  } catch (error) {
    console.error("[Telemetry] Error publishing feedback:", error);
  }
}

/**
 * Disconnect telemetry producer (called on shutdown)
 * @returns {Promise<void>}
 */
export async function disconnectTelemetry(): Promise<void> {
  try {
    if (producer) {
      await producer.disconnect();
      console.log("[Telemetry] Producer disconnected");
    }
  } finally {
    producer = null;
  }
}

// Graceful shutdown
process.on("SIGTERM", disconnectTelemetry);
process.on("SIGINT", disconnectTelemetry);
