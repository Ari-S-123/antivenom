/**
 * API Route: /api/apify-webhook
 * Webhook endpoint for Apify dataset updates
 */

import { NextResponse } from "next/server";
import { ApifyClient } from "apify-client";
import { extractThreatsFromText } from "@/lib/integrations/apify";
import { prisma } from "@/lib/data/prisma";

/**
 * POST /api/apify-webhook
 * Receives webhook notifications from Apify when dataset is updated
 * Body: { datasetId: string }
 * @param {Request} request - Request with datasetId
 * @returns {Promise<NextResponse>} JSON response with ingestion results
 */
export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const datasetId: string | undefined = body?.datasetId;

    if (typeof datasetId !== "string" || datasetId.trim() === "") {
      return NextResponse.json({ error: "Missing datasetId" }, { status: 400 });
    }

    console.log(`[API] Processing Apify webhook for dataset: ${datasetId}`);

    const token = process.env.APIFY_API_TOKEN;
    if (!token) {
      throw new Error("APIFY_API_TOKEN not set");
    }

    const client = new ApifyClient({ token });
    const { items } = await client.dataset(datasetId).listItems();

    let added = 0;

    for (const item of items) {
      const url: string = item?.url || item?.request?.url || "";
      const text: string = (item?.text || item?.pageFunctionResult || item?.markdown || "").toString();

      if (!text) continue;

      const source_type: "github" | "reddit" | "cve" = /reddit/i.test(url) ? "reddit" : "github";
      const extracted = extractThreatsFromText(text, url).map((t) => ({
        ...t,
        source_url: url,
        source_type
      }));

      for (const threat of extracted) {
        try {
          await prisma.threat.upsert({
            where: { attack_pattern: threat.attack_pattern },
            update: {},
            create: {
              title: threat.title,
              attack_pattern: threat.attack_pattern,
              source_url: threat.source_url,
              source_type: threat.source_type,
              discovered_at: threat.discovered_at,
              tested: false
            }
          });
          added++;
        } catch (err) {
          console.warn(`[API] Skipping threat: ${err}`);
        }
      }
    }

    return NextResponse.json({ status: "ok", added });
  } catch (error) {
    console.error("[API] Apify webhook error:", error);
    return NextResponse.json(
      {
        error: "Webhook processing failed",
        details: error instanceof Error ? error.message : "Unknown error"
      },
      { status: 500 }
    );
  }
}
