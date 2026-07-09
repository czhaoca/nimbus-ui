"use client";

import { useQuery } from "@tanstack/react-query";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { fetchSonarqubeStatus } from "./api";
import type { SonarServiceState } from "./types";

const BADGE_VARIANTS: Record<
  SonarServiceState,
  "default" | "secondary" | "outline" | "destructive"
> = {
  up: "default",
  starting: "secondary",
  stopped: "outline",
  crashed: "destructive",
};

export function SonarServiceCard() {
  const statusQuery = useQuery({
    queryKey: ["sonarqube-status"],
    queryFn: fetchSonarqubeStatus,
    refetchInterval: 30_000,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>SonarQube service</span>
          {statusQuery.isSuccess && (
            <Badge variant={BADGE_VARIANTS[statusQuery.data.state] ?? "outline"}>
              {statusQuery.data.state}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-muted-foreground text-xs">
          Slot: prod / primary (server defaults) — status-only view; start/stop
          run via the engine CLI or chat (lease-gated, ADR-0009).
        </p>

        {statusQuery.isPending ? (
          <p className="text-muted-foreground text-sm">Checking SonarQube…</p>
        ) : statusQuery.isError ? (
          <Alert variant="destructive">
            <AlertDescription>
              {statusQuery.error instanceof Error
                ? statusQuery.error.message
                : "Failed to load SonarQube status"}
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <p className="text-sm">
              {statusQuery.data.holders} live lease holder
              {statusQuery.data.holders === 1 ? "" : "s"}
            </p>
            {statusQuery.data.state === "crashed" && (
              <div className="rounded-md border border-destructive/40 p-3">
                <p className="text-destructive text-xs font-medium">
                  Container exited while the probe is down — best-effort exit
                  detail:
                </p>
                <dl className="mt-2 space-y-1">
                  {Object.entries(statusQuery.data.detail ?? {}).length === 0 ? (
                    <dd className="text-muted-foreground text-xs italic">
                      No exit detail reported.
                    </dd>
                  ) : (
                    Object.entries(statusQuery.data.detail ?? {}).map(
                      ([key, value]) => (
                        <div key={key} className="flex gap-2 text-xs">
                          <dt className="text-muted-foreground font-mono">
                            {key}
                          </dt>
                          <dd className="font-mono">{String(value)}</dd>
                        </div>
                      ),
                    )
                  )}
                </dl>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
