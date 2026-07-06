"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type ColumnDef } from "@tanstack/react-table";
import { Info, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { DataTable } from "@/components/DataTable";
import { showToast } from "@/components/Toasts";
import { getMe } from "@/lib/api/client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";

import { dismissFinding, fetchFindings, promoteFinding } from "./api";
import { FINDING_STATUSES, SEVERITIES, type ReviewFinding } from "./types";

const SEVERITY_RANK: Record<string, number> = Object.fromEntries(
  SEVERITIES.map((s, i) => [s, i]),
);

const SEVERITY_BADGE: Record<
  string,
  { variant: "default" | "secondary" | "destructive" | "outline"; className?: string }
> = {
  CRITICAL: { variant: "destructive" },
  HIGH: { variant: "outline", className: "text-orange-400 border-orange-400/40" },
  MEDIUM: { variant: "outline", className: "text-amber-400 border-amber-400/40" },
  LOW: { variant: "secondary" },
  INFO: { variant: "secondary" },
};

const STATUS_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  open: "default",
  acknowledged: "secondary",
  dismissed: "outline",
  promoted: "outline",
};

function SeverityBadge({ severity }: { severity: string }) {
  const style = SEVERITY_BADGE[severity] ?? { variant: "secondary" as const };
  return (
    <Badge variant={style.variant} className={style.className}>
      {severity}
    </Badge>
  );
}

export function SecurityReviewPage() {
  const queryClient = useQueryClient();
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState<ReviewFinding | null>(null);
  const [confirmDismiss, setConfirmDismiss] = useState(false);
  const [dismissNote, setDismissNote] = useState("");
  const [promoteOpen, setPromoteOpen] = useState(false);

  // Cosmetic gate only — the ops registry enforces the operator tier
  // server-side (403 "denied") regardless of what the UI renders.
  const { data: me } = useQuery({
    queryKey: ["auth-me"],
    queryFn: getMe,
    staleTime: Infinity,
  });
  const isOperator = me?.role === "operator" || me?.role === "admin";

  const {
    data: findings,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["security-findings", severityFilter, statusFilter],
    queryFn: () =>
      fetchFindings({
        severity: severityFilter === "all" ? undefined : severityFilter,
        status: statusFilter === "all" ? undefined : statusFilter,
      }),
  });

  const rows = useMemo(() => {
    const list = [...(findings ?? [])];
    list.sort(
      (a, b) =>
        (SEVERITY_RANK[a.severity] ?? SEVERITIES.length) -
          (SEVERITY_RANK[b.severity] ?? SEVERITIES.length) || b.id - a.id,
    );
    return list;
  }, [findings]);

  const closeAll = () => {
    setConfirmDismiss(false);
    setPromoteOpen(false);
    setSelected(null);
    setDismissNote("");
  };

  const dismissMutation = useMutation({
    mutationFn: ({ id, note }: { id: number; note: string }) =>
      dismissFinding(id, note),
    onSuccess: (result) => {
      showToast(`Finding #${result.finding_id} dismissed`, "success");
      queryClient.invalidateQueries({ queryKey: ["security-findings"] });
      closeAll();
    },
    onError: (e) => showToast((e as Error).message, "error"),
  });

  const promoteMutation = useMutation({
    mutationFn: promoteFinding,
    onSuccess: (result) => {
      showToast(
        `Finding #${result.finding_id} promoted — proposal #${result.proposal_id} staged for approval`,
        "success",
      );
      queryClient.invalidateQueries({ queryKey: ["security-findings"] });
      closeAll();
    },
    onError: (e) => showToast((e as Error).message, "error"),
  });

  const columns: ColumnDef<ReviewFinding, unknown>[] = useMemo(
    () => [
      {
        accessorKey: "severity",
        header: "Severity",
        cell: ({ getValue }) => <SeverityBadge severity={getValue<string>()} />,
      },
      {
        accessorKey: "category",
        header: "Category",
        cell: ({ getValue }) => (
          <span className="font-mono text-xs">{getValue<string>()}</span>
        ),
      },
      {
        accessorKey: "message",
        header: "Finding",
        cell: ({ getValue }) => (
          <span className="text-xs max-w-md truncate block">
            {getValue<string>()}
          </span>
        ),
      },
      {
        accessorKey: "provider_types",
        header: "Providers",
        cell: ({ getValue }) => (
          <span className="flex gap-1">
            {getValue<string[]>().map((p) => (
              <Badge key={p} variant="outline">
                {p}
              </Badge>
            ))}
          </span>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ getValue }) => {
          const s = getValue<string>();
          return <Badge variant={STATUS_BADGE[s] ?? "secondary"}>{s}</Badge>;
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelected(row.original)}
          >
            View
          </Button>
        ),
      },
    ],
    [],
  );

  // Terminal states: the engine refuses dismissing/promoting a promoted
  // finding, and re-dismissing a dismissed one is meaningless.
  const canDismiss =
    selected?.status === "open" || selected?.status === "acknowledged";
  const canPromote = canDismiss;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security Review"
        description="Persisted findings from the deterministic cross-provider rules review."
      />

      <Alert>
        <Info className="size-4" />
        <AlertDescription>
          Findings are produced by the daily rules-review cron. On-demand runs
          stay on the CLI/MCP ops surface (<code>security.review.run</code>) —
          this page lists persisted findings and stages promote/dismiss
          decisions only.
        </AlertDescription>
      </Alert>

      <div className="flex flex-wrap gap-3">
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-44" aria-label="Severity">
            <SelectValue placeholder="All severities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All severities</SelectItem>
            {SEVERITIES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44" aria-label="Status">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            {FINDING_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{(error as Error).message}</AlertDescription>
        </Alert>
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          loading={isLoading}
          emptyIcon={<ShieldCheck size={32} />}
          emptyMessage="No findings match the current filters."
        />
      )}

      <Sheet open={selected !== null} onOpenChange={(open) => !open && closeAll()}>
        <SheetContent className="overflow-y-auto sm:max-w-lg">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>Finding #{selected.id}</SheetTitle>
                <SheetDescription className="flex gap-2">
                  <SeverityBadge severity={selected.severity} />
                  <Badge variant={STATUS_BADGE[selected.status] ?? "secondary"}>
                    {selected.status}
                  </Badge>
                </SheetDescription>
              </SheetHeader>

              <div className="space-y-4 px-4 text-sm">
                <DetailRow label="Message" value={selected.message} />
                <DetailRow label="Remediation" value={selected.remediation || "--"} />
                <DetailRow label="Category" value={selected.category} mono />
                <DetailRow
                  label="Providers"
                  value={selected.provider_types.join(", ") || "--"}
                />
                <DetailRow label="Run" value={selected.run_id} mono />
                {selected.promoted_proposal_id !== null && (
                  <DetailRow
                    label="Staged proposal"
                    value={`#${selected.promoted_proposal_id}`}
                  />
                )}
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">
                    Resource reference
                  </p>
                  <pre className="text-xs bg-muted rounded-md p-2 overflow-x-auto">
                    {JSON.stringify(selected.resource_ref, null, 2)}
                  </pre>
                </div>
              </div>

              {isOperator && (
                <SheetFooter className="flex-row justify-end gap-2">
                  <Button
                    variant="outline"
                    disabled={!canDismiss || dismissMutation.isPending}
                    onClick={() => setConfirmDismiss(true)}
                  >
                    Dismiss
                  </Button>
                  <Button
                    disabled={!canPromote || promoteMutation.isPending}
                    onClick={() => setPromoteOpen(true)}
                  >
                    Promote
                  </Button>
                </SheetFooter>
              )}
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDismiss} onOpenChange={setConfirmDismiss}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Dismiss finding #{selected?.id}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Marks the finding dismissed in the review ledger (audited).
              Promoted findings are refused by the engine.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-1">
            <Label htmlFor="dismiss-note">Note</Label>
            <Textarea
              id="dismiss-note"
              placeholder="Optional note (why this is dismissible)…"
              value={dismissNote}
              onChange={(e) => setDismissNote(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={dismissMutation.isPending}
              onClick={() =>
                selected &&
                dismissMutation.mutate({ id: selected.id, note: dismissNote })
              }
            >
              Confirm dismiss
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {selected && (
        <PromoteDialog
          finding={selected}
          open={promoteOpen}
          onOpenChange={setPromoteOpen}
          pending={promoteMutation.isPending}
          onSubmit={(input) => promoteMutation.mutate(input)}
        />
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <p className={mono ? "font-mono text-xs" : ""}>{value}</p>
    </div>
  );
}

function PromoteDialog({
  finding,
  open,
  onOpenChange,
  pending,
  onSubmit,
}: {
  finding: ReviewFinding;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pending: boolean;
  onSubmit: (input: {
    finding_id: number;
    allocation_id: number;
    proposed_ip?: string;
    proposed_vlan_id?: number;
    proposed_cidr?: string;
    note?: string;
  }) => void;
}) {
  const [allocationId, setAllocationId] = useState("");
  const [proposedIp, setProposedIp] = useState("");
  const [proposedVlan, setProposedVlan] = useState("");
  const [proposedCidr, setProposedCidr] = useState("");
  const [note, setNote] = useState("");

  const allocationValid = /^\d+$/.test(allocationId.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Promote finding #{finding.id}</DialogTitle>
          <DialogDescription>
            Stages a resolution proposal for the referenced allocation. The
            proposal goes through the normal approve→apply pipeline — nothing
            is changed on any provider now.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="promote-allocation-id">Allocation ID *</Label>
            <Input
              id="promote-allocation-id"
              inputMode="numeric"
              value={allocationId}
              onChange={(e) => setAllocationId(e.target.value)}
              placeholder="CIDR allocation the proposal targets"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="promote-ip">Proposed IP</Label>
              <Input
                id="promote-ip"
                value={proposedIp}
                onChange={(e) => setProposedIp(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="promote-vlan">Proposed VLAN</Label>
              <Input
                id="promote-vlan"
                inputMode="numeric"
                value={proposedVlan}
                onChange={(e) => setProposedVlan(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="promote-cidr">Proposed CIDR</Label>
            <Input
              id="promote-cidr"
              value={proposedCidr}
              onChange={(e) => setProposedCidr(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="promote-note">Note</Label>
            <Textarea
              id="promote-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!allocationValid || pending}
            onClick={() =>
              onSubmit({
                finding_id: finding.id,
                allocation_id: Number(allocationId.trim()),
                proposed_ip: proposedIp.trim() || undefined,
                proposed_vlan_id: /^\d+$/.test(proposedVlan.trim())
                  ? Number(proposedVlan.trim())
                  : undefined,
                proposed_cidr: proposedCidr.trim() || undefined,
                note: note.trim() || undefined,
              })
            }
          >
            Stage proposal
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
