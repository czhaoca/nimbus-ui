// Finding row shape returned by the security.review.list/show ops (the ops
// bridge types bodies as unknown; fields mirror the engine's _finding_row).
export interface ReviewFinding {
  id: number;
  run_id: string;
  severity: string; // CRITICAL | HIGH | MEDIUM | LOW | INFO
  category: string;
  provider_types: string[];
  resource_ref: Record<string, unknown>;
  message: string;
  remediation: string;
  status: string; // open | acknowledged | dismissed | promoted
  promoted_proposal_id: number | null;
}

export const SEVERITIES = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"] as const;
export const FINDING_STATUSES = [
  "open",
  "acknowledged",
  "dismissed",
  "promoted",
] as const;

// Transport envelope of POST /api/v1/ops/{op_id} (op errors are raised to
// HTTP 4xx by the engine, so a 200 envelope always carries success data).
export interface OpEnvelope<T> {
  status: string;
  message: string;
  data: T;
  action_log_id: number | null;
}

export interface FindingFilters {
  status?: string;
  severity?: string;
  run_id?: string;
  limit?: number;
}

// Mirrors the engine's PromoteParams: promote stages an ADR-0004 resolution
// proposal against an allocation — it never applies anything directly.
export interface PromoteInput {
  finding_id: number;
  allocation_id: number;
  proposed_ip?: string;
  proposed_vlan_id?: number;
  proposed_cidr?: string;
  note?: string;
}

export interface PromoteResult {
  finding_id: number;
  status: string;
  proposal_id: number;
  change_kind: string;
}

export interface DismissResult {
  finding_id: number;
  status: string;
}
