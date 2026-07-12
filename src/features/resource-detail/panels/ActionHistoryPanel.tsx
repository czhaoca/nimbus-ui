import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
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
import { formatTimestamp } from "@/lib/format";
import type { ActionLogEntry } from "../types";

// Log rows are success/failed — a different vocabulary than the shared
// resource/provider StatusBadge union, so the local map stays.
const LOG_STATUS_VARIANT: Record<string, "default" | "secondary" | "destructive"> = {
  success: "default",
  failed: "destructive",
};

export function ActionHistoryPanel({
  logs,
  isLoading,
  error,
}: {
  logs: ActionLogEntry[] | undefined;
  isLoading: boolean;
  error?: unknown;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Action History</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2 py-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ) : error ? (
          // A failed fetch is an error, never an empty history (honest
          // degradation — mirrors DependenciesPanel).
          <Alert variant="destructive">
            <AlertDescription>
              {error instanceof Error ? error.message : "Failed to load action history."}
            </AlertDescription>
          </Alert>
        ) : !logs || logs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            No actions recorded yet.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">Time</TableHead>
                <TableHead className="text-xs">Action</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Initiated By</TableHead>
                <TableHead className="text-xs">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-xs text-muted-foreground">
                    {formatTimestamp(log.created_at)}
                  </TableCell>
                  <TableCell className="font-mono text-xs">{log.action_type}</TableCell>
                  <TableCell>
                    <Badge variant={LOG_STATUS_VARIANT[log.status] ?? "secondary"}>
                      {log.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {log.initiated_by}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                    {Object.keys(log.details).length > 0
                      ? JSON.stringify(log.details)
                      : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
