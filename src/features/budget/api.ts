import { api, getAuditLogs, unwrap } from "@/lib/api/client";
import { executeOp } from "@/lib/api/ops";
import type { ActionLogEntry, BillingConfig } from "@/lib/types";

import type { BudgetDigest } from "./types";

// budget.digest is a Tier-1 viewer op with no dedicated REST route —
// reachable via the ops bridge. It composes the same inputs the engine's
// digest uses (budget statuses + running-resource count); this ticket only
// renders it (sending via POST /api/v1/alerts/digest is a mutation, out of
// the read-only scope).
export const fetchBudgetDigest = async (): Promise<BudgetDigest> => {
  const env = await executeOp<BudgetDigest>("budget.digest");
  return env.data;
};

export const fetchBillingConfigs = () =>
  unwrap<BillingConfig[]>(api.GET("/api/v1/billing-configs"));

// Budget enforcement writes ActionLog rows as "budget_monitor"; /api/v1/audit
// has no initiated_by filter, so filter client-side over the recent window.
// Honest cap: enforcement older than the newest `limit` audit rows is only
// visible on /audit.
export const fetchEnforcementHistory = async (
  limit = 100,
): Promise<ActionLogEntry[]> => {
  const logs = await getAuditLogs({ limit });
  return logs.filter((l) => l.initiated_by === "budget_monitor");
};
