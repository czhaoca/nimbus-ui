"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { getAuditLogs } from "@/lib/api/client";
import type { ActionLogEntry } from "@/lib/types";
import { ScrollText } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const statusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
  if (status === "success") return "default";
  if (status === "error") return "destructive";
  return "secondary";
};

const columns: ColumnDef<ActionLogEntry, unknown>[] = [
  {
    accessorKey: "created_at",
    header: "Time",
    cell: ({ getValue }) => {
      const v = getValue<string | null>();
      return <span className="text-xs text-muted-foreground">{v ? new Date(v).toLocaleString() : "\u2014"}</span>;
    },
  },
  {
    accessorKey: "action_type",
    header: "Action",
    cell: ({ getValue }) => <Badge variant="outline">{getValue<string>()}</Badge>,
  },
  {
    accessorKey: "resource_id",
    header: "Resource",
    cell: ({ getValue }) => <span className="font-mono text-xs">{getValue<string>() ?? "\u2014"}</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => {
      const s = getValue<string>();
      return <Badge variant={statusVariant(s)}>{s}</Badge>;
    },
  },
  {
    accessorKey: "initiated_by",
    header: "Initiated By",
    cell: ({ getValue }) => <span className="text-xs">{getValue<string>()}</span>,
  },
  {
    accessorKey: "details",
    header: "Details",
    enableSorting: false,
    cell: ({ getValue }) => (
      <span className="text-xs font-mono max-w-xs truncate block">
        {JSON.stringify(getValue())}
      </span>
    ),
  },
];

export default function AuditPage() {
  const [providerFilter, setProviderFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [limit, setLimit] = useState(50);

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["audit-logs", providerFilter, actionFilter, limit],
    queryFn: () => getAuditLogs({ provider_id: providerFilter || undefined, action_type: actionFilter || undefined, limit }),
  });

  // Stable column reference
  const cols = useMemo(() => columns, []);

  return (
    <div className="space-y-4">
      <PageHeader title="Audit Log" />

      <div className="flex flex-wrap gap-3">
        <Input
          type="text"
          placeholder="Filter by provider..."
          value={providerFilter}
          onChange={(e) => setProviderFilter(e.target.value)}
          className="w-52"
        />
        <Select value={actionFilter || "all"} onValueChange={(v) => setActionFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            <SelectItem value="stop">Stop</SelectItem>
            <SelectItem value="start">Start</SelectItem>
            <SelectItem value="terminate">Terminate</SelectItem>
            <SelectItem value="health_check">Health Check</SelectItem>
            <SelectItem value="sync">Sync</SelectItem>
            <SelectItem value="provision">Provision</SelectItem>
          </SelectContent>
        </Select>
        <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
          <SelectTrigger className="w-32">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="25">25 entries</SelectItem>
            <SelectItem value="50">50 entries</SelectItem>
            <SelectItem value="100">100 entries</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={cols}
        data={logs}
        loading={isLoading}
        sorting
        filtering
        filterPlaceholder="Search audit logs..."
        emptyIcon={<ScrollText size={32} />}
        emptyMessage="No audit entries found."
      />
    </div>
  );
}
