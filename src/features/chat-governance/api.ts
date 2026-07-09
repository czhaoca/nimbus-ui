import { api, unwrap } from "@/lib/api/client";

import type { ApprovalsListResponse } from "./types";

// GET /api/v1/chat/approvals is require_operator-gated server-side
// (chat_approvals.py::list_approvals) — viewers get a 403 the page
// surfaces honestly. The server defaults the status filter to "pending".
export const fetchApprovals = (status?: string) =>
  unwrap<ApprovalsListResponse>(
    api.GET("/api/v1/chat/approvals", {
      params: { query: status ? { status } : {} },
    }),
  );
