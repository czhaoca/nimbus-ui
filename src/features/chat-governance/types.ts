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
