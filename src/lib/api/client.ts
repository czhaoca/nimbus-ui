import createClient from "openapi-fetch";
import type { paths } from "./schema";
import type {
  Provider,
  ProviderCreate,
  Resource,
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
 * hooks and pages expect. Response bodies are `unknown` in the generated
 * schema (the engine returns untyped dicts), so callers assert T here —
 * path/method/params stay compile-time checked.
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

// Auth
export interface LoginResult {
  access_token: string;
  username: string;
  role: string;
}
export const login = (username: string, password: string) =>
  unwrap<LoginResult>(
    api.POST("/api/v1/auth/login", { body: { username, password } }),
  );
export const getMe = () =>
  unwrap<{ username: string; role: string }>(api.GET("/api/v1/auth/me"));

// Users (admin)
export interface UserOut {
  id: string;
  username: string;
  email: string | null;
  role: string;
  is_active: boolean;
}
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
export interface ProviderHealthResult {
  provider_id: string;
  provider_type: string;
  display_name: string;
  status: "connected" | "degraded" | "down" | "error" | "unknown" | "no_adapter" | string;
  latency_ms: number | null;
  error: string | null;
  checked_at: string;
}
export const checkProviderHealth = (providerId?: string) =>
  unwrap<ProviderHealthResult[]>(
    api.GET("/api/v1/providers/health/check", {
      params: { query: providerId ? { provider_id: providerId } : {} },
    }),
  );

// Per-provider usage quota (resource count + budget utilization)
export interface ProviderQuota {
  provider_id: string;
  resources: { count: number };
  budget: {
    monthly_limit: number | null;
    current_spend: number;
    utilization: number | null;
  };
  warnings: string[];
}
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
export interface ResourceDependencies {
  resource_id: string;
  depends_on: { id: string; target_id: string; type: string }[];
  depended_by: { id: string; source_id: string; type: string }[];
}
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
export interface ActivityItem {
  id: string;
  type: string;
  summary: string;
  timestamp: string | null;
  source: "audit" | "webhook" | string;
  details: Record<string, unknown>;
}
// /api/v1/activity is untyped in the vendored schema; this DEC-4 shim
// mirrors activity.py::get_activity_feed — envelope lines 74-79, audit
// items 29-42, webhook items 51-65 (nimbus-ui#29).
export interface ActivityFeedResponse {
  total: number;
  page: number;
  per_page: number;
  items: ActivityItem[];
}

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

// Rate limits — the schema component IS the full engine shape (2 fields;
// verified against engine settings.py in nimbus-ui#15): alias per DEC-4.
export const getRateLimits = () =>
  unwrap<RateLimitConfig>(api.GET("/api/v1/settings/rate-limits"));
export const saveRateLimits = (config: RateLimitConfig) =>
  unwrap<RateLimitConfig>(
    api.POST("/api/v1/settings/rate-limits", { body: config }),
  );

// Alert Config — full contract shape (AlertConfigUpdate); a partial PUT
// would reset the omitted channels to their engine defaults.
export interface AlertConfigData {
  webhooks: string[];
  slack_webhooks: string[];
  discord_webhooks: string[];
  email_to: string[];
  email_from: string;
  smtp_host: string;
  smtp_port: number;
  enabled_channels: string[];
}
export const getAlertConfig = () =>
  unwrap<AlertConfigData>(api.GET("/api/v1/alerts/config"));
export const updateAlertConfig = (data: AlertConfigData) =>
  unwrap<AlertConfigData>(api.PUT("/api/v1/alerts/config", { body: data }));
export const testAlert = () =>
  unwrap<Record<string, unknown>>(
    api.POST("/api/v1/alerts/test", {
      body: { alert_type: "test", title: "Test alert from Nimbus" },
    }),
  );

// Provider resilience status
export interface ProviderStatus {
  provider_id: string;
  provider_type: string;
  display_name: string;
  circuit_breaker: { state: string; failure_count: number; failure_threshold: number };
  recent_errors: number;
  status: "connected" | "degraded" | "down" | "unknown";
}
export const getProviderStatus = () =>
  unwrap<{ providers: ProviderStatus[]; total_errors: number }>(
    api.GET("/api/v1/providers/status/resilience"),
  );

// Error log
export interface ErrorEntry {
  timestamp: number;
  source: string;
  error_type: string;
  message: string;
  context: Record<string, unknown>;
}
export const getErrors = (source?: string, limit?: number) =>
  unwrap<{ errors: ErrorEntry[]; total: number }>(
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

// Spending History (for charts)
export interface SpendingHistoryEntry {
  date: string;
  total: number;
  [provider: string]: string | number;
}
export const getSpendingHistory = (days = 30, providerId?: string) =>
  unwrap<{ period_days: number; data: SpendingHistoryEntry[] }>(
    api.GET("/api/v1/budget/spending-history", {
      params: {
        query: { days, ...(providerId ? { provider_id: providerId } : {}) },
      },
    }),
  );

// Provider Comparison
export interface ProviderComparisonEntry {
  provider_id: string;
  provider_type: string;
  display_name: string;
  resource_count: number;
  monthly_cost_estimate: number;
  cost_per_resource: number;
  latest_spending: number;
  currency: string;
}
export const getProviderComparison = () =>
  unwrap<{ providers: ProviderComparisonEntry[] }>(
    api.GET("/api/v1/budget/provider-comparison"),
  );

// Anomalies
export interface SpendingAnomaly {
  date: string;
  amount: number;
  rolling_avg: number;
  stddev: number;
  threshold: number;
  deviation: number;
}
export const getSpendingAnomalies = (days = 90, sigma = 2.0) =>
  unwrap<{ anomalies: SpendingAnomaly[]; count: number }>(
    api.GET("/api/v1/budget/anomalies", {
      params: { query: { days, sigma } },
    }),
  );

// Dashboard Preferences
export interface DashboardWidget {
  id: string;
  visible: boolean;
  order: number;
}
export const getDashboardPreferences = () =>
  unwrap<{ widgets: DashboardWidget[] }>(
    api.GET("/api/v1/dashboard/preferences"),
  );
export const saveDashboardPreferences = (prefs: { widgets: DashboardWidget[] }) =>
  unwrap<{ widgets: DashboardWidget[] }>(
    api.PUT("/api/v1/dashboard/preferences", { body: prefs }),
  );
