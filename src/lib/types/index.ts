/**
 * API types — thin aliases over the GENERATED contract schema (#248, DEC-4).
 *
 * `../api/schema.d.ts` is a vendored copy of `clients/ts/src/schema.d.ts`
 * (openapi-typescript over docs/openapi.json). Refresh with
 * `pnpm sync-contract`; `pnpm check-contract` fails when it drifts. Never
 * hand-edit shapes that exist in the schema — alias them, so contract breaks
 * surface as compile errors instead of silent drift.
 */

import type { components } from "../api/schema";

type Schemas = components["schemas"];

export type Provider = Schemas["ProviderOut"];
export type ProviderCreate = Schemas["ProviderCreate"];
export type Resource = Schemas["ResourceOut"];
export type ResourceUpdate = Schemas["ResourceUpdate"];
export type SyncResult = Schemas["SyncResult"];
export type BudgetRule = Schemas["BudgetRuleOut"];
export type BudgetRuleCreate = Schemas["BudgetRuleCreate"];
export type SpendingRecord = Schemas["SpendingRecordOut"];
export type BudgetStatus = Schemas["BudgetStatus"];
export type BillingConfig = Schemas["BillingConfigOut"];
export type ActionLogEntry = Schemas["ActionOut"];
export type AlertRuleCreate = Schemas["AlertRuleCreate"];
export type RateLimitConfig = Schemas["RateLimitConfig"];

/** UI-side action verb union (request param, not a response schema). */
export type ResourceAction = "stop" | "start" | "terminate" | "health_check";

/**
 * Hand-written shims — no named component exists in the schema for these
 * (inline/undeclared response models on the backend). Flagged in #248; when
 * the backend types them, alias them like the rest.
 */
export interface ActionResult {
  resource_id: string;
  action: string;
  status: string;
  detail: string;
}

export interface HealthStatus {
  status: string;
  app: string;
  version: string;
}
