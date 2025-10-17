/**
 * AntiVenom Dashboard - Main Page
 * Autonomous AI Defense Platform
 */

"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-white mb-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
                AntiVenom
              </h1>
              <p className="text-slate-400">Autonomous AI Defense System</p>
              <p className="text-xs text-slate-500 mt-1">Powered by Apify • OpenAI GPT-5 • Redpanda</p>
            </div>
            {!seeded && (
              <Button onClick={handleSeed} size="lg">
                Initialize System
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        {stats && <StatsCards stats={stats} />}

        {/* Main Interface */}
        <Tabs defaultValue="threats" className="mt-6">
          <TabsList className="grid w-full grid-cols-3 bg-slate-800">
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
