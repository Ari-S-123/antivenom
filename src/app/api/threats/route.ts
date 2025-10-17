/**
 * API Route: /api/threats
 * Handles threat discovery and listing
 */

import { NextResponse } from "next/server";
import { db } from "@/lib/data/store";

/**
 * GET /api/threats
 * Returns all discovered threats with statistics
 * @returns {Promise<NextResponse>} JSON response with threats array and counts
 */
export async function GET() {
  try {
    const threats = db.threats.getAll();

    return NextResponse.json({
      threats,
      total: threats.length,
      untested: threats.filter((t) => !t.tested).length
    });
  } catch (error) {
    console.error("[API] Error fetching threats:", error);
    return NextResponse.json({ error: "Failed to fetch threats" }, { status: 500 });
  }
}

/**
 * POST /api/threats
 * Seeds the database with sample threats (for demo purposes)
 * @returns {Promise<NextResponse>} JSON response with seed status
 */
export async function POST() {
  try {
    const count = db.threats.seed();

    return NextResponse.json({
      status: "seeded",
      count
    });
  } catch (error) {
    console.error("[API] Error seeding threats:", error);
    return NextResponse.json({ error: "Failed to seed threats" }, { status: 500 });
  }
}
