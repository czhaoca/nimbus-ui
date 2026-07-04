"use client";

import { useState, useEffect, useMemo } from "react";
import { MapPin } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";
import type { Resource, Provider } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function RegionsPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      apiFetch<Provider[]>("/api/providers"),
      apiFetch<Resource[]>("/api/resources"),
    ])
      .then(([p, r]) => {
        setProviders(p);
        setResources(r);
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const regions = useMemo(() => {
    const map = new Map<string, { provider_count: number; resource_count: number }>();
    providers.forEach((p) => {
      const region = p.region || "unknown";
      const entry = map.get(region) ?? { provider_count: 0, resource_count: 0 };
      entry.provider_count++;
      map.set(region, entry);
    });
    resources.forEach((r) => {
      const provider = providers.find((p) => p.id === r.provider_id);
      const region = provider?.region || "unknown";
      const entry = map.get(region) ?? { provider_count: 0, resource_count: 0 };
      entry.resource_count++;
      map.set(region, entry);
    });
    return Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.resource_count - a.resource_count);
  }, [providers, resources]);

  const filteredResources = useMemo(() => {
    if (!selectedRegion) return resources;
    const providerIds = new Set(
      providers.filter((p) => (p.region || "unknown") === selectedRegion).map((p) => p.id),
    );
    return resources.filter((r) => providerIds.has(r.provider_id));
  }, [resources, providers, selectedRegion]);

  const STATUS_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    running: "default",
    stopped: "secondary",
    terminated: "destructive",
    unknown: "outline",
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-6 w-32" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
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
        title="Regions"
        icon={<MapPin size={20} />}
        action={
          selectedRegion ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedRegion(null)}
            >
              Show All Regions
            </Button>
          ) : undefined
        }
      />

      {/* Region selector cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {regions.map((region) => (
          <Card
            key={region.name}
            className={`cursor-pointer py-4 transition-colors ${
              selectedRegion === region.name
                ? "border-primary bg-primary/5"
                : "hover:border-primary/50"
            }`}
            onClick={() => setSelectedRegion(region.name)}
          >
            <CardHeader className="pb-0">
              <div className="flex items-center gap-2">
                <MapPin size={14} className="text-muted-foreground" />
                <CardTitle className="text-sm">{region.name}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground space-y-0.5">
                <p>{region.provider_count} provider{region.provider_count !== 1 && "s"}</p>
                <p>{region.resource_count} resource{region.resource_count !== 1 && "s"}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {regions.length === 0 && (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <MapPin size={32} className="mb-2 opacity-40" />
          <p className="text-sm">No regions found.</p>
        </div>
      )}

      {/* Resources table */}
      {filteredResources.length > 0 && (
        <Card className="py-0 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Cost/mo</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredResources.map((r) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link
                      href={`/resources/${r.id}`}
                      className="text-foreground hover:text-primary"
                    >
                      {r.display_name || r.external_id}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.resource_type}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.provider_id}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_BADGE_VARIANT[r.status] ?? STATUS_BADGE_VARIANT["unknown"]}>
                      {r.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    ${r.monthly_cost_estimate.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}
    </div>
  );
}
