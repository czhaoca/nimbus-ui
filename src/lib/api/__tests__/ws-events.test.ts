/**
 * Pins src/lib/api/ws-events.ts (#23/G3, notification added in #41): the
 * hand-mirrored /ws event catalog (contracts/ws-events.json upstream).
 * Self-contained — never reads the backend checkout. The exhaustiveness
 * switch fails typecheck when a new WsEvent member is added here without
 * handling; the literal discriminants are asserted at runtime against
 * accidental edits.
 */
import { describe, expect, expectTypeOf, it } from "vitest";

import type {
  WsEvent,
  WsIncidentEvent,
  WsNotificationEvent,
  WsPongEvent,
  WsResourceChangeEvent,
} from "@/lib/api/ws-events";

const resourceChange: WsResourceChangeEvent = {
  type: "resource_change",
  action: "stop",
  resource_id: "r-1",
  provider_id: "p-1",
};

// display_name/status are always on the wire (model defaults, #311) —
// required in the type, so fixtures carry them too.
const incident: WsIncidentEvent = {
  type: "incident",
  action: "health_failure",
  resource_id: "r-1",
  provider_id: "p-1",
  display_name: "vm-web-1",
  status: "",
};

const notification: WsNotificationEvent = {
  type: "notification",
  id: "n-1",
  category: "incident",
  severity: "warning",
  message: "vm-web-1 health failure",
  timestamp: null,
  source: "health-monitor",
};

const pong: WsPongEvent = { type: "pong" };

function discriminate(event: WsEvent): string {
  switch (event.type) {
    case "resource_change":
      return event.type;
    case "incident":
      return event.type;
    case "notification":
      return event.type;
    case "pong":
      return event.type;
    default: {
      // A new WsEvent member lands here as non-never → typecheck fails.
      const exhaustive: never = event;
      return exhaustive;
    }
  }
}

describe("ws event discriminants", () => {
  it("pins each event type literal", () => {
    expect(resourceChange.type).toBe("resource_change");
    expect(incident.type).toBe("incident");
    expect(notification.type).toBe("notification");
    expect(pong.type).toBe("pong");
  });

  it("the union switch is exhaustive over exactly the four events", () => {
    expect(
      [resourceChange, incident, notification, pong].map(discriminate),
    ).toEqual(["resource_change", "incident", "notification", "pong"]);
  });

  it("pins the incident action union in both directions", () => {
    const ACTIONS = ["health_failure", "health_recovery"] as const;
    expectTypeOf<(typeof ACTIONS)[number]>().toEqualTypeOf<
      WsIncidentEvent["action"]
    >();
    expect(ACTIONS).toHaveLength(2);
  });

  it("pins the notification category union in both directions", () => {
    const CATEGORIES = ["incident", "activity"] as const;
    expectTypeOf<(typeof CATEGORIES)[number]>().toEqualTypeOf<
      WsNotificationEvent["category"]
    >();
    expect(CATEGORIES).toHaveLength(2);
  });

  it("events tolerate additive unknown fields (open Record intersection)", () => {
    const extended: WsResourceChangeEvent = {
      ...resourceChange,
      new_backend_field: "ignored",
    };
    expect(extended.resource_id).toBe("r-1");
  });
});
