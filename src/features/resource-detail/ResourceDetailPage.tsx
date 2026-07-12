"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProviderIcon, getProviderMeta } from "@/components/ProviderIcon";
import { StatusBadge } from "@/components/StatusBadge";
import { showToast } from "@/components/Toasts";
import { useProviders, useResourceAction } from "@/lib/hooks/useApi";
import { useMe } from "@/lib/hooks/useMe";
import { getActionLogs, getResource } from "./api";
import type { ResourceAction } from "./types";
import { ActionHistoryPanel } from "./panels/ActionHistoryPanel";
import { DependenciesPanel } from "./panels/DependenciesPanel";
import { LifecycleCostPanel } from "./panels/LifecycleCostPanel";
import { MetricsPanel } from "./panels/MetricsPanel";
import { PropertiesPanel } from "./panels/PropertiesPanel";
import { TagsPanel } from "./panels/TagsPanel";

/* Status-driven action set (#36 house idiom): operator-gated, Terminate
   confirmed through AlertDialog, critical protection disables Terminate. */
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

interface Props {
  resourceId: string;
}

export function ResourceDetailPage({ resourceId }: Props) {
  const { data: resource, isLoading, error } = useQuery({
    queryKey: ["resource", resourceId],
    queryFn: () => getResource(resourceId),
    enabled: !!resourceId,
  });

  const { data: logs, isLoading: logsLoading, error: logsError } = useQuery({
    queryKey: ["action-logs", resourceId],
    queryFn: () => getActionLogs(resourceId),
    enabled: !!resourceId,
  });

  const { data: providers } = useProviders();
  const { isOperator } = useMe();
  const actionMut = useResourceAction();
  const [confirmTerminate, setConfirmTerminate] = useState(false);

  const handleAction = (action: ResourceAction) => {
    actionMut.mutate(
      { id: resourceId, action },
      {
        // Errors surface the engine's own message (403 tier denials included)
        // — honest passthrough, never swallowed or rephrased.
        onSuccess: (r) => showToast(`${r.action}: ${r.detail}`, "success"),
        onError: (e) => showToast((e as Error).message, "error"),
      },
    );
  };

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

  const provider = providers?.find((p) => p.id === resource.provider_id);
  const providerMeta = provider ? getProviderMeta(provider.provider_type) : null;
  const terminateVisible = ACTION_BUTTONS.some(
    (b) => b.action === "terminate" && (!b.when || b.when.includes(resource.status)),
  );

  return (
    <div className="space-y-6">
      {/* Breadcrumb — the dashboard is the resource list. */}
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
          <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-muted-foreground">
            <StatusBadge status={resource.status} />
            {provider && providerMeta && (
              <span className="flex items-center gap-1.5">
                <ProviderIcon type={provider.provider_type} size={16} />
                {providerMeta.label}
              </span>
            )}
            <span>{resource.resource_type}</span>
            <span>{resource.provider_id}</span>
          </div>
        </div>

        {/* Cosmetic gate only: the engine enforces the operator tier
            server-side (403) regardless of what the UI renders. */}
        {isOperator && (
          <div className="flex flex-col items-end gap-1">
            <div className="flex gap-2">
              {ACTION_BUTTONS.map((btn) => {
                if (btn.when && !btn.when.includes(resource.status)) return null;
                const criticalTerminate =
                  btn.action === "terminate" &&
                  resource.protection_level === "critical";
                return (
                  <Button
                    key={btn.action}
                    variant={btn.variant}
                    size="sm"
                    disabled={actionMut.isPending || criticalTerminate}
                    onClick={() =>
                      btn.action === "terminate"
                        ? setConfirmTerminate(true)
                        : handleAction(btn.action)
                    }
                  >
                    {btn.label}
                  </Button>
                );
              })}
            </div>
            {terminateVisible && resource.protection_level === "critical" && (
              <p className="text-xs text-muted-foreground">
                Terminate is disabled: critical protection — the engine
                refuses critical terminates.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Single-scroll two-column layout (epic decision) */}
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <PropertiesPanel resource={resource} />
          <MetricsPanel resourceId={resourceId} />
          <DependenciesPanel resourceId={resourceId} />
        </div>
        <div className="space-y-6">
          <LifecycleCostPanel resource={resource} />
          <TagsPanel tags={resource.tags} />
        </div>
      </div>

      <ActionHistoryPanel logs={logs} isLoading={logsLoading} error={logsError} />

      {/* Terminate confirm (SecurityReviewPage dismiss-dialog pattern). */}
      <AlertDialog open={confirmTerminate} onOpenChange={setConfirmTerminate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Terminate {resource.display_name || resource.external_id}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Permanently terminates this resource at the provider. This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={actionMut.isPending}
              onClick={() => handleAction("terminate")}
            >
              Confirm terminate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
