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
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Threats Discovered</CardTitle>
          <Target className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-foreground">{stats.total_threats}</div>
          <p className="text-xs text-muted-foreground">{stats.tested_threats} tested</p>
        </CardContent>
      </Card>

      {/* Effective Attacks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Effective Attacks</CardTitle>
          <Zap className="h-4 w-4 text-destructive" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-destructive">{stats.effective_threats}</div>
          <p className="text-xs text-muted-foreground">
            {stats.total_threats > 0
              ? `${Math.round((stats.effective_threats / stats.total_threats) * 100)}% rate`
              : "No data"}
          </p>
        </CardContent>
      </Card>

      {/* Defenses Active */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Defenses Active</CardTitle>
          <Shield className="h-4 w-4 text-primary" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-primary">{stats.defenses_generated}</div>
          <p className="text-xs text-muted-foreground">Auto-deployed</p>
        </CardContent>
      </Card>

      {/* Stream Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium">Stream Status</CardTitle>
          <Activity className="h-4 w-4 text-accent-foreground" />
        </CardHeader>
        <CardContent>
          <Badge variant={stats.streaming_active ? "default" : "secondary"}>
            {stats.streaming_active ? "LIVE" : "OFFLINE"}
          </Badge>
          <p className="text-xs text-muted-foreground mt-1">Redpanda</p>
        </CardContent>
      </Card>
    </div>
  );
}
