"use client";

import { useQuery } from "@tanstack/react-query";
import { Cloud, Info } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useProviders } from "@/lib/hooks/useApi";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Provider } from "@/lib/types";

import { fetchAccessApps, fetchTunnels, fetchWarpStatus } from "./api";

const TUNNEL_BADGE: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  healthy: "default",
  degraded: "outline",
  inactive: "secondary",
  down: "destructive",
};

// Tier-1 reads that exist engine-side but are not rendered in this ticket
// (issue #10 constraint: name them instead of omitting silently).
const DEFERRED_OPS = [
  "cloudflare.device.list",
  "cloudflare.device.posture.list",
  "cloudflare.zerotrust.access-policies.list",
  "cloudflare.zerotrust.gateway-rules.list",
  "cloudflare.zerotrust.diff",
  "cloudflare.site.status",
  "cloudflare.network.routes.list",
  "network.tunnel.status",
];

export function EdgePage() {
  const providersQuery = useProviders();
  const cfProviders = (providersQuery.data ?? []).filter(
    (p) => p.provider_type === "cloudflare" && p.is_active,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Edge"
        description="Read-only Cloudflare tunnel, Zero Trust access-app, and WARP mesh status."
      />

      <Alert>
        <Info className="size-4" />
        <AlertDescription>
          Strictly read-only — tunnel, DNS, and access-app mutations stay on
          the CLI/MCP ops surface. Further engine-side reads not rendered here
          yet:{" "}
          {DEFERRED_OPS.map((op, i) => (
            <span key={op}>
              {i > 0 && ", "}
              <code>{op}</code>
            </span>
          ))}
          .
        </AlertDescription>
      </Alert>

      {providersQuery.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : providersQuery.error ? (
        <Alert variant="destructive">
          <AlertDescription>
            {(providersQuery.error as Error).message}
          </AlertDescription>
        </Alert>
      ) : cfProviders.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-muted-foreground">
          <Cloud size={32} className="mb-2 opacity-40" />
          <p className="text-sm">
            No active Cloudflare provider registered — the edge surfaces need
            one.
          </p>
        </div>
      ) : (
        cfProviders.map((provider) => (
          <EdgeProviderSection
            key={provider.id}
            provider={provider}
            showHeading={cfProviders.length > 1}
          />
        ))
      )}
    </div>
  );
}

function EdgeProviderSection({
  provider,
  showHeading,
}: {
  provider: Provider;
  showHeading: boolean;
}) {
  const tunnelsQuery = useQuery({
    queryKey: ["edge-tunnels", provider.id],
    queryFn: () => fetchTunnels(provider.id),
    refetchInterval: 60_000,
  });
  const appsQuery = useQuery({
    queryKey: ["edge-access-apps", provider.id],
    queryFn: () => fetchAccessApps(provider.id),
    refetchInterval: 60_000,
  });
  const warpQuery = useQuery({
    queryKey: ["edge-warp", provider.id],
    queryFn: () => fetchWarpStatus(provider.id),
    refetchInterval: 60_000,
  });

  return (
    <div className="space-y-6">
      {showHeading && (
        <h2 className="text-lg font-semibold">{provider.display_name}</h2>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Tunnels</CardTitle>
        </CardHeader>
        <CardContent>
          {tunnelsQuery.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : tunnelsQuery.error ? (
            <Alert variant="destructive">
              <AlertDescription>
                {(tunnelsQuery.error as Error).message}
              </AlertDescription>
            </Alert>
          ) : !tunnelsQuery.data || tunnelsQuery.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No tunnels on this account.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tunnel</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Connections</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tunnelsQuery.data.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      {t.name}
                      <p className="text-xs text-muted-foreground font-mono">
                        {t.id}
                      </p>
                    </TableCell>
                    <TableCell>
                      <Badge variant={TUNNEL_BADGE[t.status] ?? "secondary"}>
                        {t.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{t.connections}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Access Apps</CardTitle>
        </CardHeader>
        <CardContent>
          {appsQuery.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : appsQuery.error ? (
            <Alert variant="destructive">
              <AlertDescription>
                {(appsQuery.error as Error).message}
              </AlertDescription>
            </Alert>
          ) : !appsQuery.data || appsQuery.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No Zero Trust access applications.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>App</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Session</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {appsQuery.data.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.name}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {a.domain}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{a.type}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {a.session_duration || "--"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>WARP Mesh</CardTitle>
        </CardHeader>
        <CardContent>
          {warpQuery.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : warpQuery.error ? (
            <Alert variant="destructive">
              <AlertDescription>
                {(warpQuery.error as Error).message}
              </AlertDescription>
            </Alert>
          ) : warpQuery.data ? (
            warpQuery.data.converged ? (
              <div className="flex items-center gap-2">
                <Badge>Converged</Badge>
                <p className="text-sm text-muted-foreground">
                  Live Cloudflare teamnet matches the registry&apos;s desired
                  WARP exposure.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Badge variant="destructive">Drift detected</Badge>
                <ul className="text-sm text-muted-foreground list-disc pl-5 space-y-1">
                  {warpQuery.data.to_create.length > 0 && (
                    <li>
                      {warpQuery.data.to_create.length} route
                      {warpQuery.data.to_create.length === 1 ? "" : "s"} to
                      create
                    </li>
                  )}
                  {warpQuery.data.to_delete.length > 0 && (
                    <li>
                      {warpQuery.data.to_delete.length} route
                      {warpQuery.data.to_delete.length === 1 ? "" : "s"} to
                      delete
                    </li>
                  )}
                  {warpQuery.data.split_tunnel_changed && (
                    <li>split-tunnel change pending</li>
                  )}
                </ul>
                <p className="text-xs text-muted-foreground">
                  Reconcile via <code>warp.reconcile</code> (CLI/MCP,
                  two-phase) — not exposed here.
                </p>
              </div>
            )
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
