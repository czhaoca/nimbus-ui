"use client";

import { useState, useEffect, useCallback } from "react";
import { getSystemInfo } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

interface SystemInfo {
  app_name: string;
  version: string;
  environment: string;
  uptime_seconds: number;
  uptime_human: string;
  database: {
    url_type: string;
    tables: Record<string, number>;
    total_rows: number;
  };
  background_tasks: {
    name: string;
    interval: string;
    status: string;
  }[];
}

const TASK_BADGE_VARIANT: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  running: "default",
  idle: "secondary",
  failed: "destructive",
};

export default function SystemPage() {
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getSystemInfo<SystemInfo>();
      setInfo(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load system info");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const tableEntries = info ? Object.entries(info.database.tables) : [];

  return (
    <div>
      <PageHeader title="System" />

      {/* System info cards */}
      {info && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card className="py-4">
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground mb-1">Application</p>
              <p className="text-lg font-semibold">{info.app_name}</p>
              <p className="text-xs text-muted-foreground">v{info.version}</p>
            </CardContent>
          </Card>
          <Card className="py-4">
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground mb-1">Environment</p>
              <p className="text-lg font-semibold">{info.environment}</p>
            </CardContent>
          </Card>
          <Card className="py-4">
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground mb-1">Database</p>
              <p className="text-lg font-semibold">{info.database.url_type}</p>
              <p className="text-xs text-muted-foreground">
                {info.database.total_rows.toLocaleString()} total rows
              </p>
            </CardContent>
          </Card>
          <Card className="py-4">
            <CardContent className="pt-0">
              <p className="text-sm text-muted-foreground mb-1">Uptime</p>
              <p className="text-lg font-semibold">{info.uptime_human}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Database tables */}
      {tableEntries.length > 0 && (
        <div className="mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Database Tables</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Table</TableHead>
                    <TableHead>Rows</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableEntries.map(([name, count]) => (
                    <TableRow key={name}>
                      <TableCell className="font-mono text-xs">{name}</TableCell>
                      <TableCell>{count.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Background tasks */}
      {info && info.background_tasks.length > 0 && (
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Background Tasks</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Task</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Interval</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {info.background_tasks.map((t) => (
                    <TableRow key={t.name}>
                      <TableCell className="font-medium">{t.name}</TableCell>
                      <TableCell>
                        <Badge variant={TASK_BADGE_VARIANT[t.status] ?? "secondary"}>
                          {t.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {t.interval}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Refresh */}
      <div className="mt-6">
        <Button variant="outline" size="sm" onClick={fetchAll}>
          Refresh
        </Button>
      </div>
    </div>
  );
}
