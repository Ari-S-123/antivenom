/**
 * Threat Monitor Component
 * Displays discovered threats with their status and source information
 */

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchThreats } from "@/lib/api/client";
import type { Threat } from "@/lib/types";
import { ExternalLink, Github, Chrome, FileWarning } from "lucide-react";

/**
 * Returns the appropriate icon for a threat source type
 * @param {string} type - Source type (github, reddit, cve)
 * @returns {JSX.Element} Icon component
 */
function SourceIcon({ type }: { type: string }) {
  if (type === "github") return <Github className="h-4 w-4" />;
  if (type === "reddit") return <Chrome className="h-4 w-4" />;
  return <FileWarning className="h-4 w-4" />;
}

/**
 * Threat Monitor component that displays all discovered threats
 * Auto-refreshes every 10 seconds
 * @returns {JSX.Element} Threat monitor interface
 */
export function ThreatMonitor() {
  const [threats, setThreats] = useState<Threat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, []);

  /**
   * Load threats from API
   */
  async function load() {
    try {
      const data = await fetchThreats();
      setThreats(data.threats);
    } catch (error) {
      console.error("Error loading threats:", error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Discovered Threats</CardTitle>
        <CardDescription className="text-slate-400">Attack patterns from security research (Apify)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="text-center text-slate-400 py-8">Loading threats...</div>
        ) : threats.length === 0 ? (
          <div className="text-center text-slate-400 py-8">
            No threats discovered yet. Click &quot;Initialize System&quot; to seed data.
          </div>
        ) : (
          threats.map((threat) => (
            <Card key={threat.id} className="bg-slate-900 border-slate-700">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-white truncate">{threat.title}</h3>
                      <SourceIcon type={threat.source_type} />
                    </div>

                    <div className="bg-slate-950 p-3 rounded-md mb-3 overflow-x-auto">
                      <code className="text-sm text-amber-300 font-mono whitespace-pre-wrap break-words">
                        {threat.attack_pattern}
                      </code>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="text-slate-300 border-slate-600">
                        {threat.source_type}
                      </Badge>
                      {threat.tested && (
                        <Badge variant={threat.effective ? "destructive" : "secondary"}>
                          {threat.effective ? "Effective" : "Ineffective"}
                        </Badge>
                      )}
                      {!threat.tested && <Badge className="bg-yellow-600">Untested</Badge>}
                    </div>
                  </div>

                  <Button variant="ghost" size="sm" asChild>
                    <a href={threat.source_url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </CardContent>
    </Card>
  );
}
