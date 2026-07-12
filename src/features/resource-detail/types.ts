// Contract-typed aliases only (DEC-4): every shape here is schema-derived.
// Hand-written interfaces are allowed solely for unknown-typed responses
// and must cite the engine serializer they mirror.
export type { ActionLogEntry, Resource, ResourceAction } from "@/lib/types";
export type { ResourceDependencies } from "@/lib/api/client";

// Hand-typed (#37, DEC-4 unknown-response exception): GET
// /api/v1/resources/{resource_id}/metrics is `unknown` in the vendored
// schema. Mirrors the engine serializer at czhaoca/nimbus
// nimbus/domains/operations/analytics.py:125-155.
// Metric columns are Float nullable=True (core/models/metrics.py), so null
// means "not captured" — never coerce it to zero.
export interface ResourceMetricPoint {
  timestamp: string;
  cpu_percent: number | null;
  memory_percent: number | null;
  network_in_bytes: number | null;
  network_out_bytes: number | null;
}

export interface ResourceMetrics {
  resource_id: string;
  period_hours: number;
  data: ResourceMetricPoint[];
}
