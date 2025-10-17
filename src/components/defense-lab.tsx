/**
 * Defense Lab Component
 * Interactive interface for testing attacks and generating defenses with GPT-5
 */

"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { fetchThreats, testAttack } from "@/lib/api/client";
import type { Threat, TestAttackResponse } from "@/lib/types";
import { Play, Loader2, CheckCircle, XCircle, Shield } from "lucide-react";

/**
 * Defense Lab component for testing attacks and generating defenses
 * Two-column layout: threat selector and test panel
 * @returns {JSX.Element} Defense lab interface
 */
export function DefenseLab() {
  const [threats, setThreats] = useState<Threat[]>([]);
  const [selected, setSelected] = useState<Threat | null>(null);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestAttackResponse | null>(null);

  useEffect(() => {
    load();
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
    }
  }

  /**
   * Test the selected attack and generate defense
   */
  async function handleTest() {
    if (!selected) return;

    setTesting(true);
    setResult(null);

    try {
      const res = await testAttack(selected.id, selected.attack_pattern);
      setResult(res);
      // Reload threats to update tested status
      await load();
    } catch (error) {
      console.error("Error testing attack:", error);
      alert("Failed to test attack. Check console for details.");
    } finally {
      setTesting(false);
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: Select Threat */}
      <Card>
        <CardHeader>
          <CardTitle>Select Threat</CardTitle>
          <CardDescription>Choose an attack to validate</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
          {threats.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No threats available. Initialize system first.</div>
          ) : (
            threats.map((t) => (
              <Button
                key={t.id}
                variant={selected?.id === t.id ? "default" : "outline"}
                className="w-full justify-start h-auto py-3 text-left"
                onClick={() => setSelected(t)}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{t.title}</div>
                  <div className="text-xs opacity-70 mt-1 truncate">{t.attack_pattern.substring(0, 60)}...</div>
                </div>
                {t.tested &&
                  (t.effective ? (
                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 ml-2" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
                  ))}
              </Button>
            ))
          )}
        </CardContent>
      </Card>

      {/* Right: Test & Results */}
      <Card>
        <CardHeader>
          <CardTitle>Test & Generate</CardTitle>
          <CardDescription>GPT-5 validates and creates defenses</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {selected ? (
            <>
              <div className="bg-muted p-4 rounded-md border">
                <div className="text-sm font-semibold text-foreground mb-2">Attack Pattern:</div>
                <code className="text-sm text-destructive font-mono block whitespace-pre-wrap">
                  {selected.attack_pattern}
                </code>
              </div>

              <Button onClick={handleTest} disabled={testing} className="w-full" size="lg">
                {testing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing with GPT-5...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Test Attack & Generate Defense
                  </>
                )}
              </Button>

              {result && (
                <div className="space-y-4 animate-in fade-in duration-500">
                  {/* Validation Result */}
                  <Alert variant={result.validation.is_effective ? "destructive" : "default"}>
                    <AlertDescription>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-foreground">Validation</span>
                        <Badge variant={result.validation.is_effective ? "destructive" : "secondary"}>
                          {result.validation.is_effective ? "Effective" : "Ineffective"}
                        </Badge>
                      </div>
                      <p className="text-sm mb-2">{result.validation.explanation}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline">{result.validation.attack_type}</Badge>
                        <span className="text-xs text-muted-foreground">
                          {(result.validation.confidence * 100).toFixed(0)}% confidence
                        </span>
                      </div>
                    </AlertDescription>
                  </Alert>

                  {/* Defense Rule */}
                  {result.defense && (
                    <Alert className="border-primary bg-primary/10">
                      <AlertDescription>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-semibold text-foreground flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Defense Generated
                          </span>
                          <Badge variant="default">Deployed</Badge>
                        </div>
                        <div className="bg-background p-3 rounded-md mt-2 overflow-x-auto border">
                          <code className="text-xs text-primary font-mono whitespace-pre block">
                            {result.defense.defense_code}
                          </code>
                        </div>
                        <div className="mt-2 text-xs text-muted-foreground">
                          ID: {result.defense.rule_id} • Confidence: {(result.defense.confidence * 100).toFixed(0)}% •
                          Streamed to Redpanda
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-muted-foreground py-12">Select a threat to begin</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
