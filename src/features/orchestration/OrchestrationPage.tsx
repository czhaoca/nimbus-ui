"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, Info, ListChecks } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

import { fetchSchedules, fetchTaskRuns, fetchTasks } from "./api";

const RUN_STATUS_BADGE: Record<
  string,
  "default" | "secondary" | "destructive" | "outline"
> = {
  success: "default",
  no_op: "secondary",
  skipped: "secondary",
  pending: "outline",
  rate_limited: "outline",
  error: "destructive",
};

function formatTime(iso: string | null): string {
  if (!iso) return "--";
  return new Date(iso).toLocaleString();
}

export function OrchestrationPage() {
  const [inspectedTask, setInspectedTask] = useState<string | null>(null);

  const schedulesQuery = useQuery({
    queryKey: ["orchestration-schedules"],
    queryFn: fetchSchedules,
    refetchInterval: 60_000,
  });
  const tasksQuery = useQuery({
    queryKey: ["orchestration-tasks"],
    queryFn: fetchTasks,
    refetchInterval: 60_000,
  });
  const runsQuery = useQuery({
    queryKey: ["orchestration-task-runs", inspectedTask],
    queryFn: () => fetchTaskRuns(inspectedTask as string),
    enabled: inspectedTask !== null,
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Orchestration"
        description="Read-only view of resource schedules, registered tasks, and task-run history."
      />

      {/* Read-only per issue #9 (DEC-1): schedule create/delete/toggle, task
          trigger, and the /orchestrate triggers stay off this page. */}
      <Alert>
        <Info className="size-4" />
        <AlertDescription>
          This page is read-only. Schedule changes, task triggers, and the
          orchestrate actions (dns-failover, lockdown, vm-dns) stay on the
          CLI/API — they are high-blast-radius mutations excluded from the UI
          for now.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Resource Schedules</CardTitle>
        </CardHeader>
        <CardContent>
          {schedulesQuery.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : schedulesQuery.error ? (
            <Alert variant="destructive">
              <AlertDescription>
                {(schedulesQuery.error as Error).message}
              </AlertDescription>
            </Alert>
          ) : !schedulesQuery.data || schedulesQuery.data.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <CalendarClock size={32} className="mb-2 opacity-40" />
              <p className="text-sm">
                No resource schedules configured. Create them via the CLI or
                the resource detail API.
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Resource</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Cron</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Last run</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedulesQuery.data.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">
                      {s.resource_id}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{s.action}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{s.cron}</TableCell>
                    <TableCell>
                      <Badge variant={s.enabled ? "default" : "secondary"}>
                        {s.enabled ? "Enabled" : "Disabled"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatTime(s.last_run)}
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
          <CardTitle>Registered Tasks</CardTitle>
        </CardHeader>
        <CardContent>
          {tasksQuery.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : tasksQuery.error ? (
            <Alert variant="destructive">
              <AlertDescription>
                {(tasksQuery.error as Error).message}
              </AlertDescription>
            </Alert>
          ) : !tasksQuery.data || tasksQuery.data.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <ListChecks size={32} className="mb-2 opacity-40" />
              <p className="text-sm">No registered tasks.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Task</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Last run</TableHead>
                  <TableHead>Last status</TableHead>
                  <TableHead>Health</TableHead>
                  <TableHead>Total runs</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasksQuery.data.map((t) => (
                  <TableRow key={t.name}>
                    <TableCell>
                      <span className="font-mono text-xs">{t.name}</span>
                      <p className="text-xs text-muted-foreground">
                        {t.description}
                      </p>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {t.schedule ?? (
                        <span className="text-muted-foreground">on-demand</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatTime(t.last_run_at)}
                    </TableCell>
                    <TableCell>
                      {t.last_status ? (
                        <Badge
                          variant={RUN_STATUS_BADGE[t.last_status] ?? "secondary"}
                        >
                          {t.last_status}
                        </Badge>
                      ) : (
                        "--"
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={t.healthy ? "default" : "destructive"}>
                        {t.healthy ? "healthy" : "unhealthy"}
                      </Badge>
                    </TableCell>
                    <TableCell>{t.total_runs}</TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setInspectedTask((prev) =>
                            prev === t.name ? null : t.name,
                          )
                        }
                      >
                        {inspectedTask === t.name ? "Hide runs" : "Runs"}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {inspectedTask && (
        <Card>
          <CardHeader>
            <CardTitle>
              Run History — <span className="font-mono">{inspectedTask}</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {runsQuery.isLoading ? (
              <Skeleton className="h-24 w-full" />
            ) : runsQuery.error ? (
              <Alert variant="destructive">
                <AlertDescription>
                  {(runsQuery.error as Error).message}
                </AlertDescription>
              </Alert>
            ) : !runsQuery.data || runsQuery.data.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No recorded runs for this task yet.
              </p>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Started</TableHead>
                      <TableHead>Finished</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Invoked by</TableHead>
                      <TableHead>Message</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {runsQuery.data.map((run) => (
                      <TableRow key={run.id}>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatTime(run.started_at)}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {formatTime(run.finished_at)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={RUN_STATUS_BADGE[run.status] ?? "secondary"}
                          >
                            {run.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {run.invoked_by}
                          {run.actor && run.actor !== run.invoked_by && (
                            <span className="text-muted-foreground">
                              {" "}
                              ({run.actor})
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs">
                          {run.error_message ? (
                            <span className="text-destructive">
                              {run.error_message}
                            </span>
                          ) : (
                            run.message || "--"
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="text-xs text-muted-foreground mt-2">
                  Most recent 20 runs.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
