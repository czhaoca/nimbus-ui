"use client";

import { useQuery } from "@tanstack/react-query";
import { Info, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { useBudgetRules, useProviders } from "@/lib/hooks/useApi";
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

import {
  fetchBillingConfigs,
  fetchBudgetDigest,
  fetchEnforcementHistory,
} from "./api";
import type { BillingConfig } from "@/lib/types";

const STATUS_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  ok: "default",
  warning: "outline",
  exceeded: "destructive",
};

const usd = (n: number) => `$${n.toFixed(2)}`;

export function BudgetGuardianPage() {
  const providersQuery = useProviders();
  const providers = providersQuery.data;
  const digestQuery = useQuery({
    queryKey: ["budget-digest"],
    queryFn: fetchBudgetDigest,
    refetchInterval: 60_000,
  });
  const rulesQuery = useBudgetRules();
  const configsQuery = useQuery({
    queryKey: ["billing-configs"],
    queryFn: fetchBillingConfigs,
  });
  const enforcementQuery = useQuery({
    queryKey: ["budget-enforcement"],
    queryFn: () => fetchEnforcementHistory(),
  });

  const providerName = (id: string | null) => {
    if (id === null) return "Global";
    return providers?.find((p) => p.id === id)?.display_name ?? id;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Budget Guardian"
        description="Read-only view of budget digests, guardian rules, provider billing polls, and enforcement."
      />

      {/* Read-only per issue #8: budget-rule ops carry a tier asymmetry
          (nimbus GAP-029), so no mutation UX until that settles. Guardian
          poll/hard-stop triggers and digest delivery are engine-side. */}
      <Alert>
        <Info className="size-4" />
        <AlertDescription>
          Rule editing stays in the CLI until the budget-op tier asymmetry
          settles (GAP-029). The digest below is rendered live; scheduled
          delivery and guardian poll/hard-stop triggers run engine-side.
          Providers whose billing adapters cannot report spend yet show{" "}
          <em>Unknown</em> rather than a fabricated $0.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Digest</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {digestQuery.isLoading ? (
            <Skeleton className="h-32 w-full" />
          ) : digestQuery.error ? (
            <Alert variant="destructive">
              <AlertDescription>
                {(digestQuery.error as Error).message}
              </AlertDescription>
            </Alert>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Running resources:{" "}
                <span className="text-foreground font-semibold">
                  {digestQuery.data?.active_resources ?? 0}
                </span>
              </p>
              {digestQuery.data && digestQuery.data.statuses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No active budget rules — nothing to digest.
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Scope</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Spent</TableHead>
                      <TableHead>Utilization</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>On exceed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {digestQuery.data?.statuses.map((s, i) => (
                      <TableRow key={`${s.provider_id ?? "global"}-${i}`}>
                        <TableCell>{providerName(s.provider_id)}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {s.period}
                        </TableCell>
                        <TableCell>
                          {usd(s.total_spent)} of {usd(s.monthly_limit)}
                          {s.alerts?.[0] && (
                            <p className="text-xs text-muted-foreground">
                              {s.alerts[0]}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>{Math.round(s.utilization * 100)}%</TableCell>
                        <TableCell>
                          <Badge variant={STATUS_BADGE[s.status] ?? "secondary"}>
                            {s.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {s.action_on_exceed}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Guardian Rules</CardTitle>
        </CardHeader>
        <CardContent>
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
              No budget rules configured. Add them via the CLI (`nimbus budget
              add`).
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scope</TableHead>
                  <TableHead>Monthly limit</TableHead>
                  <TableHead>Alert threshold</TableHead>
                  <TableHead>On exceed</TableHead>
                  <TableHead>Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rulesQuery.data.map((rule) => (
                  <TableRow key={rule.id}>
                    <TableCell>{providerName(rule.provider_id ?? null)}</TableCell>
                    <TableCell>{usd(rule.monthly_limit)}</TableCell>
                    <TableCell>
                      {Math.round(rule.alert_threshold * 100)}%
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {rule.action_on_exceed}
                    </TableCell>
                    <TableCell>
                      <Badge variant={rule.is_active ? "default" : "secondary"}>
                        {rule.is_active ? "Yes" : "No"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Provider Billing</CardTitle>
        </CardHeader>
        <CardContent>
          {/* This panel structurally depends on the providers list too, so
              both queries gate its skeleton/error states. */}
          {configsQuery.isLoading || providersQuery.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : configsQuery.error || providersQuery.error ? (
            <Alert variant="destructive">
              <AlertDescription>
                {((configsQuery.error ?? providersQuery.error) as Error).message}
              </AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Provider</TableHead>
                  <TableHead>Billing</TableHead>
                  <TableHead>Last poll</TableHead>
                  <TableHead>Reported cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(providers ?? []).map((provider) => {
                  const cfg = configsQuery.data?.find(
                    (c) => c.provider_id === provider.id,
                  );
                  return (
                    <TableRow key={provider.id}>
                      <TableCell>
                        {provider.display_name}
                        <p className="text-xs text-muted-foreground font-mono">
                          {provider.provider_type}
                        </p>
                      </TableCell>
                      <TableCell>
                        <BillingStateBadge cfg={cfg} />
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {cfg?.last_poll_at
                          ? new Date(cfg.last_poll_at).toLocaleString()
                          : "--"}
                      </TableCell>
                      <TableCell>
                        <CostCell cfg={cfg} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Enforcement History</CardTitle>
        </CardHeader>
        <CardContent>
          {enforcementQuery.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : enforcementQuery.error ? (
            <Alert variant="destructive">
              <AlertDescription>
                {(enforcementQuery.error as Error).message}
              </AlertDescription>
            </Alert>
          ) : !enforcementQuery.data || enforcementQuery.data.length === 0 ? (
            <div className="flex flex-col items-center py-8 text-muted-foreground">
              <ShieldCheck size={32} className="mb-2 opacity-40" />
              <p className="text-sm">
                No budget enforcement actions recorded in the recent audit
                window.
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Resource</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reason</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enforcementQuery.data.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(entry.created_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{entry.action_type}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {entry.resource_id ?? "--"}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            entry.status === "error" ? "destructive" : "secondary"
                          }
                        >
                          {entry.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs">
                        {typeof entry.details?.reason === "string"
                          ? entry.details.reason
                          : "--"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <p className="text-xs text-muted-foreground mt-2">
                Filtered from the most recent audit entries — the full trail
                lives in the Audit Log.
              </p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function BillingStateBadge({ cfg }: { cfg?: BillingConfig }) {
  if (!cfg) return <Badge variant="outline">Not configured</Badge>;
  return (
    <Badge variant={cfg.billing_enabled ? "default" : "secondary"}>
      {cfg.billing_enabled ? "Enabled" : "Disabled"}
    </Badge>
  );
}

// Honest-unknown rule (issue #8 / GAP-032): last_amount defaults to 0 before
// any successful poll, so it is only rendered once last_poll_at proves a poll
// happened — otherwise the state is Unknown, never a fabricated $0.
function CostCell({ cfg }: { cfg?: BillingConfig }) {
  if (!cfg || !cfg.last_poll_at) {
    return (
      <Badge variant="outline" className="text-amber-400 border-amber-400/40">
        Unknown
      </Badge>
    );
  }
  return <span>{usd(cfg.last_amount)}</span>;
}
