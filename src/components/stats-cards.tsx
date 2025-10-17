/**
 * Stats Cards Component
 * Displays real-time system statistics in card format
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Shield, Target, Zap, Activity } from "lucide-react";
import type { Stats } from "@/lib/types";

/**
 * Props for StatsCards component
 */
type StatsCardsProps = {
  /** System statistics to display */
  stats: Stats;
};

/**
 * Displays four cards showing system statistics
 * @param {StatsCardsProps} props - Component props
 * @returns {JSX.Element} Stats cards grid
 */
export function StatsCards({ stats }: StatsCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {/* Threats Discovered */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-slate-300">Threats Discovered</CardTitle>
          <Target className="h-4 w-4 text-slate-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-white">{stats.total_threats}</div>
          <p className="text-xs text-slate-400">{stats.tested_threats} tested</p>
        </CardContent>
      </Card>

      {/* Effective Attacks */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-slate-300">Effective Attacks</CardTitle>
          <Zap className="h-4 w-4 text-amber-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-amber-400">{stats.effective_threats}</div>
          <p className="text-xs text-slate-400">
            {stats.total_threats > 0
              ? `${Math.round((stats.effective_threats / stats.total_threats) * 100)}% rate`
              : "No data"}
          </p>
        </CardContent>
      </Card>

      {/* Defenses Active */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-slate-300">Defenses Active</CardTitle>
          <Shield className="h-4 w-4 text-green-400" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-400">{stats.defenses_generated}</div>
          <p className="text-xs text-slate-400">Auto-deployed</p>
        </CardContent>
      </Card>

      {/* Stream Status */}
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-slate-300">Stream Status</CardTitle>
          <Activity className="h-4 w-4 text-blue-400" />
        </CardHeader>
        <CardContent>
          <Badge className={stats.streaming_active ? "bg-green-500" : "bg-slate-500"}>
            {stats.streaming_active ? "LIVE" : "OFFLINE"}
          </Badge>
          <p className="text-xs text-slate-400 mt-1">Redpanda</p>
        </CardContent>
      </Card>
    </div>
  );
}
