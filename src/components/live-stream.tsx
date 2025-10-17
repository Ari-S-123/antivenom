/**
 * Live Stream Component
 * Displays Redpanda console information and streaming configuration
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink } from "lucide-react";

/**
 * Live Stream component showing Redpanda integration details
 * Provides link to Redpanda Console for viewing real-time defense streams
 * @returns {JSX.Element} Live stream interface
 */
export function LiveStream() {
  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader>
        <CardTitle className="text-white">Redpanda Console</CardTitle>
        <CardDescription className="text-slate-400">Real-time defense rule streaming</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="aspect-video bg-slate-950 rounded-lg flex items-center justify-center border border-slate-700">
          <div className="text-center space-y-4">
            <div className="text-slate-300 space-y-2">
              <p className="font-semibold">Defense rules stream to:</p>
              <code className="text-sm bg-slate-900 px-3 py-1 rounded">defense-rules</code>
            </div>
            <Button size="lg" asChild>
              <a href="http://localhost:8080/topics/defense-rules" target="_blank" rel="noopener noreferrer">
                Open Redpanda Console
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>

        <div className="mt-4 p-4 bg-slate-950 rounded-lg border border-slate-700">
          <h4 className="text-sm font-semibold text-white mb-3">Stream Config</h4>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="text-slate-400">Topic:</dt>
            <dd className="text-slate-200 font-mono">defense-rules</dd>
            <dt className="text-slate-400">Broker:</dt>
            <dd className="text-slate-200 font-mono">localhost:19092</dd>
            <dt className="text-slate-400">Format:</dt>
            <dd className="text-slate-200">JSON</dd>
            <dt className="text-slate-400">Client:</dt>
            <dd className="text-slate-200">kafkajs</dd>
          </dl>
        </div>
      </CardContent>
    </Card>
  );
}
