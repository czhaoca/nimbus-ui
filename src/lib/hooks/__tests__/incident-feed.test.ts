import { afterEach, describe, expect, it } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";

import {
  pushIncident,
  resetIncidentFeed,
  useIncidentFeed,
} from "../incidentFeed";
import type { WsIncidentEvent } from "@/lib/api/ws-events";

afterEach(() => {
  // RTL auto-cleanup needs test.globals; with explicit vitest imports the
  // unmount must be manual or hook trees leak across tests.
  cleanup();
  resetIncidentFeed();
});

const incident = (n: number): WsIncidentEvent => ({
  type: "incident",
  action: "health_failure",
  resource_id: `r-${n}`,
  provider_id: "p-1",
  // Always on the wire since #311 (model defaults) — "" means "none".
  display_name: "",
  status: "",
});

describe("incident feed store", () => {
  it("prepends pushed incidents newest-first with increasing seq", () => {
    const { result } = renderHook(() => useIncidentFeed());

    act(() => {
      pushIncident(incident(1));
      pushIncident(incident(2));
    });

    expect(result.current).toHaveLength(2);
    expect(result.current[0].event.resource_id).toBe("r-2");
    expect(result.current[1].event.resource_id).toBe("r-1");
    expect(result.current[0].seq).toBeGreaterThan(result.current[1].seq);
  });

  it("caps the session buffer at 50 entries", () => {
    const { result } = renderHook(() => useIncidentFeed());

    act(() => {
      for (let n = 1; n <= 55; n++) pushIncident(incident(n));
    });

    expect(result.current).toHaveLength(50);
    expect(result.current[0].event.resource_id).toBe("r-55");
    expect(result.current[49].event.resource_id).toBe("r-6");
  });

  it("resets cleanly and notifies subscribers", () => {
    const { result } = renderHook(() => useIncidentFeed());

    act(() => pushIncident(incident(1)));
    expect(result.current).toHaveLength(1);

    act(() => resetIncidentFeed());
    expect(result.current).toHaveLength(0);
  });
});
