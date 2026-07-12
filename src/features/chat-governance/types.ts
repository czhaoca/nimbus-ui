/**
 * Chat-governance types (#25) — aliases over the vendored /api/v1
 * contract components since the chat responses were promoted to named
 * schemas (#40). Semantic notes the shapes cannot carry stay here and
 * cite the contract.
 */

import type { components } from "@/lib/api/schema";

type Schemas = components["schemas"];

/**
 * One approval row. The contract keeps the legacy duplicate `id`
 * alongside `approval_id` (the canonical key), and its ISO datetime
 * strings are nullable.
 */
export type ChatApproval = Schemas["ChatApprovalOut"];

/** GET /api/v1/chat/approvals envelope. */
export type ApprovalsListResponse = Schemas["ChatApprovalsListOut"];

/**
 * Channel mappings for one platform. The contract returns this same
 * shape with nulls/empty strings when the platform row is unconfigured —
 * a normal state, not an error. (The PUT response is the distinct
 * ChatChannelsSavedOut: the same fields plus `status`.)
 */
export type ChatChannelsConfig = Schemas["ChatChannelsOut"];

/**
 * One chat user's resolved Nimbus role. Unmapped users resolve to the
 * "viewer" floor — the API never 404s, so a viewer result is not proof
 * of an explicit mapping.
 */
export type ChatRoleMapping = Schemas["ChatRoleOut"];

/** Platforms with a registered chat sink (sink registry, not a response shape). */
export const CHAT_PLATFORMS = [
  "discord",
  "slack",
  "synology",
  "telegram",
  "whatsapp",
] as const;
export type ChatPlatform = (typeof CHAT_PLATFORMS)[number];
