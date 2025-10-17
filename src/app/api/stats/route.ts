/**
 * API Route: /api/stats
 * Returns system statistics for the dashboard
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/data/store";

/**
 * GET /api/stats
 * Returns aggregated statistics about threats and defenses
 * @returns {Promise<NextResponse>} JSON response with system statistics
 */
export async function GET() {
  try {
    const threats = db.threats.getAll();
    const defenses = db.defenses.getAll();

    return NextResponse.json({
      total_threats: threats.length,
      tested_threats: threats.filter((t) => t.tested).length,
      effective_threats: threats.filter((t) => t.effective === true).length,
      defenses_generated: defenses.length,
      streaming_active: true // Always true when system is running
    });
  } catch (error) {
    console.error("[API] Error fetching stats:", error);
    return NextResponse.json({ error: "Failed to fetch stats" }, { status: 500 });
  }
}
