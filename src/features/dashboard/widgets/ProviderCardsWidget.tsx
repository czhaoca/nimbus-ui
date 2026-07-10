"use client";

import { useMemo } from "react";
import { CloudCog } from "lucide-react";

import { ProviderBadge } from "@/components/ProviderBadge";
import { ProviderDeleteButton } from "@/components/ProviderForm";
import { showToast } from "@/components/Toasts";
import {
  useProviders,
  useProviderStatus,
  useSyncResources,
} from "@/lib/hooks/useApi";

export function ProviderCardsWidget({ providerFilter }: { providerFilter: string }) {
  const { data: providers } = useProviders();
  const { data: statusData } = useProviderStatus();
  const syncMut = useSyncResources();

  const statusMap = useMemo(() => {
    const m: Record<string, "connected" | "degraded" | "down" | "unknown"> = {};
    statusData?.providers?.forEach((p) => { m[p.provider_id] = p.status; });
    return m;
  }, [statusData]);

  const filtered = useMemo(
    () => (providers ?? []).filter((p) => !providerFilter || p.id === providerFilter),
    [providers, providerFilter],
  );

  if (filtered.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
        <CloudCog className="size-8 mb-2 opacity-40" />
        <p className="text-sm">No providers configured.</p>
        <p className="text-xs mt-1 opacity-60">Add a cloud provider to get started.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {filtered.map((p) => (
        <div key={p.id} className="relative">
          <ProviderBadge
            provider={p}
            onSync={(id) => {
              syncMut.mutate(id, {
                onSuccess: (r) => showToast(`Synced ${r.synced} resources from ${id}`, "success"),
                onError: (e) => showToast((e as Error).message, "error"),
              });
            }}
            syncing={syncMut.isPending}
            status={statusMap[p.id]}
          />
          <div className="absolute top-2 right-10">
            <ProviderDeleteButton providerId={p.id} />
          </div>
        </div>
      ))}
    </div>
  );
}
