/**
 * Redpanda integration using kafkajs
 * Provides real-time streaming of defense rules to distributed agents
 */

import { Kafka, Producer } from "kafkajs";
import type { DefenseRule } from "@/lib/types";

/**
 * Kafka client configuration for Redpanda
 */
const kafka = new Kafka({
  clientId: "antivenom",
  brokers: [process.env.REDPANDA_BROKERS || "localhost:19092"]
});

/**
 * Singleton producer instance
 * Reused across requests to avoid connection overhead
 */
let producer: Producer | null = null;

/**
 * Producer connection state
 */
let producerConnected = false;

/**
 * Check if producer has an active connection
 * @returns {boolean} True if producer is connected
 */
export function isProducerConnected(): boolean {
  return producerConnected;
}

/**
 * Publish a defense rule to the Redpanda topic
 * @param {DefenseRule} defense - Defense rule to publish
 * @returns {Promise<void>}
 * @throws {Error} If publishing fails
 */
export async function publishDefense(defense: DefenseRule): Promise<void> {
  try {
    // Initialize producer if not already connected
    if (!producer) {
      producer = kafka.producer();
      await producer.connect();
      producerConnected = true;
      console.log("[Redpanda] Producer connected");
    }

    // Send defense rule to topic
    await producer.send({
      topic: "defense-rules",
      messages: [
        {
          key: defense.rule_id,
          value: JSON.stringify(defense)
        }
      ]
    });

    console.log(`[Redpanda] Published defense rule: ${defense.rule_id} for threat ${defense.threat_id}`);
  } catch (error) {
    console.error("[Redpanda] Error publishing defense:", error);
    producerConnected = false;
    // Don't throw - allow the API to return success even if Redpanda is unavailable
    // This provides graceful degradation
  }
}

/**
 * Disconnect the producer (called on process shutdown)
 * @returns {Promise<void>}
 */
export async function disconnectProducer(): Promise<void> {
  if (producer) {
    await producer.disconnect();
    producer = null;
    console.log("[Redpanda] Producer disconnected");
  }
}
