/**
 * API Route: /api/defenses
 * Returns all generated defense rules
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/data/store";

/**
 * GET /api/defenses
 * Returns all defense rules
 * @returns {Promise<NextResponse>} JSON response with defenses array
 */
export async function GET() {
  try {
    const defenses = db.defenses.getAll();

    return NextResponse.json({
      defenses,
      total: defenses.length
    });
  } catch (error) {
    console.error("[API] Error fetching defenses:", error);
    return NextResponse.json({ error: "Failed to fetch defenses" }, { status: 500 });
  }
}
