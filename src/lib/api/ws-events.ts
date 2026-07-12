/**
 * /ws event types — hand-mirrors the committed contract catalog
 * `contracts/ws-events.json` (czhaoca/nimbus, contract_version 1.6.0;
 * tag `contract-v1.6.0` pending at re-cite time, #41). The catalog has
 * no TS codegen yet, so keep this file 1:1 with the artifact; the
 * backend's produced-event tests pin the artifact to the producers, and
 * its emit-via-model machinery (czhaoca/nimbus#311) makes uncataloged
 * emissions impossible engine-side. Recorded upgrade if WS drift ever
 * bites: vendor ws-events.json and schema-validate these hand types —
 * not built until it pays.
 */

export type WsResourceChangeEvent = {
  type: "resource_change";
  action: string;
  resource_id: string;
  provider_id: string;
} & Record<string, unknown>;

// `display_name`/`status` are model-defaulted ("" when unset) and always
// serialized (czhaoca/nimbus#311) — typed required; "" means "none".
export type WsIncidentEvent = {
  type: "incident";
  action: "health_failure" | "health_recovery";
  resource_id: string;
  provider_id: string;
  display_name: string;
  status: string;
} & Record<string, unknown>;

// A feed-worthy notification was recorded (GAP-037) — mirrors one item of
// GET /api/v1/notifications/feed; `id`/`source` reference the persisted
// row. `source` is model-defaulted (""), `timestamp` nullable.
export type WsNotificationEvent = {
  type: "notification";
  id: string;
  category: "incident" | "activity";
  severity: string;
  message: string;
  timestamp: string | null;
  source: string;
} & Record<string, unknown>;

export type WsPongEvent = { type: "pong" };

export type WsEvent =
  | WsResourceChangeEvent
  | WsIncidentEvent
  | WsNotificationEvent
  | WsPongEvent;
