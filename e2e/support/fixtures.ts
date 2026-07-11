/**
 * Deterministic engine fixtures for the hermetic e2e harness (#31).
 *
 * Shapes are `import type`-checked against the typed client's DEC-4 shims
 * and the vendored-schema aliases — a fixture that drifts from the real
 * contract shape is a compile error, not a silently fabricated test.
 * All values are fictional and fixed (RFC-5737-style hygiene: no live
 * identifiers, no real dates relative to "now").
 */
import type {
  ActivityFeedResponse,
  DashboardWidget,
  ProviderStatus,
  SpendingHistoryEntry,
} from "@/lib/api/client";
import type {
  BudgetStatus,
  HealthStatus,
  Provider,
  Resource,
} from "@/lib/types";

export const FIXTURE_USER = { username: "e2e-viewer", role: "viewer" };

export const HEALTH: HealthStatus = {
  status: "ok",
  app: "nimbus",
  version: "0.0.0-e2e",
};

export const PROVIDERS: Provider[] = [
  {
    id: "oci-demo",
    provider_type: "oci",
    display_name: "OCI Demo",
    region: "us-ashburn-1",
    instance_index: 0,
    is_active: true,
    credentials_configured: true,
    credentials_source: "file",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
  },
  {
    id: "pve-demo",
    provider_type: "proxmox",
    display_name: "Proxmox Demo",
    region: "lab",
    instance_index: 0,
    is_active: true,
    credentials_configured: true,
    credentials_source: "env",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
  },
];

export const RESOURCES: Resource[] = [
  {
    id: "res-0001",
    provider_id: "oci-demo",
    // Deliberately NOT OCID-shaped: the repo-privacy-kit pre-commit hook
    // rejects OCID-pattern strings as potential live target IDs.
    external_id: "e2e-fixture-instance-0001",
    resource_type: "compute",
    display_name: "demo-web-01",
    name_prefix: "demo",
    status: "running",
    protection_level: "standard",
    auto_terminate: false,
    monthly_cost_estimate: 12.5,
    tags: { env: "demo" },
    created_at: "2026-02-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
    last_seen_at: "2026-06-01T00:00:00Z",
  },
  {
    id: "res-0002",
    provider_id: "oci-demo",
    external_id: "e2e-fixture-instance-0002",
    resource_type: "compute",
    display_name: "demo-worker-01",
    name_prefix: "demo",
    status: "stopped",
    protection_level: "standard",
    auto_terminate: false,
    monthly_cost_estimate: 6.25,
    tags: { env: "demo" },
    created_at: "2026-02-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
    last_seen_at: "2026-06-01T00:00:00Z",
  },
  {
    id: "res-0003",
    provider_id: "pve-demo",
    external_id: "vm/100",
    resource_type: "vm",
    display_name: "demo-lab-vm",
    name_prefix: "demo",
    status: "running",
    protection_level: "protected",
    auto_terminate: false,
    monthly_cost_estimate: 0,
    tags: { env: "lab" },
    created_at: "2026-03-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
    last_seen_at: "2026-06-01T00:00:00Z",
  },
];

export const BUDGET_STATUSES: BudgetStatus[] = [
  {
    provider_id: null,
    period: "monthly",
    monthly_limit: 50,
    total_spent: 18.75,
    utilization: 0.375,
    status: "ok",
    action_on_exceed: "alert",
    alerts: [],
  },
  {
    provider_id: "oci-demo",
    period: "monthly",
    monthly_limit: 20,
    total_spent: 18.75,
    utilization: 0.9375,
    status: "warning",
    action_on_exceed: "stop_new",
    alerts: ["approaching monthly limit"],
  },
];

// 30 fixed June-2026 days; values follow a small deterministic formula so
// the chart has visible variation without any randomness.
export const SPENDING_HISTORY: {
  period_days: number;
  data: SpendingHistoryEntry[];
} = {
  period_days: 30,
  data: Array.from({ length: 30 }, (_, i) => {
    const oci = +(2 + (i % 7) * 0.35).toFixed(2);
    const pve = +(1.5 + ((i * 3) % 5) * 0.25).toFixed(2);
    return {
      date: `2026-06-${String(i + 1).padStart(2, "0")}`,
      total: +(oci + pve).toFixed(2),
      "oci-demo": oci,
      "pve-demo": pve,
    };
  }),
};

export const ACTIVITY_FEED: ActivityFeedResponse = {
  total: 4,
  page: 1,
  per_page: 8,
  items: [
    {
      id: "audit-0004",
      type: "resource_action",
      summary: "stop demo-worker-01 (completed)",
      timestamp: "2026-06-30T14:05:00Z",
      source: "audit",
      details: {},
    },
    {
      id: "webhook-0003",
      type: "incident",
      summary: "health_recovery: demo-web-01",
      timestamp: "2026-06-30T09:41:00Z",
      source: "webhook",
      details: {},
    },
    {
      id: "audit-0002",
      type: "provider_sync",
      summary: "sync oci-demo: 2 resources (0 new)",
      timestamp: "2026-06-29T22:10:00Z",
      source: "audit",
      details: {},
    },
    {
      id: "audit-0001",
      type: "budget_enforce",
      summary: "budget enforcement: 0 actions",
      timestamp: "2026-06-29T06:00:00Z",
      source: "audit",
      details: {},
    },
  ],
};

export const PROVIDER_RESILIENCE: {
  providers: ProviderStatus[];
  total_errors: number;
} = {
  providers: [
    {
      provider_id: "oci-demo",
      provider_type: "oci",
      display_name: "OCI Demo",
      circuit_breaker: { state: "closed", failure_count: 0, failure_threshold: 5 },
      recent_errors: 0,
      status: "connected",
    },
    {
      provider_id: "pve-demo",
      provider_type: "proxmox",
      display_name: "Proxmox Demo",
      circuit_breaker: { state: "closed", failure_count: 0, failure_threshold: 5 },
      recent_errors: 0,
      status: "connected",
    },
  ],
  total_errors: 0,
};

// Mirrors DashboardPage's DEFAULT_WIDGETS ids so every section renders.
export const DASHBOARD_PREFERENCES: { widgets: DashboardWidget[] } = {
  widgets: [
    { id: "stats", visible: true, order: 0 },
    { id: "budget", visible: true, order: 2 },
    { id: "costs", visible: true, order: 3 },
    { id: "activity", visible: true, order: 4 },
    { id: "notifications", visible: true, order: 5 },
    { id: "provider-cards", visible: true, order: 6 },
    { id: "resources", visible: true, order: 7 },
  ],
};
