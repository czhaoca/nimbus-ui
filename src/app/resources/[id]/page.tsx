"use client";

import { useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getResource, getActionLogs } from "@/lib/api/client";
import { useResourceAction } from "@/lib/hooks/useApi";
import { showToast } from "@/components/Toasts";
import type { ResourceAction, ActionLogEntry } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

/* ---------- constants ---------- */

const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  running: "default",
  stopped: "outline",
  terminated: "destructive",
  unknown: "secondary",
};

const PROTECTION_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  critical: "destructive",
  standard: "default",
  ephemeral: "secondary",
};

const ACTION_BUTTONS: {
  action: ResourceAction;
  label: string;
  variant: "default" | "secondary" | "destructive" | "outline" | "ghost";
  when?: string[];
}[] = [
  {
    action: "start",
    label: "Start",
    variant: "default",
    when: ["stopped"],
  },
  {
    action: "stop",
    label: "Stop",
    variant: "outline",
    when: ["running"],
  },
  {
    action: "health_check",
    label: "Health Check",
    variant: "secondary",
  },
  {
    action: "terminate",
    label: "Terminate",
    variant: "destructive",
    when: ["running", "stopped"],
  },
];

const LOG_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  success: "default",
  failed: "destructive",
};

/* ---------- page ---------- */

export default function ResourceDetailPage() {
  const params = useParams<{ id: string }>();
  const resourceId = params.id;

  const { data: resource, isLoading, error } = useQuery({
    queryKey: ["resource", resourceId],
    queryFn: () => getResource(resourceId),
    enabled: !!resourceId,
  });

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ["action-logs", resourceId],
    queryFn: () => getActionLogs(resourceId),
    enabled: !!resourceId,
  });

  const actionMut = useResourceAction();

  const handleAction = (action: ResourceAction) => {
    if (action === "terminate" && !confirm("Terminate this resource? This cannot be undone.")) {
      return;
    }
    actionMut.mutate(
      { id: resourceId, action },
      {
        onSuccess: (r) => showToast(`${r.action}: ${r.detail}`, "success"),
        onError: (e) => showToast((e as Error).message, "error"),
      },
    );
  };

  const tags = useMemo(
    () => (resource ? Object.entries(resource.tags ?? {}) : []),
    [resource],
  );

  /* loading / error states */
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="space-y-4">
        <Link href="/" className="text-sm text-muted-foreground hover:text-foreground">
          &larr; Back to Dashboard
        </Link>
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertDescription>
            {(error as Error)?.message ?? "Resource not found."}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  /* ---------- render ---------- */
  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/"
        className="inline-block text-sm text-muted-foreground hover:text-foreground"
      >
        &larr; Back to Dashboard
      </Link>

      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            {resource.display_name || resource.external_id}
          </h1>
          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
            <Badge variant={STATUS_BADGE_VARIANT[resource.status] ?? "secondary"}>
              {resource.status}
            </Badge>
            <span>{resource.resource_type}</span>
            <span>{resource.provider_id}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2">
          {ACTION_BUTTONS.map((btn) => {
            if (btn.when && !btn.when.includes(resource.status)) return null;
            return (
              <Button
                key={btn.action}
                variant={btn.variant}
                size="sm"
                disabled={actionMut.isPending}
                onClick={() => handleAction(btn.action)}
              >
                {btn.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Properties */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Properties</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
            {[
              { label: "Resource ID", value: resource.id },
              { label: "External ID", value: resource.external_id },
              { label: "Provider", value: resource.provider_id },
              { label: "Type", value: resource.resource_type },
              { label: "Name Prefix", value: resource.name_prefix || "\u2014" },
              { label: "Status", value: resource.status },
              {
                label: "Protection",
                value: resource.protection_level,
                badge: true,
              },
              {
                label: "Auto-Terminate",
                value: resource.auto_terminate ? "Yes" : "No",
              },
              {
                label: "Monthly Cost",
                value: `$${resource.monthly_cost_estimate.toFixed(2)}`,
              },
              {
                label: "Created",
                value: new Date(resource.created_at).toLocaleString(),
              },
              {
                label: "Updated",
                value: new Date(resource.updated_at).toLocaleString(),
              },
              {
                label: "Last Seen",
                value: resource.last_seen_at
                  ? new Date(resource.last_seen_at).toLocaleString()
                  : "\u2014",
              },
            ].map((prop) => (
              <div key={prop.label}>
                <dt className="text-muted-foreground text-xs">{prop.label}</dt>
                <dd className="mt-0.5 font-mono text-xs break-all">
                  {prop.badge ? (
                    <Badge
                      variant={
                        PROTECTION_BADGE_VARIANT[String(prop.value)] ?? "secondary"
                      }
                    >
                      {prop.value}
                    </Badge>
                  ) : (
                    prop.value
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {/* Tags */}
      {tags.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Tags</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {tags.map(([key, val]) => (
                <Badge key={key} variant="outline" className="font-normal">
                  <span className="font-medium text-foreground">{key}</span>
                  {val != null && val !== "" && <span className="text-muted-foreground">: {String(val)}</span>}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action History */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Action History</CardTitle>
        </CardHeader>
        <CardContent>
          {logsLoading ? (
            <div className="space-y-2 py-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          ) : !logs || logs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No actions recorded yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Time</TableHead>
                  <TableHead className="text-xs">Action</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Initiated By</TableHead>
                  <TableHead className="text-xs">Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log: ActionLogEntry) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.created_at
                        ? new Date(log.created_at).toLocaleString()
                        : "\u2014"}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{log.action_type}</TableCell>
                    <TableCell>
                      <Badge
                        variant={LOG_STATUS_VARIANT[log.status] ?? "secondary"}
                      >
                        {log.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {log.initiated_by}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                      {Object.keys(log.details).length > 0
                        ? JSON.stringify(log.details)
                        : "\u2014"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
