/**
 * Frontend API client
 * Provides typed functions for calling backend API routes
 */

import type { Threat, DefenseRule, Stats, TestAttackResponse } from "@/lib/types";

/**
 * Fetch all threats from the API
 * @returns {Promise<{threats: Threat[]; total: number; untested: number}>} Threats with counts
 */
export async function fetchThreats(): Promise<{
  threats: Threat[];
  total: number;
  untested: number;
}> {
  const res = await fetch("/api/threats");
  if (!res.ok) {
    throw new Error("Failed to fetch threats");
  }
  return res.json();
}

/**
 * Test an attack pattern and generate defense
 * @param {number} threatId - ID of the threat to test
 * @param {string} pattern - Attack pattern text
 * @returns {Promise<TestAttackResponse>} Validation and defense results
 */
export async function testAttack(threatId: number, pattern: string): Promise<TestAttackResponse> {
  const res = await fetch("/api/test-attack", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ threat_id: threatId, attack_pattern: pattern })
  });

  if (!res.ok) {
    throw new Error("Failed to test attack");
  }

  return res.json();
}

/**
 * Fetch all defense rules from the API
 * @returns {Promise<{defenses: DefenseRule[]; total: number}>} Defense rules with count
 */
export async function fetchDefenses(): Promise<{
  defenses: DefenseRule[];
  total: number;
}> {
  const res = await fetch("/api/defenses");
  if (!res.ok) {
    throw new Error("Failed to fetch defenses");
  }
  return res.json();
}

/**
 * Fetch system statistics
 * @returns {Promise<Stats>} System statistics
 */
export async function fetchStats(): Promise<Stats> {
  const res = await fetch("/api/stats");
  if (!res.ok) {
    throw new Error("Failed to fetch stats");
  }
  return res.json();
}

/**
 * Seed the database with sample threats
 * @returns {Promise<{status: string; count: number}>} Seed operation result
 */
export async function seedThreats(): Promise<{
  status: string;
  count: number;
}> {
  const res = await fetch("/api/threats", { method: "POST" });
  if (!res.ok) {
    throw new Error("Failed to seed threats");
  }
  return res.json();
}
