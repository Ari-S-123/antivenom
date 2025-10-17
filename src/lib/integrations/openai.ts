/**
 * OpenAI integration using Vercel AI SDK
 * Provides GPT-5 powered attack validation and defense generation
 */

import { generateObject } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import type { ValidationResult, AttackType } from "@/lib/types";

/**
 * Validate if an attack pattern is effective using GPT-5-mini
 * @param {string} pattern - The attack pattern to validate
 * @returns {Promise<ValidationResult>} Validation result with effectiveness analysis
 */
export async function validateAttack(pattern: string): Promise<ValidationResult> {
  const { object } = await generateObject({
    model: openai("gpt-5-mini"),
    schema: z.object({
      is_effective: z.boolean().describe("Whether the attack is effective"),
      attack_type: z
        .enum(["instruction_override", "role_manipulation", "prompt_extraction", "encoding_trick"])
        .describe("Type of attack detected"),
      confidence: z.number().min(0).max(1).describe("Confidence score (0-1)"),
      explanation: z.string().describe("Human-readable explanation"),
      attack_vector: z.string().describe("Attack vector description")
    }),
    prompt: `You are a cybersecurity expert analyzing prompt injection attacks.

Analyze if this is an effective prompt injection attack that could compromise a vulnerable AI agent:

"${pattern}"

Determine:
1. Is this attack effective? (Would it successfully bypass typical safeguards?)
2. What type of attack is this?
3. How confident are you in this assessment?
4. Explain why it works or doesn't work
5. Describe the attack vector

Be thorough and realistic in your assessment.`,
    temperature: 0.1
  });

  return object;
}

/**
 * Generate defensive code to block an attack type using GPT-5
 * @param {string} pattern - Example attack pattern
 * @param {AttackType} attackType - Type of attack to defend against
 * @returns {Promise<{defense_code: string; confidence: number; description: string}>} Generated defense
 */
export async function generateDefense(
  pattern: string,
  attackType: AttackType
): Promise<{
  defense_code: string;
  confidence: number;
  description: string;
}> {
  const { object } = await generateObject({
    model: openai("gpt-5"),
    schema: z.object({
      defense_code: z.string().describe("Python function code to detect and block the attack"),
      confidence: z.number().min(0).max(1).describe("Confidence in defense effectiveness (0-1)"),
      description: z.string().describe("Human-readable description of the defense mechanism")
    }),
    prompt: `You are a cybersecurity expert creating defensive code for AI systems.

Generate a Python function to detect and block ${attackType} attacks.

Example attack pattern:
"${pattern}"

Requirements:
1. Create a function: def should_block(text: str) -> bool
2. Use regex patterns, string analysis, or heuristics to detect similar attacks
3. Return True if the text should be blocked, False otherwise
4. Include proper imports (re, string, etc.)
5. Make it efficient and reliable
6. Handle edge cases and variations of the attack

The function should be production-ready and well-commented.`,
    temperature: 0.2
  });

  return object;
}

/**
 * Generate a machine-applyable rule spec for the defense engine
 * This returns regex patterns and metadata we can compile in TypeScript
 * @param {string} pattern - Example attack pattern
 * @param {AttackType} attackType - Type of attack to defend against
 * @returns {Promise<Omit<DefenseRuleSpec, "rule_id" | "version">>} Generated rule spec (caller adds rule_id/version)
 */
export async function generateDefenseSpec(
  pattern: string,
  attackType: AttackType
): Promise<{
  description: string;
  block_if_matches: boolean;
  flags?: string;
  patterns: string[];
  attack_type: AttackType;
}> {
  const { object } = await generateObject({
    model: openai("gpt-5"),
    schema: z.object({
      description: z.string().describe("Concise human-readable description of what is blocked"),
      block_if_matches: z.boolean().describe("True if any single match should block, false only for special cases"),
      flags: z.string().optional().describe("Regex flags string (default 'i')"),
      patterns: z
        .array(z.string().min(1))
        .min(3)
        .max(8)
        .describe("Generalized regex patterns that catch realistic variants")
    }),
    prompt: `You are generating an enforceable rule for a prompt injection defense engine.

Attack example:
"${pattern}"

Attack type: ${attackType}

Return JSON with:
- description: concise human-readable description of what is blocked
- block_if_matches: true if any single match should block, false only for special cases
- flags: a regex flags string (default "i" for case-insensitive)
- patterns: 3-8 generalized regex patterns that catch realistic variants (be conservative; avoid catastrophic backtracking)

Requirements:
- Patterns must be safe and efficient JavaScript regex
- Do NOT include code or function definitions
- Focus on detecting the attack pattern, not blocking it
- Handle common evasion techniques (spacing, case, encoding variations)
- Avoid overly broad patterns that would cause false positives

Example patterns for instruction override:
["ignore\\s+(?:all\\s+)?(?:previous\\s+)?instructions?", "disregard\\s+(?:the\\s+)?(?:above|prior)"]`,
    temperature: 0.2
  });

  return {
    description: object.description,
    block_if_matches: object.block_if_matches,
    flags: object.flags,
    patterns: object.patterns,
    attack_type: attackType
  };
}
