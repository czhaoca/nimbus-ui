"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Clock } from "lucide-react";
import { apiFetch } from "@/lib/api/client";
import type { Resource } from "@/lib/types";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";


interface HealthCheck {
  id: string;
  resource_id: string;
  status: string;
  response_time_ms: number | null;
  message: string;
  checked_at: string;
}

const STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  healthy: "default",
  degraded: "secondary",
  unhealthy: "destructive",
  unknown: "outline",
};

export default function HealthTimelinePage() {
  const params = useParams();
  const resourceId = params.id as string;

  const [resource, setResource] = useState<Resource | null>(null);
  const [checks, setChecks] = useState<HealthCheck[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [res, healthChecks] = await Promise.all([
          apiFetch<Resource>(`/api/resources/${resourceId}`),
          apiFetch<HealthCheck[]>(`/api/resources/${resourceId}/health`),
        ]);
        setResource(res);
        setChecks(healthChecks);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [resourceId]);

  const formatDate = (dateStr: string) => new Date(dateStr).toLocaleString();

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-16 w-full" />
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
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

      <div className="relative">
        {checks.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-12">
            No health checks recorded yet.
          </p>
        ) : (
          <div className="space-y-0">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

            {checks.map((check, i) => {
              const status = check.status.toLowerCase();
              return (
                <div key={check.id || i} className="relative pl-10 pb-6">
                  <div className="absolute left-2.5 top-1 w-3 h-3 rounded-full bg-muted-foreground" />

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={STATUS_VARIANT[status] ?? "outline"}>
                          {check.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="size-3" />
                          {formatDate(check.checked_at)}
                        </span>
                      </div>

                      {check.response_time_ms !== null && (
                        <p className="text-xs text-muted-foreground mb-1">
                          Response time: {check.response_time_ms}ms
                        </p>
                      )}

                      {check.message && (
                        <p className="text-xs text-muted-foreground">{check.message}</p>
                      )}
                    </CardContent>
                  </Card>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
