"use client";

import { useState, useEffect } from "react";
import { Layers } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useProviders } from "@/lib/hooks/useApi";
import { getProviderQuota } from "@/lib/api/client";
import type { Provider } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Derived from /api/v1/providers/{id}/quota (resource count + budget
// utilization). Per-resource-type quota limits are not exposed by the
// /api/v1 contract; only budget-backed quotas render as cards.
interface Quota {
  provider_id: string;
  resource_type: string;
  limit: number;
  used: number;
  unit: string;
}

export default function QuotasPage() {
  const { data: providers, isLoading: providersLoading } = useProviders();
  const [quotas, setQuotas] = useState<Quota[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<string>("all");

  useEffect(() => {
    if (!providers) return;
    // The contract exposes quota per provider; fan out one call per
    // provider and keep the budget-backed entries.
    Promise.all(
      providers.map((p: Provider) =>
        getProviderQuota(p.id).catch(() => null),
      ),
    )
      .then((results) => {
        const entries: Quota[] = [];
        for (const q of results) {
          if (!q) continue;
          if (q.budget.monthly_limit !== null) {
            entries.push({
              provider_id: q.provider_id,
              resource_type: "Monthly budget",
              limit: q.budget.monthly_limit,
              used: q.budget.current_spend,
              unit: "USD",
            });
          }
        }
        setQuotas(entries);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [providers]);

  const providerName = (id: string) => {
    const p = providers?.find((pr: Provider) => pr.id === id);
    return p?.display_name ?? id;
  };

  const filteredQuotas =
    selectedProvider === "all"
      ? quotas
      : quotas.filter((q) => q.provider_id === selectedProvider);

  const getBadgeVariant = (used: number, limit: number): "destructive" | "secondary" | "default" => {
    const pct = limit > 0 ? (used / limit) * 100 : 0;
    if (pct >= 90) return "destructive";
    if (pct >= 70) return "secondary";
    return "default";
  };

  const getTextColor = (used: number, limit: number) => {
    const pct = limit > 0 ? (used / limit) * 100 : 0;
    if (pct >= 90) return "text-red-400";
    if (pct >= 70) return "text-amber-400";
    return "text-emerald-400";
  };

  const getProgressColor = (used: number, limit: number) => {
    const pct = limit > 0 ? (used / limit) * 100 : 0;
    if (pct >= 90) return "[&>[data-slot=progress-indicator]]:bg-red-400";
    if (pct >= 70) return "[&>[data-slot=progress-indicator]]:bg-amber-400";
    return "[&>[data-slot=progress-indicator]]:bg-emerald-400";
  };

  const isLoading = providersLoading || loading;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-48" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Provider Quotas"
        icon={<Layers size={20} />}
        action={
          <Select value={selectedProvider} onValueChange={setSelectedProvider}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Providers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Providers</SelectItem>
              {providers?.map((p: Provider) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.display_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      {/* Quota cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {filteredQuotas.map((q, i) => {
          const pct = q.limit > 0 ? (q.used / q.limit) * 100 : 0;
          const textColor = getTextColor(q.used, q.limit);
          const progressColor = getProgressColor(q.used, q.limit);

          return (
            <Card
              key={`${q.provider_id}-${q.resource_type}-${i}`}
              className="py-4"
            >
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm truncate">
                    {q.resource_type}
                  </CardTitle>
                  <Badge variant={getBadgeVariant(q.used, q.limit)}>
                    <span className={textColor}>{pct.toFixed(0)}%</span>
                  </Badge>
                </div>
                <CardDescription>
                  {providerName(q.provider_id)}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-2">
                {/* Progress bar */}
                <Progress
                  value={Math.min(pct, 100)}
                  className={`h-2 ${progressColor}`}
                />

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>
                    {q.used} / {q.limit} {q.unit}
                  </span>
                  <span>{q.limit - q.used} remaining</span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredQuotas.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <Layers size={32} className="mb-2 opacity-40" />
          <p className="text-sm">No quota data available{selectedProvider !== "all" && " for this provider"}.</p>
          <p className="text-xs mt-1">
            Quota cards derive from provider budget rules; per-resource-type
            limits are not exposed by the /api/v1 contract.
          </p>
        </div>
      )}
    </div>
  );
}
