"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { type ColumnDef } from "@tanstack/react-table";
import { Webhook } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { listWebhookEvents } from "@/lib/api/client";
import { DataTable } from "@/components/DataTable";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WebhookEvent {
  id: string;
  direction: "inbound" | "outbound";
  channel: string;
  event_type: string;
  payload: Record<string, unknown>;
  status: string;
  created_at: string;
}

interface EventsResponse {
  events: WebhookEvent[];
  total: number;
  page: number;
  page_size: number;
}

const DIRECTIONS = ["all", "inbound", "outbound"] as const;
const PAGE_SIZE = 20;

const columns: ColumnDef<WebhookEvent, unknown>[] = [
  {
    accessorKey: "created_at",
    header: "Time",
    cell: ({ getValue }) => new Date(getValue<string>()).toLocaleString(),
  },
  {
    accessorKey: "direction",
    header: "Direction",
    cell: ({ getValue }) => {
      const d = getValue<string>();
      return (
        <Badge
          className={
            d === "inbound"
              ? "bg-blue-500/20 text-blue-400 border-transparent"
              : "bg-purple-500/20 text-purple-400 border-transparent"
          }
        >
          {d}
        </Badge>
      );
    },
  },
  { accessorKey: "channel", header: "Channel" },
  {
    accessorKey: "event_type",
    header: "Event Type",
    cell: ({ getValue }) => <span className="font-mono text-xs">{getValue<string>()}</span>,
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ getValue }) => {
      const s = getValue<string>();
      return (
        <Badge
          className={
            s === "delivered"
              ? "bg-emerald-500/20 text-emerald-400 border-transparent"
              : s === "failed"
                ? "bg-red-500/20 text-red-400 border-transparent"
                : "bg-gray-500/20 text-gray-400 border-transparent"
          }
        >
          {s}
        </Badge>
      );
    },
  },
];

export default function WebhooksPage() {
  const [events, setEvents] = useState<WebhookEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [direction, setDirection] = useState<string>("all");
  const [channel, setChannel] = useState("");

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Contract paginates with per_page (the old page_size param was
      // silently ignored by the engine).
      const data = await listWebhookEvents<EventsResponse>({
        page,
        per_page: PAGE_SIZE,
        ...(direction !== "all" ? { direction } : {}),
        ...(channel.trim() ? { channel: channel.trim() } : {}),
      });
      setEvents(data.events);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load events");
    } finally {
      setLoading(false);
    }
  }, [page, direction, channel]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const cols = useMemo(() => columns, []);

  return (
    <div>
      <PageHeader title="Webhook Events" />

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div className="flex flex-col gap-1">
          <Label className="text-sm text-muted-foreground">Direction</Label>
          <Select
            value={direction}
            onValueChange={(value) => {
              setDirection(value);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIRECTIONS.map((d) => (
                <SelectItem key={d} value={d}>
                  {d.charAt(0).toUpperCase() + d.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-sm text-muted-foreground">Channel</Label>
          <Input
            className="w-[200px]"
            placeholder="e.g. slack, discord"
            value={channel}
            onChange={(e) => {
              setChannel(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setDirection("all");
            setChannel("");
            setPage(1);
          }}
        >
          Reset
        </Button>
      </div>

      <DataTable
        columns={cols}
        data={events}
        loading={loading}
        sorting
        emptyIcon={<Webhook size={32} />}
        emptyMessage="No webhook events found."
      />

      {/* Server-side pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * PAGE_SIZE + 1}&ndash;{Math.min(page * PAGE_SIZE, total)} of {total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
