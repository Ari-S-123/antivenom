/**
 * Telemetry types for detection events and feedback
 * Used for self-improvement and metrics tracking
 */

/**
 * Detection event from agent enforcement endpoint
 */
export type DetectionEvent = {
  /** Unique event identifier (format: det_{timestamp}_{random}) */
  event_id: string;
  /** ISO 8601 timestamp of detection */
  timestamp: string;
  /** Preview of input text (max 240 chars) */
  input_preview: string;
  /** Whether input was allowed */
  allowed: boolean;
  /** Rule ID that triggered (if blocked) */
  rule_id?: string;
  /** Regex matches (if blocked) */
  matches?: string[];
  /** Human-readable reason */
  reason?: string;
};

/**
 * Feedback event for labeling detection quality
 */
export type FeedbackEvent = {
  /** Unique event identifier (format: fb_{timestamp}_{random}) */
  event_id: string;
  /** ISO 8601 timestamp of feedback */
  timestamp: string;
  /** Rule ID being evaluated */
  rule_id: string;
  /** Preview of input text */
  input_preview: string;
  /** Feedback label */
  label: "false_positive" | "false_negative" | "true_positive" | "true_negative";
  /** Optional human notes */
  notes?: string;
};

