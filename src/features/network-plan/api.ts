import { api, unwrap } from "@/lib/api/client";

import type { PlanDiff, PlanTreeNode } from "./types";

export const fetchPlanTree = (provider?: string) =>
  unwrap<PlanTreeNode[]>(
    api.GET("/api/v1/network-plan/tree", {
      params: { query: provider ? { provider_type: provider } : {} },
    }),
  );

export const fetchPlanDiff = () =>
  unwrap<PlanDiff>(api.GET("/api/v1/network-plan/diff"));

export const updateAllocationStatus = (id: number, status: string) =>
  unwrap<{ id: number; status: string }>(
    api.PATCH("/api/v1/network-plan/{allocation_id}/status", {
      params: { path: { allocation_id: id } },
      body: { status },
    }),
  );
