/**
 * API Route: /api/threats/ingest
 * Triggers live scraping via Apify and ingests new threats
 */

import { NextResponse } from "next/server";
import { ingestThreatsFromApify } from "@/lib/integrations/apify";

/**
 * POST /api/threats/ingest
 * Triggers a live scrape and ingests new threats into the database
 * @returns {Promise<NextResponse>} JSON response with ingestion results
 */
export async function POST() {
  try {
    console.log("[API] Starting threat ingestion from Apify");

    const { added, total } = await ingestThreatsFromApify();

    return NextResponse.json({
      status: "ok",
      added,
      total
    });
  } catch (error) {
    console.error("[API] Ingest error:", error);
    return NextResponse.json(
      {
        error: "Ingest failed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
