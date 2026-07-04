"use client";

import { useState, useEffect, useMemo } from "react";
import { BarChart3 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { AlertCircle } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import type { Provider, Resource } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ProviderUsage {
  provider_id: string;
  display_name: string;
  provider_type: string;
  resource_count: number;
  total_cost: number;
}

export default function AnalyticsPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<Provider[]>("/api/providers"),
      apiFetch<Resource[]>("/api/resources"),
    ])
      .then(([p, r]) => {
        setProviders(p);
        setResources(r);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const usageData = useMemo((): ProviderUsage[] => {
    return providers.map((p) => {
      const provResources = resources.filter((r) => r.provider_id === p.id);
      return {
        provider_id: p.id,
        display_name: p.display_name,
        provider_type: p.provider_type,
        resource_count: provResources.length,
        total_cost: provResources.reduce(
          (sum, r) => sum + r.monthly_cost_estimate,
          0,
        ),
      };
    });
  }, [providers, resources]);

  const maxResources = Math.max(1, ...usageData.map((u) => u.resource_count));
  const maxCost = Math.max(1, ...usageData.map((u) => u.total_cost));

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl" />
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
      <PageHeader title="Usage Analytics" icon={<BarChart3 size={20} />} />

      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="py-4">
          <CardContent>
            <p className="text-xs text-muted-foreground mb-1">Total Providers</p>
            <p className="text-2xl font-bold">{providers.length}</p>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent>
            <p className="text-xs text-muted-foreground mb-1">Total Resources</p>
            <p className="text-2xl font-bold">{resources.length}</p>
          </CardContent>
        </Card>
        <Card className="py-4">
          <CardContent>
            <p className="text-xs text-muted-foreground mb-1">Est. Monthly Cost</p>
            <p className="text-2xl font-bold">
              ${resources.reduce((s, r) => s + r.monthly_cost_estimate, 0).toFixed(2)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Resource count bar chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Resources by Provider</CardTitle>
        </CardHeader>
        <CardContent>
          {usageData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <BarChart3 size={28} className="mb-2 opacity-40" />
              <p className="text-sm">No provider data available.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {usageData.map((u) => (
                <div key={u.provider_id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>
                      {u.display_name}{" "}
                      <span className="text-muted-foreground">
                        ({u.provider_type})
                      </span>
                    </span>
                    <span className="text-muted-foreground">
                      {u.resource_count}
                    </span>
                  </div>
                  <Progress
                    value={(u.resource_count / maxResources) * 100}
                    className="h-5"
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cost bar chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Estimated Cost by Provider</CardTitle>
        </CardHeader>
        <CardContent>
          {usageData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <BarChart3 size={28} className="mb-2 opacity-40" />
              <p className="text-sm">No cost data available.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {usageData.map((u) => (
                <div key={u.provider_id}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>
                      {u.display_name}{" "}
                      <span className="text-muted-foreground">
                        ({u.provider_type})
                      </span>
                    </span>
                    <span className="text-muted-foreground">
                      ${u.total_cost.toFixed(2)}
                    </span>
                  </div>
                  <Progress
                    value={(u.total_cost / maxCost) * 100}
                    className="h-5 [&>div]:bg-emerald-500"
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
