import createClient from "openapi-fetch";
import type { components, paths } from "./schema";
import type {
  Provider,
  ProviderCreate,
  Resource,
  ResourceUpdate,
  ActionResult,
  SyncResult,
  HealthStatus,
  ResourceAction,
  BudgetRule,
  BudgetRuleCreate,
  BudgetStatus,
  SpendingRecord,
  ActionLogEntry,
  RateLimitConfig,
} from "@/lib/types";

/** Shorthand over the vendored contract components (DEC-4 alias style). */
type Schemas = components["schemas"];

let _authToken: string | null = null;

/** Set the bearer token for all subsequent requests. */
export function setAuthToken(token: string | null) {
  _authToken = token;
}

/**
 * Path-typed client over the vendored /api/v1 contract (ADR-0008/DEC-2).
 * Every request goes through the Next.js server-side rewrite proxy; a
 * nonexistent path or method is a compile error via `paths`.
 */
export const api = createClient<paths>({ baseUrl: "" });

api.use({
  onRequest({ request }) {
    if (_authToken) request.headers.set("Authorization", `Bearer ${_authToken}`);
    return request;
  },
});

/**
 * Unwrap an openapi-fetch result into the legacy throw-on-error shape the
 * hooks and pages expect. Most response bodies are component-typed in the
 * vendored schema; T is the matching schema alias there, and a hand
 * assertion only on the few paths the schema still types as `unknown`.
 */
export async function unwrap<T>(
  result: Promise<{ data?: unknown; error?: unknown; response: Response }>,
): Promise<T> {
  const { data, error, response } = await result;
  if (error !== undefined || !response.ok) {
    const detail = (error as { detail?: string } | undefined)?.detail;
    throw new Error(detail ?? `HTTP ${response.status}`);
  }
  return data as T;
}

// Health — endpoint is at root, outside the versioned contract
export const getHealth = async (): Promise<HealthStatus> => {
  const r = await fetch("/health");
  if (!r.ok) throw new Error(`Health check failed: ${r.status}`);
  return r.json() as Promise<HealthStatus>;
};

// Auth — typed engine-side all along (TokenResponse component): alias per DEC-4.
export type LoginResult = Schemas["TokenResponse"];
export const login = (username: string, password: string) =>
  unwrap<LoginResult>(
    api.POST("/api/v1/auth/login", { body: { username, password } }),
  );
export const getMe = () =>
  unwrap<{ username: string; role: string }>(api.GET("/api/v1/auth/me"));

// Users (admin)
export type UserOut = Schemas["UserOut"];
export const listUsers = () =>
  unwrap<UserOut[]>(api.GET("/api/v1/auth/users"));
export const createUser = (data: {
  username: string;
  password: string;
  role: string;
  email?: string | null;
}) => unwrap<UserOut>(api.POST("/api/v1/auth/users", { body: data }));
export const updateUser = (
  userId: string,
  data: { email?: string | null; is_active?: boolean | null; password?: string | null; role?: string | null },
) =>
  unwrap<UserOut>(
    api.PUT("/api/v1/auth/users/{user_id}", {
      params: { path: { user_id: userId } },
      body: data,
    }),
  );
export const deleteUser = (userId: string) =>
  unwrap<void>(
    api.DELETE("/api/v1/auth/users/{user_id}", {
      params: { path: { user_id: userId } },
    }),
  );

// Providers
export const listProviders = () =>
  unwrap<Provider[]>(api.GET("/api/v1/providers"));
export const fetchProviders = listProviders;
export const getProvider = (id: string) =>
  unwrap<Provider>(
    api.GET("/api/v1/providers/{provider_id}", {
      params: { path: { provider_id: id } },
    }),
  );
export const createProvider = (data: ProviderCreate) =>
  unwrap<Provider>(api.POST("/api/v1/providers", { body: data }));
export const addProvider = createProvider;
export const deleteProvider = (id: string) =>
  unwrap<void>(
    api.DELETE("/api/v1/providers/{provider_id}", {
      params: { path: { provider_id: id } },
    }),
  );

// Provider health (live probe; optionally scoped to one provider)
export type ProviderHealthResult = Schemas["ProviderHealthOut"];
export const checkProviderHealth = (providerId?: string) =>
  unwrap<ProviderHealthResult[]>(
    api.GET("/api/v1/providers/health/check", {
      params: { query: providerId ? { provider_id: providerId } : {} },
    }),
  );

// Per-provider usage quota (resource count + budget utilization)
export type ProviderQuota = Schemas["ProviderQuotaOut"];
export const getProviderQuota = (providerId: string) =>
  unwrap<ProviderQuota>(
    api.GET("/api/v1/providers/{provider_id}/quota", {
      params: { path: { provider_id: providerId } },
    }),
  );

// Resources
export const listResources = (providerId?: string) =>
  unwrap<Resource[]>(
    api.GET("/api/v1/resources", {
      params: { query: providerId ? { provider_id: providerId } : {} },
    }),
  );
export const getResource = (id: string) =>
  unwrap<Resource>(
    api.GET("/api/v1/resources/{resource_id}", {
      params: { path: { resource_id: id } },
    }),
  );
export const performAction = (id: string, action: ResourceAction) =>
  unwrap<ActionResult>(
    api.POST("/api/v1/resources/{resource_id}/action", {
      params: { path: { resource_id: id } },
      body: { action },
    }),
  );
export const syncResources = (providerId: string) =>
  unwrap<SyncResult>(
    api.POST("/api/v1/resources/sync/{provider_id}", {
      params: { path: { provider_id: providerId } },
    }),
  );
export const syncProvider = syncResources;
export const searchResources = (q: string) =>
  unwrap<
    {
      id: string;
      provider_id: string;
      resource_type: string;
      display_name: string;
      status: string;
      tags: Record<string, string> | null;
    }[]
  >(api.GET("/api/v1/resources/search", { params: { query: { q } } }));
// Body is the raw tags dict (the engine merges it with existing tags);
// the legacy client wrapped it in {tags} and silently set a "tags" key.
export const updateResourceTags = (id: string, tags: Record<string, unknown>) =>
  unwrap<{ id: string; tags: Record<string, unknown> }>(
    api.PUT("/api/v1/resources/{resource_id}/tags", {
      params: { path: { resource_id: id } },
      body: tags,
    }),
  );
// Full resource update (#38) — fully typed end to end (ResourceUpdate →
// ResourceOut), unlike the logs/metrics paths; no hand-typing needed.
export const updateResource = (id: string, body: ResourceUpdate) =>
  unwrap<Resource>(
    api.PUT("/api/v1/resources/{resource_id}", {
      params: { path: { resource_id: id } },
      body,
    }),
  );
export type ResourceDependencies = Schemas["ResourceDependenciesOut"];
export const getResourceDependencies = (id: string) =>
  unwrap<ResourceDependencies>(
    api.GET("/api/v1/resources/{resource_id}/dependencies", {
      params: { path: { resource_id: id } },
    }),
  );

// Budget Rules
export const listBudgetRules = () =>
  unwrap<BudgetRule[]>(
    api.GET("/api/v1/budget/rules", {
      params: { query: { active_only: false } },
    }),
  );
export const createBudgetRule = (data: BudgetRuleCreate) =>
  unwrap<BudgetRule>(api.POST("/api/v1/budget/rules", { body: data }));
export const deleteBudgetRule = (id: string) =>
  unwrap<void>(
    api.DELETE("/api/v1/budget/rules/{rule_id}", {
      params: { path: { rule_id: id } },
    }),
  );

// Budget Status & Spending
export const getBudgetStatus = () =>
  unwrap<BudgetStatus[]>(api.GET("/api/v1/budget/status"));
export const listSpending = (providerId?: string) =>
  unwrap<SpendingRecord[]>(
    api.GET("/api/v1/budget/spending", {
      params: { query: providerId ? { provider_id: providerId } : {} },
    }),
  );
export const enforceBudget = () =>
  unwrap<{ period: string; actions_taken: number; details: unknown[] }>(
    api.POST("/api/v1/budget/enforce"),
  );
export const syncSpending = () =>
  unwrap<{ synced: number }>(api.POST("/api/v1/budget/sync-spending"));

// Orchestration
export const orchestrateLockdown = (providerId: string) =>
  unwrap<{ stopped: number; skipped: number; steps: unknown[] }>(
    api.POST("/api/v1/orchestrate/lockdown", {
      body: { provider_id: providerId },
    }),
  );

// Action Logs
export const getActionLogs = (resourceId: string) =>
  unwrap<ActionLogEntry[]>(
    api.GET("/api/v1/resources/{resource_id}/logs", {
      params: { path: { resource_id: resourceId } },
    }),
  );

// Resource utilization metrics (#37) — unknown-typed path; the hand-typed
// response shape lives with its feature (DEC-4 exception, cites the engine
// serializer there). Type-only import: no runtime edge into features/.
export const getResourceMetrics = (resourceId: string, hours = 24) =>
  unwrap<import("@/features/resource-detail/types").ResourceMetrics>(
    api.GET("/api/v1/resources/{resource_id}/metrics", {
      params: { path: { resource_id: resourceId }, query: { hours } },
    }),
  );

// Audit Log (global)
export const getAuditLogs = (params?: {
  provider_id?: string;
  action_type?: string;
  limit?: number;
}) =>
  unwrap<ActionLogEntry[]>(
    api.GET("/api/v1/audit", { params: { query: params ?? {} } }),
  );

// Activity feed (merged audit + webhook events)
export type ActivityItem = Schemas["ActivityItemOut"];
export type ActivityFeedResponse = Schemas["ActivityFeedOut"];

export const getActivityFeed = (params?: {
  source?: "audit" | "webhook";
  page?: number;
  per_page?: number;
}) =>
  unwrap<ActivityFeedResponse>(
    api.GET("/api/v1/activity", { params: { query: params ?? {} } }),
  );

// Settings
export const getSettings = () =>
  unwrap<Record<string, string>>(api.GET("/api/v1/settings"));
export const updateSetting = (key: string, value: string) =>
  unwrap<{ key: string; value: string }>(
    api.PUT("/api/v1/settings/{key}", {
      params: { path: { key } },
      body: { value },
    }),
  );

// Rate limits — the schema component IS the full contract shape (2 fields;
// nimbus-ui#15): alias per DEC-4.
export const getRateLimits = () =>
  unwrap<RateLimitConfig>(api.GET("/api/v1/settings/rate-limits"));
export const saveRateLimits = (config: RateLimitConfig) =>
  unwrap<RateLimitConfig>(
    api.POST("/api/v1/settings/rate-limits", { body: config }),
  );

// Alert Config — the PUT body is always the full shape (AlertConfigUpdate);
// a partial PUT would reset the omitted channels to their engine defaults.
export type AlertConfigData = Schemas["AlertConfigOut"];
export const getAlertConfig = () =>
  unwrap<AlertConfigData>(api.GET("/api/v1/alerts/config"));
// The PUT response is the distinct AlertConfigSavedOut: it echoes the config
// with `email_smtp_host`/`email_smtp_port` (not `smtp_*`) plus `status` — a
// transcribed engine asymmetry the contract preserves; do not "fix" it here.
export const updateAlertConfig = (data: Schemas["AlertConfigUpdate"]) =>
  unwrap<Schemas["AlertConfigSavedOut"]>(
    api.PUT("/api/v1/alerts/config", { body: data }),
  );
export const testAlert = () =>
  unwrap<Record<string, unknown>>(
    api.POST("/api/v1/alerts/test", {
      body: { alert_type: "test", title: "Test alert from Nimbus" },
    }),
  );

// Provider resilience status — `circuit_breaker` is an untyped dict in the
// contract; narrow at the consumer if its fields are ever rendered.
export type ProviderStatus = Schemas["ProviderResilienceItemOut"];
export const getProviderStatus = () =>
  unwrap<Schemas["ProviderResilienceOut"]>(
    api.GET("/api/v1/providers/status/resilience"),
  );

// Error log
export type ErrorEntry = Schemas["ErrorEntryOut"];
export const getErrors = (source?: string, limit?: number) =>
  unwrap<Schemas["ErrorLogOut"]>(
    api.GET("/api/v1/errors", {
      params: {
        query: {
          ...(source ? { source } : {}),
          ...(limit ? { limit } : {}),
        },
      },
    }),
  );
export const clearErrors = () =>
  unwrap<void>(api.DELETE("/api/v1/errors"));

// Webhook events
export interface WebhookEventsQuery {
  direction?: string;
  channel?: string;
  page?: number;
  per_page?: number;
}
export const listWebhookEvents = <T>(params: WebhookEventsQuery) =>
  unwrap<T>(api.GET("/api/v1/webhooks/events", { params: { query: params } }));

// System info
export const getSystemInfo = <T>() => unwrap<T>(api.GET("/api/v1/system/info"));

// Spending History (for charts) — per-provider spend rides the component's
// open index signature (extra keys beyond date/total).
export type SpendingHistoryEntry = Schemas["SpendingHistoryPointOut"];
export const getSpendingHistory = (days = 30, providerId?: string) =>
  unwrap<Schemas["SpendingHistoryOut"]>(
    api.GET("/api/v1/budget/spending-history", {
      params: {
        query: { days, ...(providerId ? { provider_id: providerId } : {}) },
      },
    }),
  );

// Provider Comparison
export type ProviderComparisonEntry = Schemas["ProviderComparisonItemOut"];
export const getProviderComparison = () =>
  unwrap<Schemas["ProviderComparisonOut"]>(
    api.GET("/api/v1/budget/provider-comparison"),
  );

// Anomalies
export type SpendingAnomaly = Schemas["SpendingAnomalyOut"];
export const getSpendingAnomalies = (days = 90, sigma = 2.0) =>
  unwrap<Schemas["SpendingAnomaliesOut"]>(
    api.GET("/api/v1/budget/anomalies", {
      params: { query: { days, sigma } },
    }),
  );

// Dashboard Preferences
export type DashboardWidget = Schemas["DashboardWidgetOut"];
export const getDashboardPreferences = () =>
  unwrap<Schemas["DashboardPreferencesOut"]>(
    api.GET("/api/v1/dashboard/preferences"),
  );
export const saveDashboardPreferences = (prefs: { widgets: DashboardWidget[] }) =>
  unwrap<Schemas["DashboardPreferencesOut"]>(
    api.PUT("/api/v1/dashboard/preferences", { body: prefs }),
  );
