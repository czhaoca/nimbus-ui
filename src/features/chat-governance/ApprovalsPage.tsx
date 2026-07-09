"use client";

import { useState, type FormEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { Info } from "lucide-react";

import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import { fetchApprovals, fetchChannels, fetchRole } from "./api";
import { CHAT_PLATFORMS, type ChatApproval } from "./types";

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

function PlatformSelect({
  value,
  onChange,
  labelId,
}: {
  value: string;
  onChange: (platform: string) => void;
  labelId: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-labelledby={labelId} className="w-44">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CHAT_PLATFORMS.map((platform) => (
          <SelectItem key={platform} value={platform}>
            {platform}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ApprovalsQueueTab() {
  const approvalsQuery = useQuery({
    queryKey: ["chat-approvals"],
    queryFn: () => fetchApprovals(),
  });

  if (approvalsQuery.isPending) {
    return <p className="text-muted-foreground text-sm">Loading approvals…</p>;
  }
  if (approvalsQuery.isError) {
    return (
      <Alert variant="destructive">
        <AlertDescription>
          {approvalsQuery.error instanceof Error
            ? approvalsQuery.error.message
            : "Failed to load approvals"}
        </AlertDescription>
      </Alert>
    );
  }
  if (approvalsQuery.data.items.length === 0) {
    return (
      <p className="text-muted-foreground text-sm">
        No pending approvals — the queue is empty.
      </p>
    );
  }
  return <DataTable columns={columns} data={approvalsQuery.data.items} />;
}

const CHANNEL_FIELDS: Array<{
  key: "feed_channel_id" | "briefing_channel_id" | "incidents_channel_id" | "approvals_channel_id";
  label: string;
}> = [
  { key: "feed_channel_id", label: "Feed channel" },
  { key: "briefing_channel_id", label: "Briefing channel" },
  { key: "incidents_channel_id", label: "Incidents channel" },
  { key: "approvals_channel_id", label: "Approvals channel" },
];

function ChannelsTab() {
  const [platform, setPlatform] = useState<string>(CHAT_PLATFORMS[0]);
  const channelsQuery = useQuery({
    queryKey: ["chat-channels", platform],
    queryFn: () => fetchChannels(platform),
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Label id="channels-platform-label">Platform</Label>
        <PlatformSelect
          value={platform}
          onChange={setPlatform}
          labelId="channels-platform-label"
        />
      </div>

      {channelsQuery.isPending ? (
        <p className="text-muted-foreground text-sm">Loading channel config…</p>
      ) : channelsQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {channelsQuery.error instanceof Error
              ? channelsQuery.error.message
              : "Failed to load channel config"}
          </AlertDescription>
        </Alert>
      ) : (
        <dl className="grid gap-3 sm:grid-cols-2">
          {CHANNEL_FIELDS.map(({ key, label }) => (
            <div key={key} className="rounded-md border p-3">
              <dt className="text-muted-foreground text-xs">{label}</dt>
              <dd className="mt-1 text-sm">
                {channelsQuery.data[key] ?? (
                  <span className="text-muted-foreground italic">
                    Not configured
                  </span>
                )}
              </dd>
            </div>
          ))}
          <div className="rounded-md border p-3">
            <dt className="text-muted-foreground text-xs">Provider filter</dt>
            <dd className="mt-1 text-sm">
              {channelsQuery.data.provider_filter || (
                <span className="text-muted-foreground italic">
                  Not configured
                </span>
              )}
            </dd>
          </div>
          <div className="rounded-md border p-3">
            <dt className="text-muted-foreground text-xs">Env filter</dt>
            <dd className="mt-1 text-sm">
              {channelsQuery.data.env_filter || (
                <span className="text-muted-foreground italic">
                  Not configured
                </span>
              )}
            </dd>
          </div>
        </dl>
      )}
    </div>
  );
}

function RolesTab() {
  const [platform, setPlatform] = useState<string>(CHAT_PLATFORMS[0]);
  const [userId, setUserId] = useState("");
  const [lookup, setLookup] = useState<{ platform: string; userId: string } | null>(null);

  const roleQuery = useQuery({
    queryKey: ["chat-role", lookup?.platform, lookup?.userId],
    queryFn: () => fetchRole(lookup!.platform, lookup!.userId),
    enabled: lookup !== null,
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (userId.trim()) setLookup({ platform, userId: userId.trim() });
  };

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        The contract exposes per-user lookups only — there is no role list
        endpoint. Unmapped users resolve to viewer (the engine&apos;s floor
        default), so a viewer result is not proof of an explicit mapping.
      </p>

      <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label id="roles-platform-label">Platform</Label>
          <PlatformSelect
            value={platform}
            onChange={setPlatform}
            labelId="roles-platform-label"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="roles-user-id">Platform user id</Label>
          <Input
            id="roles-user-id"
            value={userId}
            onChange={(event) => setUserId(event.target.value)}
            placeholder="e.g. a Discord user id"
            className="w-64"
          />
        </div>
        <Button type="submit" variant="secondary">
          Look up
        </Button>
      </form>

      {lookup === null ? null : roleQuery.isPending ? (
        <p className="text-muted-foreground text-sm">Resolving role…</p>
      ) : roleQuery.isError ? (
        <Alert variant="destructive">
          <AlertDescription>
            {roleQuery.error instanceof Error
              ? roleQuery.error.message
              : "Failed to resolve role"}
          </AlertDescription>
        </Alert>
      ) : (
        <div className="rounded-md border p-4">
          <p className="text-muted-foreground text-xs">
            Resolved role for {roleQuery.data.platform_user_id} on{" "}
            {roleQuery.data.platform}
          </p>
          <p className="mt-2">
            <Badge>{roleQuery.data.role}</Badge>
          </p>
        </div>
      )}
    </div>
  );
}

export function ApprovalsPage() {
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

      <Tabs defaultValue="approvals">
        <TabsList>
          <TabsTrigger value="approvals">Approvals</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="roles">Roles</TabsTrigger>
        </TabsList>
        <TabsContent value="approvals" className="pt-4">
          <ApprovalsQueueTab />
        </TabsContent>
        <TabsContent value="channels" className="pt-4">
          <ChannelsTab />
        </TabsContent>
        <TabsContent value="roles" className="pt-4">
          <RolesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
