import { api, unwrap } from "./client";

// Transport envelope of POST /api/v1/ops/{op_id} (op errors are raised to
// HTTP 4xx by the engine, so a 200 envelope always carries success data).
// action_log_id is the ActionLog row's string uuid (ActionOut.id;
// engine DryrunResult.action_log_id: str | None) — nimbus-ui#16.
export interface OpEnvelope<T> {
  status: string;
  message: string;
  data: T;
  action_log_id: string | null;
}

// Ops-registry bridge: ops without dedicated REST routes are dispatched via
// the schema-present POST /api/v1/ops/{op_id}. The registry enforces the
// tier gate (403 "denied" below the op's required role) and writes the
// audit row.
export const executeOp = <T>(opId: string, body: Record<string, unknown> = {}) =>
  unwrap<OpEnvelope<T>>(
    api.POST("/api/v1/ops/{op_id}", {
      params: { path: { op_id: opId } },
      body,
    }),
  );
