"use client";

import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
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

import { fetchCiRunners } from "./api";
import type { CiRunner } from "./types";

const ACTIVE_STATUSES = ["pending", "cloning", "running"];

const STATUS_BADGE_VARIANT: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "secondary",
  cloning: "outline",
  running: "default",
  completed: "secondary",
  failed: "destructive",
  timeout: "destructive",
};

function formatTime(iso: string | null): string {
  if (!iso) return "--";
  return new Date(iso).toLocaleString();
}

export function CiStatusPage() {
  const {
    data: runners,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["ci-runners"],
    queryFn: () => fetchCiRunners(),
    refetchInterval: 30_000,
  });

  const active =
    runners?.filter((r) => ACTIVE_STATUSES.includes(r.status)) ?? [];
  const failed =
    runners?.filter((r) => r.status === "failed" || r.status === "timeout") ??
    [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="CI Status"
        description="Read-only view of ephemeral CI runner records (admin only). Runners are spawned per GitHub workflow job and torn down on completion."
      />

      {/* Deferred surfaces (issue #6): pipeline/cron/status are ops-registry
          ops without /api/v1 REST routes; only /api/v1/ci-runners exists in
          the contract schema. Widen this page once the engine promotes them. */}
      <Alert>
        <Info className="size-4" />
        <AlertDescription>
          Pipeline and cron status are not exposed over the engine&apos;s REST
          API yet — use <code>nimbus ci status</code> /{" "}
          <code>nimbus ci pipelines</code> from the CLI. This page shows runner
          records only.
        </AlertDescription>
      </Alert>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SummaryCard
              label="Active Runners"
              value={active.length}
              isLoading={isLoading}
            />
            <SummaryCard
              label="Total Records"
              value={runners?.length ?? 0}
              isLoading={isLoading}
            />
            <SummaryCard
              label="Failed / Timed Out"
              value={failed.length}
              isLoading={isLoading}
            />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Runners</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : !runners || runners.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No runner records. Runners appear here when GitHub
                  workflow-job webhooks spawn ephemeral containers.
                </p>
              ) : (
                <RunnersTable runners={runners} />
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  isLoading,
}: {
  label: string;
  value: number;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-9 w-16" />
        ) : (
          <div className="text-3xl font-bold">{value}</div>
        )}
      </CardContent>
    </Card>
  );
}

function RunnersTable({ runners }: { runners: CiRunner[] }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Repository</TableHead>
          <TableHead>Workflow</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Container</TableHead>
          <TableHead>Run / Job</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Completed</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {runners.map((runner) => (
          <TableRow key={runner.id}>
            <TableCell className="font-mono text-xs">
              {runner.repository || "--"}
            </TableCell>
            <TableCell>{runner.workflow_name || "--"}</TableCell>
            <TableCell>
              <Badge variant={STATUS_BADGE_VARIANT[runner.status] ?? "secondary"}>
                {runner.status}
              </Badge>
            </TableCell>
            <TableCell className="font-mono text-xs">
              {runner.container_vmid || "--"}
            </TableCell>
            <TableCell className="font-mono text-xs">
              {runner.github_run_id} / {runner.github_job_id}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {formatTime(runner.created_at)}
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">
              {formatTime(runner.completed_at)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
