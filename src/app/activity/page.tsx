"use client";

import { useState, useEffect } from "react";
import { Activity, Filter, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { getActivityFeed, type ActivityItem } from "@/lib/api/client";
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

const SOURCE_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  audit: "default",
  webhook: "secondary",
};

const SOURCE_FILTERS = ["all", "audit", "webhook"] as const;

export default function ActivityPage() {
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterSource, setFilterSource] = useState<string>("all");

  useEffect(() => {
    setLoading(true);
    // /api/v1/activity merges audit-log and webhook events into one feed.
    getActivityFeed(
      filterSource === "all" ? {} : { source: filterSource as "audit" | "webhook" },
    )
      .then(setItems)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [filterSource]);

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
            <Select value={filterSource} onValueChange={setFilterSource}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_FILTERS.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t === "all" ? "All Sources" : t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <p className="text-sm text-muted-foreground">
        {items.length} event{items.length !== 1 && "s"}
      </p>

      {/* Timeline */}
      <div className="relative">
        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            No activity recorded yet.
          </p>
        ) : (
          <>
            <Separator
              orientation="vertical"
              className="absolute left-4 top-0 bottom-0 h-full"
            />

            {items.map((item, i) => (
              <div key={item.id || i} className="relative pl-10 pb-4">
                {/* Dot */}
                <div className="absolute left-2.5 top-2 w-3 h-3 rounded-full bg-border" />

                <Card className="py-4">
                  <CardContent className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Badge variant={SOURCE_VARIANTS[item.source] ?? "outline"}>
                        {item.source}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(item.timestamp)}
                      </span>
                    </div>

                    <p className="text-sm">{item.summary}</p>

                    {Object.keys(item.details).length > 0 && (
                      <details className="mt-1 text-xs text-muted-foreground">
                        <summary className="cursor-pointer hover:text-foreground">
                          Details
                        </summary>
                        <pre className="mt-1 text-xs bg-muted rounded p-2 overflow-x-auto">
                          {JSON.stringify(item.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </CardContent>
                </Card>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
