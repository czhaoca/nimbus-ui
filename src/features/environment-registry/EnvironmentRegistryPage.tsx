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
  fetchRegistrySlots,
  fetchRegistryTargets,
} from "./api";
import { DashboardCards } from "./DashboardCards";
import { ProjectsTable } from "./ProjectsTable";
import { CidrTable } from "./CidrTable";

export function EnvironmentRegistryPage() {
  const [slotsQuery, targetsQuery, poolsQuery] = useQueries({
    queries: [
      { queryKey: ["registry-slots"], queryFn: fetchRegistrySlots, refetchInterval: 30_000 },
      { queryKey: ["registry-targets"], queryFn: fetchRegistryTargets, refetchInterval: 30_000 },
      { queryKey: ["registry-port-pools"], queryFn: fetchRegistryPortPools, refetchInterval: 60_000 },
    ],
  });

  const isLoading = slotsQuery.isLoading || targetsQuery.isLoading || poolsQuery.isLoading;
  const error = slotsQuery.error || targetsQuery.error || poolsQuery.error;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error instanceof Error ? error.message : "Failed to load environment registry"}
        </AlertDescription>
      </Alert>
    );
  }

  const slots = slotsQuery.data ?? [];
  const targets = targetsQuery.data ?? [];
  const pools = poolsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Environments"
        description="Infrastructure registry — projects, slots, targets, ports, and CIDR allocations."
      />

      <DashboardCards />

      <Card>
        <CardHeader>
          <CardTitle>Slot Access Table</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Project</TableHead>
                <TableHead>Env</TableHead>
                <TableHead>Slot</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Target</TableHead>
                <TableHead>IP / Host</TableHead>
                <TableHead>Endpoints</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slots.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground">
                    No environment slots registered.
                  </TableCell>
                </TableRow>
              ) : (
                slots.map((slot) => (
                  <TableRow key={slot.id}>
                    <TableCell className="font-medium">{slot.project_name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{slot.env_type}</Badge>
                    </TableCell>
                    <TableCell>{slot.slot_key}</TableCell>
                    <TableCell>
                      <Badge variant={slot.status === "reserved" ? "default" : "secondary"}>
                        {slot.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{slot.target_display || "-"}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {slot.public_address || slot.network_address || "-"}
                    </TableCell>
                    <TableCell className="space-y-1">
                      {slot.endpoints.length === 0 ? (
                        <span className="text-muted-foreground">-</span>
                      ) : (
                        slot.endpoints.map((endpoint) => (
                          <div key={endpoint.id} className="text-xs">
                            <a
                              href={endpoint.access_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline"
                            >
                              {endpoint.service_name}:{endpoint.host_port}
                            </a>
                          </div>
                        ))
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-6 grid-cols-1 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Targets</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Target</TableHead>
                  <TableHead>Provider</TableHead>
                  <TableHead>Node</TableHead>
                  <TableHead>IP</TableHead>
                  <TableHead>Allocatable</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {targets.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground">
                      No targets synced.
                    </TableCell>
                  </TableRow>
                ) : (
                  targets.map((target) => (
                    <TableRow key={target.id}>
                      <TableCell>{target.display_name}</TableCell>
                      <TableCell>{target.provider_id}</TableCell>
                      <TableCell>{target.node_name || "-"}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {target.network_address || target.public_address || "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={target.is_allocatable ? "default" : "secondary"}>
                          {target.is_allocatable ? "yes" : "no"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Port Pools</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Target ID</TableHead>
                  <TableHead>Range</TableHead>
                  <TableHead>Default</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pools.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground">
                      No port pools configured.
                    </TableCell>
                  </TableRow>
                ) : (
                  pools.map((pool) => (
                    <TableRow key={pool.id}>
                      <TableCell>{pool.name}</TableCell>
                      <TableCell className="font-mono text-xs">{pool.target_inventory_id}</TableCell>
                      <TableCell>{pool.port_start}-{pool.port_end}</TableCell>
                      <TableCell>
                        <Badge variant={pool.is_default ? "default" : "secondary"}>
                          {pool.is_default ? "default" : "custom"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <ProjectsTable />

      <CidrTable />
    </div>
  );
}
