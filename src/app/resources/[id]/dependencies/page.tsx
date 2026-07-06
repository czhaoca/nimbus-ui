"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { GitBranch, ArrowRight, ArrowLeft } from "lucide-react";
import { getResource, getResourceDependencies, listResources } from "@/lib/api/client";
import type { Resource } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  running: "default",
  stopped: "secondary",
  terminated: "destructive",
  unknown: "outline",
};

export default function DependencyGraphPage() {
  const params = useParams();
  const resourceId = params.id as string;

  const [resource, setResource] = useState<Resource | null>(null);
  const [upstream, setUpstream] = useState<Resource[]>([]);
  const [downstream, setDownstream] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [res, deps] = await Promise.all([
          getResource(resourceId),
          getResourceDependencies(resourceId),
        ]);
        setResource(res);

        const allResources = await listResources();
        const resourceMap = new Map(allResources.map((r) => [r.id, r]));

        // Contract returns both directions pre-partitioned.
        setUpstream(
          deps.depends_on
            .map((d) => resourceMap.get(d.target_id))
            .filter((r): r is Resource => Boolean(r)),
        );
        setDownstream(
          deps.depended_by
            .map((d) => resourceMap.get(d.source_id))
            .filter((r): r is Resource => Boolean(r)),
        );
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [resourceId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const renderResourceNode = (r: Resource) => (
    <Link key={r.id} href={`/resources/${r.id}`} className="no-underline hover:no-underline">
      <Card className="hover:border-primary transition-colors">
        <CardContent className="p-4">
          <div className="text-sm font-semibold truncate mb-1">
            {r.display_name || r.external_id}
          </div>
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <span>{r.resource_type}</span>
            <Badge variant={STATUS_VARIANT[r.status] ?? "outline"} className="text-[10px]">
              {r.status}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dependencies"
        icon={<GitBranch className="size-5" />}
        action={
          <Button variant="outline" size="sm" asChild>
            <Link href={`/resources/${resourceId}`}>Back to Resource</Link>
          </Button>
        }
      />

      <Card className="border-primary border-2 bg-primary/5">
        <CardContent className="p-4 text-center">
          <div className="text-sm font-semibold">
            {resource?.display_name || resource?.external_id}
          </div>
          <div className="text-xs text-muted-foreground">
            {resource?.resource_type} &middot; {resource?.provider_id}
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <ArrowLeft className="size-3.5 text-muted-foreground" /> Upstream (depends on)
        </h2>
        {upstream.length > 0 ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {upstream.map(renderResourceNode)}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No upstream dependencies.</p>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
          <ArrowRight className="size-3.5 text-muted-foreground" /> Downstream (depended on by)
        </h2>
        {downstream.length > 0 ? (
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {downstream.map(renderResourceNode)}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No downstream dependents.</p>
        )}
      </div>
    </div>
  );
}
