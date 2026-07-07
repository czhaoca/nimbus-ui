/**
 * /ws event types — hand-mirrors the committed contract `contracts/ws-events.json`
 * (#245/#248; source models: engine/nimbus/domains/ws/events.py). The catalog
 * has no TS codegen yet, so keep this file 1:1 with the artifact; the
 * backend's produced-event tests pin the artifact to the producers.
 */

export type WsResourceChangeEvent = {
  type: "resource_change";
  action: string;
  resource_id: string;
  provider_id: string;
} & Record<string, unknown>;

export type WsIncidentEvent = {
  type: "incident";
  action: "health_failure" | "health_recovery";
  resource_id: string;
  provider_id: string;
  display_name?: string;
  status?: string;
} & Record<string, unknown>;

export type WsPongEvent = { type: "pong" };

export type WsEvent = WsResourceChangeEvent | WsIncidentEvent | WsPongEvent;
