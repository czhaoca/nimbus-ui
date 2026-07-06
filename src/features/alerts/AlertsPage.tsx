"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellOff, Info } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import {
  confirmSilence,
  createAlertRule,
  deleteAlertRule,
  dryrunSilence,
  fetchActiveSilence,
  fetchAlertConfigStatus,
  fetchAlertRules,
} from "./api";
import {
  MAX_SILENCE_MINUTES,
  RULE_METRICS,
  RULE_OPERATORS,
  RULE_SEVERITIES,
  type AlertRule,
  type SilenceDryrun,
} from "./types";

const SEVERITY_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  info: "secondary",
  warning: "outline",
  critical: "destructive",
};

export function AlertsPage() {
  const queryClient = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<AlertRule | null>(null);
  const [silenceOpen, setSilenceOpen] = useState(false);

  // Cosmetic gate only. For the silence op the engine enforces the operator
  // tier server-side (403 "denied"); the rules REST routes have no
  // server-side gate at all — the page copy states that explicitly.
  const { data: me } = useQuery({
    queryKey: ["auth-me"],
    queryFn: getMe,
    staleTime: Infinity,
  });
  const isOperator = me?.role === "operator" || me?.role === "admin";

  const rulesQuery = useQuery({
    queryKey: ["alert-rules"],
    queryFn: fetchAlertRules,
  });
  const configStatusQuery = useQuery({
    queryKey: ["alert-config-status"],
    queryFn: fetchAlertConfigStatus,
  });
  const silenceQuery = useQuery({
    queryKey: ["alert-silence"],
    queryFn: () => fetchActiveSilence(),
    refetchInterval: 60_000,
  });

  const deleteMutation = useMutation({
    mutationFn: (ruleId: string) => deleteAlertRule(ruleId),
    onSuccess: (result) => {
      showToast(`Rule ${result.deleted} deleted`, "success");
      queryClient.invalidateQueries({ queryKey: ["alert-rules"] });
      setDeleteTarget(null);
    },
    onError: (e) => showToast((e as Error).message, "error"),
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts"
        description="Alert rules, notification channel status, and silence windows."
      />

      <Alert>
        <Info className="size-4" />
        <AlertDescription>
          The /api/v1 contract exposes no active-alerts feed or alert-history
          surface (neither REST nor ops-registry), so firing alerts cannot be
          listed here — promoting such a feed is an engine ticket. Rule
          definitions, channel status, and silence windows below are the
          complete engine surface.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Alert Rules</CardTitle>
          {isOperator && (
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              New rule
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {rulesQuery.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : rulesQuery.error ? (
            <Alert variant="destructive">
              <AlertDescription>
                {(rulesQuery.error as Error).message}
              </AlertDescription>
            </Alert>
          ) : !rulesQuery.data || rulesQuery.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No alert rules defined.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Metric</TableHead>
                  <TableHead>Condition</TableHead>
                  <TableHead>Severity</TableHead>
                  <TableHead>Created</TableHead>
                  {isOperator && <TableHead />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {rulesQuery.data.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>{rule.name}</TableCell>
                    <TableCell className="font-mono text-xs">
                      {rule.metric}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {rule.operator} {rule.threshold}
                    </TableCell>
                    <TableCell>
                      <Badge variant={SEVERITY_BADGE[rule.severity] ?? "secondary"}>
                        {rule.severity}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {rule.created_at
                        ? new Date(rule.created_at).toLocaleString()
                        : "--"}
                    </TableCell>
                    {isOperator && (
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDeleteTarget(rule)}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {/* DEC-A panel condition: unlike the silence op, the rules routes
              have no engine-side role enforcement — say so, don't imply it. */}
          <p className="text-xs text-muted-foreground">
            Create/delete gating on this panel is UI-only — the rules endpoints
            carry no server-side role gate (any authenticated API caller can
            modify rules directly). The silence action below is
            engine-enforced.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification Channels</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {configStatusQuery.isLoading ? (
            <Skeleton className="h-16 w-full" />
          ) : configStatusQuery.error ? (
            <Alert variant="destructive">
              <AlertDescription>
                {(configStatusQuery.error as Error).message}
              </AlertDescription>
            </Alert>
          ) : configStatusQuery.data ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={configStatusQuery.data.configured ? "default" : "outline"}
                >
                  {configStatusQuery.data.configured
                    ? "Configured"
                    : "Not configured"}
                </Badge>
                {configStatusQuery.data.enabled_channels.map((c) => (
                  <Badge key={c} variant="secondary">
                    {c}
                  </Badge>
                ))}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Channel</TableHead>
                    <TableHead>Destinations</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Webhooks</TableCell>
                    <TableCell>{configStatusQuery.data.webhook_count}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Slack</TableCell>
                    <TableCell>
                      {configStatusQuery.data.slack_webhook_count}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Discord</TableCell>
                    <TableCell>
                      {configStatusQuery.data.discord_webhook_count}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Email recipients</TableCell>
                    <TableCell>{configStatusQuery.data.email_recipients}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground">
                Channel editing and test alerts live in{" "}
                <Link href="/settings" className="underline">
                  Settings
                </Link>
                {" "}— this panel is read-only.
              </p>
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Silence Window</CardTitle>
          {isOperator && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setSilenceOpen(true)}
            >
              Silence alerts
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-2">
          {silenceQuery.isLoading ? (
            <Skeleton className="h-10 w-full" />
          ) : silenceQuery.error ? (
            <Alert variant="destructive">
              <AlertDescription>
                {(silenceQuery.error as Error).message}
              </AlertDescription>
            </Alert>
          ) : silenceQuery.data ? (
            <div className="flex items-center gap-2 text-sm">
              <BellOff className="size-4 text-amber-400" />
              <span>
                Silenced until{" "}
                <span className="font-semibold">
                  {new Date(silenceQuery.data.until).toLocaleString()}
                </span>
              </span>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Not silenced — alert dispatch is active.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Derived from the audit trail: the latest successful{" "}
            <code>alert_silence</code> entry is the silence record; a newer
            window always supersedes an older one. Silencing is a two-phase
            Tier-2 operation (dryrun preview, then confirm) enforced by the
            engine.
          </p>
        </CardContent>
      </Card>

      {isOperator && (
        <CreateRuleDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={() =>
            queryClient.invalidateQueries({ queryKey: ["alert-rules"] })
          }
        />
      )}

      <AlertDialog
        open={deleteTarget !== null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete rule “{deleteTarget?.name}”?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Removes the rule immediately — alert evaluation stops using it.
              There is no undo; recreate it manually if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending}
              onClick={() =>
                deleteTarget && deleteMutation.mutate(deleteTarget.id)
              }
            >
              Confirm delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {isOperator && (
        <SilenceDialog
          open={silenceOpen}
          onOpenChange={setSilenceOpen}
          onSilenced={() =>
            queryClient.invalidateQueries({ queryKey: ["alert-silence"] })
          }
        />
      )}
    </div>
  );
}

function CreateRuleDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [metric, setMetric] = useState<string>(RULE_METRICS[0]);
  const [operator, setOperator] = useState<string>(RULE_OPERATORS[0]);
  const [threshold, setThreshold] = useState("");
  const [severity, setSeverity] = useState<string>("warning");

  const thresholdValid = /^-?\d+(\.\d+)?$/.test(threshold.trim());
  const valid = name.trim().length > 0 && thresholdValid;

  const reset = () => {
    setName("");
    setMetric(RULE_METRICS[0]);
    setOperator(RULE_OPERATORS[0]);
    setThreshold("");
    setSeverity("warning");
  };

  const createMutation = useMutation({
    mutationFn: createAlertRule,
    onSuccess: (rule) => {
      showToast(`Rule "${rule.name}" created`, "success");
      onCreated();
      reset();
      onOpenChange(false);
    },
    // The engine 400s invalid metric/operator with a detail worth showing.
    onError: (e) => showToast((e as Error).message, "error"),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New alert rule</DialogTitle>
          <DialogDescription>
            Fires when the metric crosses the threshold. Rules cannot be
            edited afterwards (no update endpoint) — delete and recreate.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="rule-name">Name *</Label>
            <Input
              id="rule-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Monthly spend cap"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="rule-metric">Metric</Label>
              <Select value={metric} onValueChange={setMetric}>
                <SelectTrigger id="rule-metric" aria-label="Metric">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RULE_METRICS.map((m) => (
                    <SelectItem key={m} value={m}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label htmlFor="rule-operator">Operator</Label>
              <Select value={operator} onValueChange={setOperator}>
                <SelectTrigger id="rule-operator" aria-label="Operator">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RULE_OPERATORS.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label htmlFor="rule-threshold">Threshold *</Label>
              <Input
                id="rule-threshold"
                inputMode="decimal"
                value={threshold}
                onChange={(e) => setThreshold(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="rule-severity">Severity</Label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger id="rule-severity" aria-label="Severity">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RULE_SEVERITIES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!valid || createMutation.isPending}
            onClick={() =>
              createMutation.mutate({
                name: name.trim(),
                metric,
                operator,
                threshold: Number(threshold.trim()),
                severity,
              })
            }
          >
            Create rule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function SilenceDialog({
  open,
  onOpenChange,
  onSilenced,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSilenced: () => void;
}) {
  const [duration, setDuration] = useState("");
  const [preview, setPreview] = useState<SilenceDryrun | null>(null);

  const minutes = Number(duration.trim());
  const durationValid =
    /^\d+$/.test(duration.trim()) &&
    minutes >= 1 &&
    minutes <= MAX_SILENCE_MINUTES;

  const close = () => {
    setDuration("");
    setPreview(null);
    onOpenChange(false);
  };

  const dryrunMutation = useMutation({
    mutationFn: (m: number) => dryrunSilence(m),
    onSuccess: setPreview,
    onError: (e) => showToast((e as Error).message, "error"),
  });

  const confirmMutation = useMutation({
    mutationFn: (actionLogId: string) => confirmSilence(actionLogId),
    onSuccess: (result) => {
      showToast(
        `Alerts silenced until ${new Date(result.data.until).toLocaleString()}`,
        "success",
      );
      onSilenced();
      close();
    },
    onError: (e) => showToast((e as Error).message, "error"),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(o) : close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Silence alerts</DialogTitle>
          <DialogDescription>
            Suppresses alert dispatch for the given duration (1 minute to one
            week). Two-phase: preview first, then confirm — the window starts
            at confirm time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="silence-duration">Duration (minutes) *</Label>
            <Input
              id="silence-duration"
              inputMode="numeric"
              value={duration}
              onChange={(e) => {
                setDuration(e.target.value);
                // A changed duration invalidates the previewed pending op.
                setPreview(null);
              }}
              placeholder={`1..${MAX_SILENCE_MINUTES}`}
            />
          </div>

          {preview && (
            <div className="rounded-md bg-muted p-3 text-sm space-y-1">
              <p>
                Would silence until{" "}
                <span className="font-semibold">
                  {new Date(preview.data.until).toLocaleString()}
                </span>
                .
              </p>
              {preview.data.existing_until && (
                <p className="text-xs text-muted-foreground">
                  Replaces the current window (until{" "}
                  {new Date(preview.data.existing_until).toLocaleString()}).
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={close}>
            Cancel
          </Button>
          {preview === null ? (
            <Button
              disabled={!durationValid || dryrunMutation.isPending}
              onClick={() => dryrunMutation.mutate(minutes)}
            >
              Preview
            </Button>
          ) : (
            <Button
              disabled={preview.action_log_id === null || confirmMutation.isPending}
              onClick={() =>
                preview.action_log_id &&
                confirmMutation.mutate(preview.action_log_id)
              }
            >
              Confirm silence
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
