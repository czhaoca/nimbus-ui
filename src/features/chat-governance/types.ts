/**
 * Chat-governance types (#25).
 *
 * The /api/v1/chat/* responses are untyped in the vendored schema
 * ({[key: string]: unknown} — schema.d.ts:8427-8459), so per DEC-4 these
 * are hand-written shims citing the engine serializer they mirror. When
 * the backend types them in the contract, alias them like lib/types.
 */

/**
 * One approval row — mirrors
 * engine/nimbus/domains/operations/chat_approvals.py::_item (lines 49-62):
 * the engine sends `approval_id` (the contract key) plus a legacy
 * duplicate `id`, and ISO datetime strings that may be null.
 */
export interface ChatApproval {
  approval_id: string;
  id: string;
  operation: string;
  requested_by: string;
  created_at: string | null;
  expires_at: string | null;
  status: string;
}

/**
 * GET /api/v1/chat/approvals envelope — `{items: [...]}` per
 * chat_approvals.py::list_approvals (line 216-223).
 */
export interface ApprovalsListResponse {
  items: ChatApproval[];
}

/**
 * Channel mappings for one platform — mirrors
 * engine/nimbus/domains/operations/chat_config.py::_serialize (lines
 * 42-58). The engine returns this same shape with nulls/empty strings
 * when the platform row is unconfigured — that is a normal state, not
 * an error.
 */
export interface ChatChannelsConfig {
  feed_channel_id: string | null;
  briefing_channel_id: string | null;
  incidents_channel_id: string | null;
  approvals_channel_id: string | null;
  provider_filter: string;
  env_filter: string;
}

/**
 * One chat user's resolved Nimbus role — mirrors
 * engine/nimbus/domains/operations/chat_roles_api.py::get_chat_role
 * (lines 22-36). Unmapped users resolve to the "viewer" floor
 * (_chat_gates.py::resolve_platform_role, lines 43-50) — the API never
 * 404s, so a viewer result is not proof of an explicit mapping.
 */
export interface ChatRoleMapping {
  platform: string;
  platform_user_id: string;
  role: string;
}

/**
 * Platforms with a registered chat sink —
 * engine/nimbus/services/chat_sinks/{discord,slack,synology,telegram,whatsapp}_feed.py.
 */
export const CHAT_PLATFORMS = [
  "discord",
  "slack",
  "synology",
  "telegram",
  "whatsapp",
] as const;
export type ChatPlatform = (typeof CHAT_PLATFORMS)[number];
