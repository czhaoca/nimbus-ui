"use client";

import { useState, useEffect, useMemo } from "react";
import { Activity, Filter, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";
import type { ActionLogEntry } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

const ACTION_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  start: "default",
  stop: "secondary",
  terminate: "destructive",
  health_check: "outline",
  sync: "secondary",
  create: "default",
  delete: "destructive",
  update: "secondary",
};

export default function ActivityPage() {
  const [actions, setActions] = useState<ActionLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("all");

  useEffect(() => {
    apiFetch<ActionLogEntry[]>("/api/actions")
      .then(setActions)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const actionTypes = useMemo(() => {
    const types = new Set(actions.map((a) => a.action_type));
    return ["all", ...Array.from(types).sort()];
  }, [actions]);

  const filteredActions = useMemo(() => {
    if (filterType === "all") return actions;
    return actions.filter((a) => a.action_type === filterType);
  }, [actions, filterType]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "--";
    return new Date(dateStr).toLocaleString();
  };

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex gap-4">
            <Skeleton className="h-3 w-3 rounded-full mt-2" />
            <Skeleton className="h-24 flex-1 rounded-xl" />
          </div>
        ))}
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
      <PageHeader
        title="Activity Timeline"
        icon={<Activity size={20} />}
        action={
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-muted-foreground" />
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {actionTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t === "all" ? "All Actions" : t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <p className="text-sm text-muted-foreground">
        {filteredActions.length} action{filteredActions.length !== 1 && "s"}
      </p>

      {/* Timeline */}
      <div className="relative">
        {filteredActions.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            No activity recorded yet.
          </p>
        ) : (
          <>
            <Separator
              orientation="vertical"
              className="absolute left-4 top-0 bottom-0 h-full"
            />

            {filteredActions.map((action, i) => {
              const variant =
                ACTION_VARIANTS[action.action_type] ?? "outline";

              return (
                <div key={action.id || i} className="relative pl-10 pb-4">
                  {/* Dot */}
                  <div className="absolute left-2.5 top-2 w-3 h-3 rounded-full bg-border" />

                  <Card className="py-4">
                    <CardContent className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Badge variant={variant}>
                          {action.action_type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(action.created_at)}
                        </span>
                      </div>

                      <div className="text-xs text-muted-foreground space-y-0.5">
                        {action.resource_id && (
                          <p>
                            Resource:{" "}
                            <Link
                              href={`/resources/${action.resource_id}`}
                              className="text-primary hover:underline"
                            >
                              {action.resource_id}
                            </Link>
                          </p>
                        )}
                        <p>Status: {action.status}</p>
                        <p>By: {action.initiated_by}</p>
                        {Object.keys(action.details).length > 0 && (
                          <details className="mt-1">
                            <summary className="cursor-pointer hover:text-foreground">
                              Details
                            </summary>
                            <pre className="mt-1 text-xs bg-muted rounded p-2 overflow-x-auto">
                              {JSON.stringify(action.details, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
