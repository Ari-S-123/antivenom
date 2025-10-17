/**
 * AntiVenom Dashboard - Main Page
 * Autonomous AI Defense Platform
 */

"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Play } from "lucide-react";
import { ThreatMonitor } from "@/components/threat-monitor";
import { DefenseLab } from "@/components/defense-lab";
import { LiveStream } from "@/components/live-stream";
import { StatsCards } from "@/components/stats-cards";
import { fetchStats, seedThreats } from "@/lib/api/client";
import type { Stats } from "@/lib/types";

/**
 * Main dashboard page component
 * Displays threat monitoring, defense lab, and live streaming interfaces
 * @returns {JSX.Element} Dashboard page
 */
export default function Dashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [seeded, setSeeded] = useState(false);
  const [ingesting, setIngesting] = useState(false);

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 5000);
    return () => clearInterval(interval);
  }, []);

  /**
   * Load system statistics from API
   */
  async function loadStats() {
    try {
      const data = await fetchStats();
      setStats(data);
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  }

  /**
   * Seed the database with sample threats
   */
  async function handleSeed() {
    try {
      await seedThreats();
      setSeeded(true);
      await loadStats();
    } catch (error) {
      console.error("Error seeding threats:", error);
      alert("Failed to seed threats. Check console for details.");
    }
  }

  /**
   * Ingest live threats from Apify
   */
  async function handleIngest() {
    setIngesting(true);
    try {
      const res = await fetch("/api/threats/ingest", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        alert(`Ingested ${data.added} new threats! Total: ${data.total}`);
        await loadStats();
      } else {
        throw new Error(data.error || "Ingest failed");
      }
    } catch (error) {
      console.error("Error ingesting threats:", error);
      alert(`Failed to ingest threats: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setIngesting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2">
                <span className="text-primary">Anti</span>
                <span className="text-red-600">Venom</span>
              </h1>
              <p className="text-muted-foreground">Autonomous AI Defense System</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Powered by Apify • OpenAI GPT-5 • Redpanda</p>
            </div>
            <div className="flex gap-2">
              {!seeded && (
                <Button onClick={handleSeed} size="lg" variant="outline" aria-label="Initialize System">
                  <Play className="h-6 w-6" /> Initialize System
                </Button>
              )}
              <Button
                onClick={handleIngest}
                size="lg"
                variant="default"
                disabled={ingesting}
                aria-label="Ingest Live Threats"
              >
                {ingesting ? "Ingesting..." : "Ingest Live Threats"}
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        {stats && <StatsCards stats={stats} />}

        {/* Main Interface */}
        <Tabs defaultValue="threats" className="mt-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="threats">Threat Monitor</TabsTrigger>
            <TabsTrigger value="lab">Defense Lab</TabsTrigger>
            <TabsTrigger value="stream">Live Stream</TabsTrigger>
          </TabsList>

          <TabsContent value="threats">
            <ThreatMonitor />
          </TabsContent>
          <TabsContent value="lab">
            <DefenseLab />
          </TabsContent>
          <TabsContent value="stream">
            <LiveStream />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
