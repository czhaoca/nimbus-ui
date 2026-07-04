"use client";

import { DollarSign, AlertTriangle, ShieldCheck, Zap } from "lucide-react";
import type { BudgetStatus } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Props {
  statuses: BudgetStatus[];
  onEnforce: () => void;
  enforcing: boolean;
}

const STATUS_BADGE: Record<string, "default" | "secondary" | "destructive"> = {
  ok: "default",
  warning: "secondary",
  exceeded: "destructive",
};

const STATUS_ICON: Record<string, typeof ShieldCheck> = {
  ok: ShieldCheck,
  warning: AlertTriangle,
  exceeded: AlertTriangle,
};

export function BudgetOverview({ statuses, onEnforce, enforcing }: Props) {
  if (statuses.length === 0) {
    return (
      <div className="flex items-center gap-2 p-4 text-muted-foreground text-sm">
        <DollarSign className="size-5" />
        <span>No budget rules configured. Add one to start tracking spending.</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {statuses.map((bs, i) => {
        const Icon = STATUS_ICON[bs.status] ?? ShieldCheck;
        const pct = Math.min(bs.utilization * 100, 100);

        return (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Icon className="size-4 text-muted-foreground" />
                <span className="text-sm font-medium flex-1">{bs.provider_id ?? "Global"}</span>
                <Badge variant={STATUS_BADGE[bs.status] ?? "default"} className="text-xs">
                  {bs.status}
                </Badge>
                <span className="text-xs text-muted-foreground">{bs.period}</span>
              </div>
              <Progress value={pct} className="h-2 mb-2" />
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium">${bs.total_spent.toFixed(2)}</span>
                <span className="text-muted-foreground">/ ${bs.monthly_limit.toFixed(2)}</span>
                <span className="text-muted-foreground ml-auto">{(bs.utilization * 100).toFixed(0)}%</span>
              </div>
              {(bs.alerts ?? []).length > 0 && (
                <div className="mt-2 space-y-1">
                  {(bs.alerts ?? []).map((a, j) => (
                    <p key={j} className="text-xs text-warning">{a}</p>
                  ))}
                </div>
              )}
              {bs.status === "exceeded" && bs.action_on_exceed !== "alert" && (
                <div className="mt-2 flex items-center gap-1 text-xs text-warning">
                  <Zap className="size-3" />
                  <span>Auto-action: {bs.action_on_exceed.replace(/_/g, " ")}</span>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {statuses.some((s) => s.status === "exceeded") && (
        <Button variant="destructive" className="gap-2" onClick={onEnforce} disabled={enforcing}>
          <Zap className="size-4" />
          {enforcing ? "Enforcing..." : "Run Budget Enforcement"}
        </Button>
      )}
    </div>
  );
}
