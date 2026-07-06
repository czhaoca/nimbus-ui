import type { BudgetStatus } from "@/lib/types";

// budget.digest op payload — the ops bridge types bodies as unknown, so the
// envelope's data shape is declared here; statuses reuse the schema-aliased
// BudgetStatus rather than a hand copy (DEC-4).
export interface BudgetDigest {
  statuses: BudgetStatus[];
  active_resources: number;
}
