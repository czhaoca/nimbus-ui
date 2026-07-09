import { api, unwrap } from "@/lib/api/client";

import type {
  ApprovalsListResponse,
  ChatChannelsConfig,
  ChatRoleMapping,
} from "./types";

// GET /api/v1/chat/approvals is require_operator-gated server-side
// (chat_approvals.py::list_approvals) — viewers get a 403 the page
// surfaces honestly. The server defaults the status filter to "pending".
export const fetchApprovals = (status?: string) =>
  unwrap<ApprovalsListResponse>(
    api.GET("/api/v1/chat/approvals", {
      params: { query: status ? { status } : {} },
    }),
  );

// require_viewer-gated (chat_config.py::get_chat_channels) — channel ids
// are non-secret routing config readable by any principal.
export const fetchChannels = (platform: string) =>
  unwrap<ChatChannelsConfig>(
    api.GET("/api/v1/chat/channels/{platform}", {
      params: { path: { platform } },
    }),
  );

// require_operator-gated (chat_roles_api.py::get_chat_role) — viewers get
// the literal 403 detail "Insufficient role" (_chat_gates.py:32).
export const fetchRole = (platform: string, platformUserId: string) =>
  unwrap<ChatRoleMapping>(
    api.GET("/api/v1/chat/roles/{platform}/{platform_user_id}", {
      params: { path: { platform, platform_user_id: platformUserId } },
    }),
  );
