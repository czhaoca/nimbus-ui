"use client";

import { useState } from "react";
import Link from "next/link";
import { RefreshCw, Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useProviders } from "@/lib/hooks/useApi";
import { apiFetch } from "@/lib/api/client";
import type { Provider } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  connected: "default",
  degraded: "outline",
  down: "destructive",
  unknown: "secondary",
};

interface HealthResult {
  provider_id: string;
  status: string;
  message?: string;
}

export default function ProviderHealthPage() {
  const { data: providers, isLoading, error } = useProviders();
  const [healthMap, setHealthMap] = useState<Record<string, HealthResult>>({});
  const [checking, setChecking] = useState<Set<string>>(new Set());

  const checkHealth = async (provider: Provider) => {
    setChecking((prev) => new Set(prev).add(provider.id));
    try {
      const result = await apiFetch<HealthResult>(
        `/api/providers/${provider.id}/health`,
      );
      setHealthMap((prev) => ({ ...prev, [provider.id]: result }));
    } catch (e) {
      setHealthMap((prev) => ({
        ...prev,
        [provider.id]: {
          provider_id: provider.id,
          status: "down",
          message: (e as Error).message,
        },
      }));
    } finally {
      setChecking((prev) => {
        const next = new Set(prev);
        next.delete(provider.id);
        return next;
      });
    }
  };

  const checkAll = () => {
    providers?.forEach((p) => {
      if (p.is_active) checkHealth(p);
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertDescription>{(error as Error).message}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Provider Health"
        action={
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={checkAll}>
              <RefreshCw size={14} />
              Check All
            </Button>
            <Button size="sm" asChild>
              <Link href="/providers/wizard">
                <Plus size={14} />
                Add Provider
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {providers?.map((provider) => {
          const health = healthMap[provider.id];
          const status = health?.status ?? "unknown";
          const isChecking = checking.has(provider.id);

          return (
            <Card key={provider.id} className="py-4">
              <CardContent className="pt-0 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold truncate">
                    {provider.display_name}
                  </h3>
                  <Badge variant={STATUS_BADGE_VARIANT[status] ?? "secondary"}>
                    {status}
                  </Badge>
                </div>

                <div className="text-xs text-muted-foreground space-y-1">
                  <p>
                    {provider.provider_type} &middot; {provider.region || "--"}
                  </p>
                  <p className="font-mono truncate">{provider.id}</p>
                  {!provider.is_active && (
                    <Badge variant="outline" className="text-amber-400 border-amber-400/30">
                      Inactive
                    </Badge>
                  )}
                  {health?.message && (
                    <p className={status === "down" ? "text-destructive" : ""}>
                      {health.message}
                    </p>
                  )}
                </div>

                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => checkHealth(provider)}
                  disabled={isChecking || !provider.is_active}
                >
                  <RefreshCw
                    size={12}
                    className={isChecking ? "animate-spin" : ""}
                  />
                  {isChecking ? "Checking..." : "Check Health"}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {(!providers || providers.length === 0) && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <RefreshCw size={32} className="mb-2 opacity-40" />
          <p className="text-sm">No providers configured.{" "}
            <Link href="/providers/wizard" className="text-primary hover:underline">
              Add one
            </Link>.
          </p>
        </div>
      )}
    </div>
  );
}
