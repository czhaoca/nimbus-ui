import { api, unwrap } from "@/lib/api/client";

import type {
  DismissResult,
  FindingFilters,
  OpEnvelope,
  PromoteInput,
  PromoteResult,
  ReviewFinding,
} from "./types";

// security.review.* has no dedicated REST routes; every op is reachable via
// the schema-present ops bridge (POST /api/v1/ops/{op_id}). The registry
// enforces the tier gate (list/show Tier-1 viewer; promote/dismiss Tier-2
// operator → 403 "denied" for viewers) and writes the audit row.
const executeOp = <T>(opId: string, body: Record<string, unknown>) =>
  unwrap<OpEnvelope<T>>(
    api.POST("/api/v1/ops/{op_id}", {
      params: { path: { op_id: opId } },
      body,
    }),
  );

export const fetchFindings = async (
  filters: FindingFilters = {},
): Promise<ReviewFinding[]> => {
  const env = await executeOp<{ findings: ReviewFinding[] }>(
    "security.review.list",
    { ...filters },
  );
  return env.data.findings;
};

export const promoteFinding = async (
  input: PromoteInput,
): Promise<PromoteResult> => {
  const env = await executeOp<PromoteResult>("security.review.promote", {
    ...input,
  });
  return env.data;
};

export const dismissFinding = async (
  findingId: number,
  note = "",
): Promise<DismissResult> => {
  const env = await executeOp<DismissResult>("security.review.dismiss", {
    finding_id: findingId,
    note,
  });
  return env.data;
};
