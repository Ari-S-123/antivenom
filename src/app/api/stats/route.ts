/**
 * API Route: /api/stats
 * Returns system statistics for the dashboard
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/data/prisma";
import { isProducerConnected } from "@/lib/integrations/redpanda";
import { ensureDefenseStreaming, isConsumerConnected } from "@/lib/integrations/redpanda-consumer";
import { ensureRefinementLoop } from "@/lib/integrations/refiner-consumer";

/**
 * GET /api/stats
 * Returns aggregated statistics about threats and defenses
 * @returns {Promise<NextResponse>} JSON response with system statistics
 */
export async function GET() {
  try {
    // Ensure defense consumer and refiner are running
    await ensureDefenseStreaming();
    await ensureRefinementLoop();

    // Get counts from Postgres
    const [totalThreats, testedThreats, effectiveThreats, totalDefenses] = await Promise.all([
      prisma.threat.count(),
      prisma.threat.count({ where: { tested: true } }),
      prisma.threat.count({ where: { effective: true } }),
      prisma.defenseRule.count()
    ]);

    // Check real streaming status
    const streaming = isProducerConnected() || isConsumerConnected();

    return NextResponse.json({
      total_threats: totalThreats,
      tested_threats: testedThreats,
      effective_threats: effectiveThreats,
      defenses_generated: totalDefenses,
      streaming_active: streaming
    });
  } catch (error) {
    console.error("[API] Error fetching stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
