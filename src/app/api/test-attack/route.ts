/**
 * API Route: /api/test-attack
 * Main flow: validates attacks with GPT-5 and generates defenses
 */

import { NextResponse } from "next/server";
import { validateAttack, generateDefense } from "@/lib/integrations/openai";
import { publishDefense } from "@/lib/integrations/redpanda";
import { db } from "@/lib/data/store";
import type { DefenseRule } from "@/lib/types";

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

    // Update threat status in store
    db.threats.update(threat_id, {
      tested: true,
      effective: validation.is_effective
    });

    // If attack is not effective, return early
    if (!validation.is_effective) {
      return NextResponse.json({
        threat_id,
        validation,
        defense: null,
        message: "Attack ineffective - no defense needed"
      });
    }

    // Step 2: Generate defense code with GPT-5
    console.log(`[API] Generating defense for ${validation.attack_type}`);
    const defenseData = await generateDefense(attack_pattern, validation.attack_type);

    // Create defense rule
    const defense: DefenseRule = {
      rule_id: `def_${Date.now()}`,
      threat_id,
      attack_type: validation.attack_type,
      defense_code: defenseData.defense_code,
      confidence: defenseData.confidence,
      created_at: new Date().toISOString(),
      deployed: true
    };

    // Store defense
    db.defenses.add(defense);

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
