/**
 * API Route: /api/defenses
 * Returns all generated defense rules
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/data/prisma";

/**
 * GET /api/defenses
 * Returns all defense rules
 * @returns {Promise<NextResponse>} JSON response with defenses array
 */
export async function GET() {
  try {
    const defenses = await prisma.defenseRule.findMany({
      orderBy: { created_at: "desc" }
    });

    // Transform to match frontend type expectations
    const formattedDefenses = defenses.map((d) => ({
      rule_id: d.rule_id,
      threat_id: d.threat_id,
      attack_type: d.attack_type,
      defense_code: d.defense_code,
      confidence: d.confidence,
      created_at: d.created_at.toISOString(),
      deployed: d.deployed,
      rule_spec: d.rule_spec
    }));

    return NextResponse.json({
      defenses: formattedDefenses,
      total: defenses.length
    });
  } catch (error) {
    console.error("[API] Error fetching defenses:", error);
    return NextResponse.json({ error: "Failed to fetch defenses" }, { status: 500 });
  }
}
