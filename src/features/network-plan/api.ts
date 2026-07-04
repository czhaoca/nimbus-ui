import { apiFetch } from "@/lib/api/client";

import type { PlanDiff, PlanTreeNode } from "./types";

export const fetchPlanTree = (provider?: string) => {
  const params = provider ? `?provider_type=${provider}` : "";
  return apiFetch<PlanTreeNode[]>(`/api/network-plan/tree${params}`);
};

export const fetchPlanDiff = () =>
  apiFetch<PlanDiff>("/api/network-plan/diff");

export const updateAllocationStatus = (id: number, status: string) =>
  apiFetch<{ id: number; status: string }>(
    `/api/network-plan/${id}/status`,
    { method: "PATCH", body: JSON.stringify({ status }) },
  );
