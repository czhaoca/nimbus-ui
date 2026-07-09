"use client";

import { useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { Info } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

import { fetchApprovals } from "./api";
import type { ChatApproval } from "./types";

const formatTimestamp = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString() : "—";

const columns: ColumnDef<ChatApproval>[] = [
  { accessorKey: "approval_id", header: "Approval" },
  { accessorKey: "operation", header: "Operation" },
  { accessorKey: "requested_by", header: "Requested by" },
  {
    accessorKey: "created_at",
    header: "Requested at",
    cell: ({ row }) => formatTimestamp(row.original.created_at),
  },
  {
    accessorKey: "expires_at",
    header: "Expires",
    cell: ({ row }) => formatTimestamp(row.original.expires_at),
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => (
      <Badge variant={row.original.status === "pending" ? "default" : "secondary"}>
        {row.original.status}
      </Badge>
    ),
  },
];

export function ApprovalsPage() {
  const approvalsQuery = useQuery({
    queryKey: ["chat-approvals"],
    queryFn: () => fetchApprovals(),
  });

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Approvals"
        description="Pending Tier-2/3 operation approvals staged from chat."
      />

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          Read-only view — approve/deny actions run in chat (dual-gated by
          platform admin identity). Web actions ship once the gating model
          is pinned for web actors.
        </AlertDescription>
      </Alert>

      {approvalsQuery.isPending ? (
        <p className="text-muted-foreground text-sm">Loading approvals…</p>
      ) : approvalsQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {approvalsQuery.error instanceof Error
              ? approvalsQuery.error.message
              : "Failed to load approvals"}
          </AlertDescription>
        </Alert>
      ) : approvalsQuery.data.items.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No pending approvals — the queue is empty.
        </p>
      ) : (
        <DataTable columns={columns} data={approvalsQuery.data.items} />
      )}
    </div>
  );
}
