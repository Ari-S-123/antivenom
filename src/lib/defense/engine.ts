/**
 * In-memory defense engine that compiles and applies defense rules to text
 * This is the actual enforcement mechanism used by the agent endpoint
 */

import type { DefenseRuleSpec } from "@/lib/types";

/**
 * Compiled rule with pre-compiled regex patterns for performance
 */
export type CompiledRule = {
  /** Unique rule identifier */
  rule_id: string;
  /** Attack type classification */
  attack_type: string;
  /** Human-readable description */
  description: string;
  /** If true, block when any pattern matches */
  block_if_matches: boolean;
  /** Pre-compiled regex patterns */
  regexes: RegExp[];
};

/**
 * In-memory storage of compiled rules
 */
const compiled: Map<string, CompiledRule> = new Map();

/**
 * Compile and register a new rule spec
 * @param {DefenseRuleSpec} spec - Machine-applyable rule spec
 * @throws {Error} If spec is invalid or regex compilation fails
 */
export function addRule(spec: DefenseRuleSpec): void {
  if (!spec || !spec.rule_id || !Array.isArray(spec.patterns) || spec.patterns.length === 0) {
    throw new Error("Invalid rule spec: missing fields or empty patterns");
  }

  const flags = spec.flags || "i";
  const regexes: RegExp[] = [];

  for (const pattern of spec.patterns) {
    try {
      regexes.push(new RegExp(pattern, flags));
    } catch (err) {
      throw new Error(`Invalid regex pattern in rule ${spec.rule_id}: ${String(err)}`);
    }
  }

  compiled.set(spec.rule_id, {
    rule_id: spec.rule_id,
    attack_type: spec.attack_type,
    description: spec.description,
    block_if_matches: spec.block_if_matches,
    regexes
  });

  console.log(`[Engine] Added rule ${spec.rule_id} with ${regexes.length} patterns`);
}

/**
 * Remove a rule by ID
 * @param {string} ruleId - Rule identifier
 */
export function removeRule(ruleId: string): void {
  compiled.delete(ruleId);
  console.log(`[Engine] Removed rule ${ruleId}`);
}

/**
 * Apply all rules to a text input and decide whether to block
 * @param {string} text - Input text to evaluate
 * @returns {object} Decision with optional trigger details
 */
export function shouldBlock(text: string): {
  blocked: boolean;
  rule_id?: string;
  matches?: string[];
} {
  if (!text || compiled.size === 0) {
    return { blocked: false };
  }

  for (const rule of compiled.values()) {
    const matches: string[] = [];

    for (const rx of rule.regexes) {
      const m = text.match(rx);
      if (m && m[0]) {
        matches.push(m[0]);
      }
    }

    // If any pattern matched and rule says to block on matches
    if (rule.block_if_matches && matches.length > 0) {
      console.log(`[Engine] Blocked by rule ${rule.rule_id}: ${matches.length} matches`);
      return {
        blocked: true,
        rule_id: rule.rule_id,
        matches
      };
    }
  }

  return { blocked: false };
}

/**
 * Return current rules snapshot (for debugging/UX)
 * @returns {CompiledRule[]} Array of compiled rules
 */
export function listRules(): CompiledRule[] {
  return Array.from(compiled.values());
}

/**
 * Clear all rules (for testing)
 */
export function clearRules(): void {
  compiled.clear();
  console.log("[Engine] Cleared all rules");
}
