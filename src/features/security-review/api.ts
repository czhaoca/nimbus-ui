import { executeOp } from "@/lib/api/ops";

import type {
  DismissResult,
  FindingFilters,
  PromoteInput,
  PromoteResult,
  ReviewFinding,
} from "./types";

// security.review.* has no dedicated REST routes; every op goes through the
// ops bridge (see lib/api/ops.ts). list/show are Tier-1 viewer;
// promote/dismiss are Tier-2 operator → 403 "denied" for viewers.

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
