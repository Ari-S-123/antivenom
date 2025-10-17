/**
 * Live threat ingestion via Apify
 * Triggers Apify actor on known sources and extracts likely prompt-injection patterns
 */

import { ApifyClient } from "apify-client";
import { prisma } from "@/lib/data/prisma";
import { ApifyDatasetItem } from "@/lib/types";

/**
 * Default sources for threat discovery
 */
const DEFAULT_SOURCES: string[] = [
  "https://github.com/search?q=%22prompt+injection%22&type=issues",
  "https://github.com/search?q=%22jailbreak%22+%22prompt%22&type=issues",
  "https://www.reddit.com/search/?q=%22prompt%20injection%22&sort=new"
];

/**
 * Run Apify actor to crawl sources and return raw items
 * Uses the Website Content Crawler actor which is more reliable and modern
 * @param {string[]} sources - URLs to scrape (defaults to DEFAULT_SOURCES)
 * @returns {Promise<any[]>} Array of scraped items
 * @throws {Error} If APIFY_API_TOKEN is not set or actor fails
 */
export async function runThreatScraper(sources: string[] = DEFAULT_SOURCES): Promise<ApifyDatasetItem[]> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    throw new Error("APIFY_API_TOKEN environment variable not set");
  }

  // Use Website Content Crawler which is more modern and has simpler input requirements
  // Alternative: use APIFY_ACTOR_ID env var to override
  const actorId = process.env.APIFY_ACTOR_ID || "apify~website-content-crawler";
  const client = new ApifyClient({ token });

  console.log(`[Apify] Starting scraper for ${sources.length} sources using ${actorId}`);

  // Validate sources before triggering the actor
  const sanitizedSources = Array.isArray(sources)
    ? sources.filter((u) => typeof u === "string" && u.trim() !== "")
    : [];
  if (sanitizedSources.length === 0) {
    throw new Error("No sources provided for Apify run");
  }

  // Format startUrls according to Apify standards
  const startUrls = sanitizedSources.map((url) => ({ url }));

  console.log(`[Apify] Input configuration:`, {
    actorId,
    urlCount: startUrls.length,
    urls: startUrls
  });

  try {
    const run = await client.actor(actorId).call({
      startUrls,
      maxCrawlDepth: 1,
      maxCrawlPages: 30,
      // Additional configuration for better results
      crawlerType: "cheerio",
      maxRequestsPerMinute: 60,
      maxSessionRotations: 10
    });

    if (!run || !run.defaultDatasetId) {
      throw new Error("Actor run failed to create dataset");
    }

    console.log(`[Apify] Actor run completed. Dataset ID: ${run.defaultDatasetId}`);

    const list = await client.dataset(run.defaultDatasetId).listItems();
    const items = (list?.items ?? []) as unknown as ApifyDatasetItem[];
    console.log(`[Apify] Scraper completed with ${items.length} items`);

    return items || [];
  } catch (error) {
    console.error(`[Apify] Actor run failed:`, error);

    // Provide more detailed error information
    if (error instanceof Error) {
      const errorDetails = {
        message: error.message,
        name: error.name,
        stack: error.stack
      };
      console.error(`[Apify] Error details:`, errorDetails);

      // Re-throw with more context
      throw new Error(`Apify actor ${actorId} failed: ${error.message}`);
    }

    throw error;
  }
}

/**
 * Extract candidate threats from a raw text blob using heuristics
 * Focuses on "ignore", "system prompt", "jailbreak" etc.
 * @param {string} text - Raw scraped text
 * @param {string} url - Source URL for context
 * @returns {Array} Array of threat candidate objects
 */
export function extractThreatsFromText(
  text: string,
  url: string
): Array<{
  title: string;
  attack_pattern: string;
  source_url: string;
  source_type: "github" | "reddit" | "cve";
  discovered_at: Date;
}> {
  const results: Array<{
    title: string;
    attack_pattern: string;
    source_url: string;
    source_type: "github" | "reddit" | "cve";
    discovered_at: Date;
  }> = [];

  if (!text) return results;

  // Extract lines that likely contain attack patterns
  const candidates = text
    .split(/\n+/)
    .map((s) => s.trim())
    .filter(
      (s) =>
        /ignore\s+.*\s*(previous|all).*instruction/i.test(s) ||
        /system\s+prompt/i.test(s) ||
        /jailbreak/i.test(s) ||
        /\bDAN\b/i.test(s) ||
        /disregard.*(?:above|prior)/i.test(s) ||
        /role.*play.*(?:as|be)/i.test(s)
    );

  // De-duplicate and filter by length
  const seen = new Set<string>();
  for (const c of candidates.slice(0, 10)) {
    // Max 10 per source
    if (c.length < 40 || c.length > 1000) continue;

    const key = c.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const source_type: "github" | "reddit" | "cve" = /reddit/i.test(url) ? "reddit" : "github";

    results.push({
      title: "Discovered Prompt Injection",
      attack_pattern: c,
      source_url: url,
      source_type,
      discovered_at: new Date()
    });
  }

  return results;
}

/**
 * Ingest threats by scraping, extracting patterns, and inserting into Postgres
 * @returns {Promise<{added: number; total: number}>} Result counts
 * @throws {Error} If scraping or database operations fail
 */
export async function ingestThreatsFromApify(): Promise<{ added: number; total: number }> {
  const items = await runThreatScraper();

  let added = 0;

  for (const item of items) {
    const url: string =
      typeof item?.url === "string" && item.url.trim() !== ""
        ? item.url
        : typeof item?.request?.url === "string"
          ? item.request.url
          : "";

    const raw = item?.text ?? item?.pageFunctionResult ?? item?.markdown;
    const text: string =
      typeof raw === "string" ? raw : typeof raw === "number" ? String(raw) : raw != null ? JSON.stringify(raw) : "";

    if (!text) continue;

    const source_type: "github" | "reddit" | "cve" = /reddit/i.test(url) ? "reddit" : "github";
    const extracted = extractThreatsFromText(text, url).map((t) => ({
      ...t,
      source_url: url,
      source_type
    }));

    for (const threat of extracted) {
      try {
        // Use upsert to avoid duplicates on attack_pattern
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
        // Skip duplicates or validation errors
        console.warn(`[Apify] Skipping threat: ${err}`);
      }
    }
  }

  const total = await prisma.threat.count();
  console.log(`[Apify] Ingestion complete: ${added} added, ${total} total`);

  return { added, total };
}
