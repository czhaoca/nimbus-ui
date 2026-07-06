"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Clock, Info } from "lucide-react";
import { getResource } from "@/lib/api/client";
import type { Resource } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function HealthTimelinePage() {
  const params = useParams();
  const resourceId = params.id as string;

  const [resource, setResource] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getResource(resourceId)
      .then(setResource)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, [resourceId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-16 w-full" />
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Health Timeline"
        icon={<Clock className="size-5" />}
        action={
          <Button variant="outline" size="sm" asChild>
            <Link href={`/resources/${resourceId}`}>Back to Resource</Link>
          </Button>
        }
      />

      {resource && (
        <Card>
          <CardContent className="p-4">
            <h2 className="text-sm font-semibold mb-1">
              {resource.display_name || resource.external_id}
            </h2>
            <p className="text-xs text-muted-foreground">
              {resource.resource_type} &middot; {resource.provider_id}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Deferred surface: per-resource health-check history has no /api/v1
          endpoint (the old /resources/{id}/health route does not exist
          engine-side). Action history is available on the resource detail
          page via /resources/{id}/logs. */}
      <Alert>
        <Info className="size-4" />
        <AlertDescription>
          Per-resource health-check history is not exposed by the /api/v1
          contract yet. See the{" "}
          <Link href={`/resources/${resourceId}`} className="underline">
            resource detail page
          </Link>{" "}
          for action logs, or the Provider Health page for live provider
          probes.
        </AlertDescription>
      </Alert>
    </div>
  );
}
