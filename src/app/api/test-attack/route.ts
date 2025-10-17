/**
 * API Route: /api/test-attack
 * Main flow: validates attacks with GPT-5 and generates defenses
 */

import { NextResponse } from "next/server";
import { validateAttack, generateDefense, generateDefenseSpec } from "@/lib/integrations/openai";
import { publishDefense } from "@/lib/integrations/redpanda";
import { prisma } from "@/lib/data/prisma";
import type { DefenseRule, DefenseRuleSpec } from "@/lib/types";

/**
 * POST /api/test-attack
 * Tests an attack pattern and generates defensive code
 * @param {Request} request - Request containing threat_id and attack_pattern
 * @returns {Promise<NextResponse>} JSON response with validation and defense
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { threat_id, attack_pattern } = body;

    // Validate required fields
    if (!threat_id || !attack_pattern) {
      return NextResponse.json({ error: "Missing threat_id or attack_pattern" }, { status: 400 });
    }

    console.log(`[API] Testing threat ${threat_id}`);

    // Step 1: Validate attack with GPT-5-mini
    const validation = await validateAttack(attack_pattern);

    console.log(`[API] Validation complete: ${validation.is_effective ? "EFFECTIVE" : "INEFFECTIVE"}`);

    // Update threat status in database
    await prisma.threat.update({
      where: { id: threat_id },
      data: {
        tested: true,
        effective: validation.is_effective
      }
    });

    // If attack is not effective, return early
    if (!validation.is_effective) {
      return NextResponse.json({
        threat_id,
        validation,
        defense: undefined,
        message: "Attack ineffective - no defense generated"
      });
    }

    // Step 2a: Generate machine-applyable spec for defense engine
    console.log(`[API] Generating defense spec for ${validation.attack_type}`);
    const partialSpec = await generateDefenseSpec(attack_pattern, validation.attack_type);

    // Step 2b: Generate Python code for human review
    console.log(`[API] Generating defense code for ${validation.attack_type}`);
    const defenseData = await generateDefense(attack_pattern, validation.attack_type);

    const rule_id = `def_${Date.now()}`;
    const created_at = new Date();

    // Construct complete rule spec
    const rule_spec: DefenseRuleSpec = {
      rule_id,
      attack_type: partialSpec.attack_type,
      patterns: partialSpec.patterns,
      flags: partialSpec.flags ?? "i",
      block_if_matches: partialSpec.block_if_matches,
      description: partialSpec.description,
      version: "1.0.0"
    };

    // Create defense rule object
    const defense: DefenseRule = {
      rule_id,
      threat_id,
      attack_type: validation.attack_type,
      defense_code: defenseData.defense_code,
      confidence: defenseData.confidence,
      created_at: created_at.toISOString(),
      deployed: true,
      rule_spec
    };

    // Store defense in Postgres
    await prisma.defenseRule.create({
      data: {
        rule_id,
        threat_id,
        attack_type: validation.attack_type,
        defense_code: defenseData.defense_code,
        confidence: defenseData.confidence,
        created_at,
        deployed: true,
        rule_spec: rule_spec as any // Prisma Json type
      }
    });

    // Step 3: Stream defense to Redpanda
    console.log(`[API] Publishing defense ${defense.rule_id} to Redpanda`);
    await publishDefense(defense);

    return NextResponse.json({
      threat_id,
      validation,
      defense,
      message: "Defense generated and deployed"
    });
  } catch (error) {
    console.error("[API] Error testing attack:", error);
    return NextResponse.json(
      {
        error: "Failed to test attack",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
