"use client";

import { useProviders } from "@/lib/hooks/useApi";
import type { Provider } from "@/lib/types";
import { useState, useEffect } from "react";
import { checkProviderHealth, type ProviderHealthResult } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

/* ---------- Status helpers ---------- */

const STATUS_DOT: Record<string, string> = {
  connected: "bg-emerald-400",
  ok: "bg-emerald-400",
  degraded: "bg-amber-400",
  down: "bg-red-400",
  unknown: "bg-gray-400",
};

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  connected: "default",
  ok: "default",
  degraded: "secondary",
  down: "destructive",
  unknown: "outline",
};

const STATUS_LABEL: Record<string, string> = {
  connected: "Connected",
  ok: "OK",
  degraded: "Degraded",
  down: "Down",
  unknown: "Unknown",
};

/* ---------- ProviderHealthCard sub-component ---------- */

function ProviderHealthCard({
  provider,
  health,
}: {
  provider: Provider;
  health: ProviderHealthResult | undefined;
}) {
  const status = health?.status ?? "unknown";

  return (
    <Card className="py-4">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm">{provider.display_name}</CardTitle>
            <CardDescription>
              {provider.provider_type} &middot; {provider.region || "\u2014"}
            </CardDescription>
          </div>
          <Badge variant={STATUS_BADGE_VARIANT[status] ?? "outline"} className="gap-1.5">
            <span className={`inline-block w-2 h-2 rounded-full ${STATUS_DOT[status]}`} />
            {STATUS_LABEL[status] ?? status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Latency — per-probe breakdown is not exposed by /api/v1
            (providers/health/check returns one probe per provider). */}
        {health && (
          <div>
            {health.latency_ms !== null && (
              <p className="text-sm text-muted-foreground">
                Latency:{" "}
                <span
                  className={
                    health.latency_ms < 200
                      ? "text-emerald-400"
                      : health.latency_ms < 1000
                        ? "text-amber-400"
                        : "text-red-400"
                  }
                >
                  {health.latency_ms}ms
                </span>
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Last check: {new Date(health.checked_at).toLocaleString()}
            </p>
            {health.error && (
              <p className="text-xs text-red-400 mt-1">{health.error}</p>
            )}
          </div>
        )}

        {/* No health data */}
        {!health && (
          <p className="text-muted-foreground text-sm">No health data available.</p>
        )}
      </CardContent>
    </Card>
  );
}

/* ---------- Main Page ---------- */

export default function HealthPage() {
  const { data: providers, isLoading: providersLoading, error: providersError } = useProviders();
  const [healthMap, setHealthMap] = useState<Record<string, ProviderHealthResult>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!providers || providers.length === 0) return;

    let cancelled = false;
    setLoading(true);
    setError(null);

    checkProviderHealth()
      .then((data) => {
        if (cancelled) return;
        const map: Record<string, ProviderHealthResult> = {};
        for (const h of data) {
          map[h.provider_id] = h;
        }
        setHealthMap(map);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load health data");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [providers]);

  if (providersLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (providersError) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {providersError instanceof Error ? providersError.message : "Failed to load providers"}
        </AlertDescription>
      </Alert>
    );
  }

  const activeProviders = (providers ?? []).filter((p) => p.is_active);

  return (
    <div>
      <PageHeader title="Provider Health" />

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      {loading && (
        <p className="text-muted-foreground text-sm mb-4">Loading health data...</p>
      )}

      {activeProviders.length === 0 ? (
        <p className="text-muted-foreground text-sm">No active providers configured.</p>
      ) : (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {activeProviders.map((provider) => (
            <ProviderHealthCard
              key={provider.id}
              provider={provider}
              health={healthMap[provider.id]}
            />
          ))}
        </div>
      )}
    </div>
  );
}
