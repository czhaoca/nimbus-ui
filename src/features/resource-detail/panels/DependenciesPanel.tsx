"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useResources } from "@/lib/hooks/useApi";
import { getResourceDependencies } from "../api";
import type { Resource } from "../types";

interface Edge {
  id: string;
  neighborId: string;
  type: string;
}

function DependencyChip({ edge, neighbor }: { edge: Edge; neighbor?: Resource }) {
  if (!neighbor) {
    // Honest degradation: an edge whose neighbor is not in the inventory
    // list still renders (raw id, unlinked) instead of being dropped.
    return (
      <Badge variant="outline" className="gap-1.5 py-1 font-normal font-mono">
        {edge.neighborId}
        <span className="text-muted-foreground">{edge.type}</span>
      </Badge>
    );
  }
  return (
    <Link href={`/resources/${neighbor.id}`} className="no-underline hover:no-underline">
      <Badge variant="outline" className="gap-1.5 py-1 font-normal hover:border-primary">
        <span className="font-medium text-foreground">
          {neighbor.display_name || neighbor.external_id}
        </span>
        <span className="text-muted-foreground">{edge.type}</span>
      </Badge>
    </Link>
  );
}

export function DependenciesPanel({ resourceId }: { resourceId: string }) {
  const depsQ = useQuery({
    queryKey: ["resource-dependencies", resourceId],
    queryFn: () => getResourceDependencies(resourceId),
    enabled: !!resourceId,
  });
  const resourcesQ = useResources();

  const resourceMap = useMemo(
    () => new Map((resourcesQ.data ?? []).map((r) => [r.id, r])),
    [resourcesQ.data],
  );

  const upstream: Edge[] = (depsQ.data?.depends_on ?? []).map((d) => ({
    id: d.id,
    neighborId: d.target_id,
    type: d.type,
  }));
  const downstream: Edge[] = (depsQ.data?.depended_by ?? []).map((d) => ({
    id: d.id,
    neighborId: d.source_id,
    type: d.type,
  }));

  return (
    // scroll-mt keeps the anchored card clear of the sticky header when the
    // /dependencies redirect lands on #dependencies.
    <Card id="dependencies" className="scroll-mt-20">
      <CardHeader>
        <CardTitle className="text-sm">Dependencies</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {depsQ.isLoading || resourcesQ.isLoading ? (
          <div className="space-y-2 py-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : depsQ.error ? (
          <Alert variant="destructive">
            <AlertDescription>
              {depsQ.error instanceof Error
                ? depsQ.error.message
                : "Failed to load dependencies."}
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div>
              <h3 className="text-xs font-semibold flex items-center gap-1.5 mb-2 text-muted-foreground">
                <ArrowLeft className="size-3" /> Upstream (depends on)
              </h3>
              {upstream.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {upstream.map((edge) => (
                    <DependencyChip
                      key={edge.id}
                      edge={edge}
                      neighbor={resourceMap.get(edge.neighborId)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No upstream dependencies.</p>
              )}
            </div>
            <div>
              <h3 className="text-xs font-semibold flex items-center gap-1.5 mb-2 text-muted-foreground">
                <ArrowRight className="size-3" /> Downstream (depended on by)
              </h3>
              {downstream.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {downstream.map((edge) => (
                    <DependencyChip
                      key={edge.id}
                      edge={edge}
                      neighbor={resourceMap.get(edge.neighborId)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No downstream dependents.</p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
