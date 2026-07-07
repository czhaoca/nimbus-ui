"use client";

import { useQueries } from "@tanstack/react-query";
import { ArrowLeft, Download } from "lucide-react";
import Link from "next/link";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { fetchRegistrySlots, fetchRegistryTargets } from "./api";

interface Props {
  projectName: string;
}

export function ProjectDetailPage({ projectName }: Props) {
  const [slotsQ, targetsQ] = useQueries({
    queries: [
      { queryKey: ["registry-slots"], queryFn: fetchRegistrySlots, refetchInterval: 30_000 },
      { queryKey: ["registry-targets"], queryFn: fetchRegistryTargets, refetchInterval: 30_000 },
    ],
  });

  const loading = slotsQ.isLoading || targetsQ.isLoading;

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-60 rounded-xl" />
      </div>
    );
  }

  const error = slotsQ.error || targetsQ.error;
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {error instanceof Error ? error.message : "Failed to load project slots"}
        </AlertDescription>
      </Alert>
    );
  }

  const allSlots = slotsQ.data ?? [];
  const targets = targetsQ.data ?? [];
  const slots = allSlots.filter((s) => s.project_name === projectName);
  const targetMap = Object.fromEntries(targets.map((t) => [t.id, t]));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/environments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="size-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold">{projectName}</h1>
          <p className="text-muted-foreground text-sm">
            Environment slots and service endpoints
          </p>
        </div>
      </div>

      {slots.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No slots reserved for this project.
          </CardContent>
        </Card>
      ) : (
        slots.map((slot) => {
          const target = slot.target_inventory_id ? targetMap[slot.target_inventory_id] : null;
          return (
            <Card key={slot.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Badge variant="outline">{slot.env_type}</Badge>
                    <span>{slot.slot_key}</span>
                    <Badge variant={slot.status === "reserved" ? "default" : "secondary"}>
                      {slot.status}
                    </Badge>
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={`/api/v1/projects/${projectName}/docker-compose?env=${slot.env_type}`}
                        download={`docker-compose.${slot.env_type}.yml`}
                      >
                        <Download className="size-4 mr-1" />
                        Compose
                      </a>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {target && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Target</span>
                      <p className="font-medium">{target.display_name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Node</span>
                      <p className="font-medium">{target.node_name || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">IP</span>
                      <p className="font-mono">{target.network_address || target.public_address || "-"}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Type</span>
                      <p className="font-medium">{target.target_type}</p>
                    </div>
                  </div>
                )}

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Service</TableHead>
                      <TableHead>Protocol</TableHead>
                      <TableHead>Host Port</TableHead>
                      <TableHead>Container Port</TableHead>
                      <TableHead>URL</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {slot.endpoints.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground">
                          No endpoints allocated.
                        </TableCell>
                      </TableRow>
                    ) : (
                      slot.endpoints.map((ep) => (
                        <TableRow key={ep.id}>
                          <TableCell className="font-medium">{ep.service_name}</TableCell>
                          <TableCell>{ep.protocol}</TableCell>
                          <TableCell className="font-mono">{ep.host_port}</TableCell>
                          <TableCell className="font-mono">{ep.container_port}</TableCell>
                          <TableCell>
                            <a
                              href={ep.access_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline text-sm"
                            >
                              {ep.access_url}
                            </a>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
