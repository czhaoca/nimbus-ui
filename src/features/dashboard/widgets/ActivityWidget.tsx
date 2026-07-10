"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Clock } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { getActivityFeed } from "@/lib/api/client";

const SOURCE_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  audit: "default",
  webhook: "secondary",
};

export function ActivityWidget() {
  const feedQuery = useQuery({
    queryKey: ["activity-feed"],
    queryFn: () => getActivityFeed({ per_page: 8 }),
  });

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
        <Clock className="size-4 text-muted-foreground" /> Recent Activity
      </h3>

      {feedQuery.isPending ? (
        <p className="text-muted-foreground text-sm py-8 text-center">Loading activity…</p>
      ) : feedQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {feedQuery.error instanceof Error
              ? feedQuery.error.message
              : "Failed to load activity"}
          </AlertDescription>
        </Alert>
      ) : feedQuery.data.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
          <Clock className="size-7 mb-2 opacity-40" />
          <p className="text-sm">No recent activity recorded.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {feedQuery.data.items.map((item) => (
            <li key={item.id} className="flex items-start gap-2 text-sm">
              <Badge variant={SOURCE_VARIANTS[item.source] ?? "outline"}>
                {item.source}
              </Badge>
              <span className="flex-1 min-w-0 truncate">{item.summary}</span>
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                {item.timestamp ? new Date(item.timestamp).toLocaleString() : "--"}
              </span>
            </li>
          ))}
        </ul>
      )}

      <Link
        href="/activity"
        className="text-xs text-muted-foreground hover:text-foreground mt-3 inline-block"
      >
        View all activity →
      </Link>
    </div>
  );
}
