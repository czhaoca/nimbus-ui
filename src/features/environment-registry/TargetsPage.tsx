"use client";

import { useQueries } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
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

import {
  fetchRegistryPortPools,
  fetchRegistryTargets,
} from "./api";
import type { RegistryPortPool, RegistryTarget } from "./types";

export function TargetsPage() {
  const [targetsQuery, poolsQuery] = useQueries({
    queries: [
      {
        queryKey: ["registry-targets"],
        queryFn: fetchRegistryTargets,
        refetchInterval: 60_000,
      },
      {
        queryKey: ["registry-port-pools"],
        queryFn: fetchRegistryPortPools,
        refetchInterval: 60_000,
      },
    ],
  });

  const targets = targetsQuery.data ?? [];
  const pools = poolsQuery.data ?? [];
  const isLoading = targetsQuery.isLoading || poolsQuery.isLoading;
  const isError = targetsQuery.isError || poolsQuery.isError;

  const allocatable = targets.filter((t) => t.is_allocatable);
  const available = targets.filter((t) => t.available_for_slot);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <PageHeader
        title="Deployment Targets"
        description="Proxmox/OCI target inventory, port pools, and allocatable status. Targets are synced from providers via `nimbus deploy sync-targets`."
      />

      {isError && (
        <Alert variant="destructive">
          <AlertDescription>
            Failed to load target inventory. Check that the engine is running
            and that providers are registered.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Total Targets</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <div className="text-3xl font-bold">{targets.length}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Allocatable</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <div className="text-3xl font-bold">{allocatable.length}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Available For Slot</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-9 w-16" />
            ) : (
              <div className="text-3xl font-bold">{available.length}</div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Targets</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : targets.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No targets registered. Run `nimbus deploy sync-targets --provider &lt;id&gt;` to populate from a Proxmox or OCI provider.
            </p>
          ) : (
            <TargetsTable targets={targets} pools={pools} />
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Port Pools</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : pools.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No port pools configured. Use `nimbus deploy create-pool` to define an explicit range per target.
            </p>
          ) : (
            <PoolsTable pools={pools} targets={targets} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TargetsTable({
  targets,
  pools,
}: {
  targets: RegistryTarget[];
  pools: RegistryPortPool[];
}) {
  const poolCounts = pools.reduce<Record<string, number>>((acc, pool) => {
    acc[pool.target_inventory_id] = (acc[pool.target_inventory_id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Target</TableHead>
          <TableHead>Provider</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Node</TableHead>
          <TableHead>Allocatable</TableHead>
          <TableHead>Available</TableHead>
          <TableHead>Pools</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {targets.map((target) => (
          <TableRow key={target.id}>
            <TableCell className="font-mono text-xs">
              <div>{target.display_name}</div>
              <div className="text-muted-foreground">{target.id}</div>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{target.provider_type}</Badge>
              <div className="text-xs text-muted-foreground mt-1">
                {target.provider_id}
              </div>
            </TableCell>
            <TableCell>{target.target_type}</TableCell>
            <TableCell>{target.node_name || "-"}</TableCell>
            <TableCell>
              <Badge variant={target.is_allocatable ? "default" : "secondary"}>
                {target.is_allocatable ? "Yes" : "No"}
              </Badge>
            </TableCell>
            <TableCell>
              <Badge variant={target.available_for_slot ? "default" : "secondary"}>
                {target.available_for_slot ? "Yes" : "Reserved"}
              </Badge>
            </TableCell>
            <TableCell>{poolCounts[target.id] ?? 0}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function PoolsTable({
  pools,
  targets,
}: {
  pools: RegistryPortPool[];
  targets: RegistryTarget[];
}) {
  const targetMap = targets.reduce<Record<string, string>>((acc, target) => {
    acc[target.id] = target.display_name;
    return acc;
  }, {});

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Pool</TableHead>
          <TableHead>Target</TableHead>
          <TableHead>Range</TableHead>
          <TableHead>Default</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {pools.map((pool) => (
          <TableRow key={pool.id}>
            <TableCell className="font-mono text-xs">
              <div>{pool.name}</div>
              <div className="text-muted-foreground">{pool.id}</div>
            </TableCell>
            <TableCell>
              {targetMap[pool.target_inventory_id] ?? pool.target_inventory_id}
            </TableCell>
            <TableCell className="font-mono text-xs">
              {pool.port_start}–{pool.port_end}
            </TableCell>
            <TableCell>
              {pool.is_default ? <Badge>default</Badge> : null}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
