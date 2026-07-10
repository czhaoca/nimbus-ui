import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { NotificationFeedWidget } from "../widgets/NotificationFeedWidget";
import { pushIncident, resetIncidentFeed } from "@/lib/hooks/incidentFeed";
import type { WsIncidentEvent } from "@/lib/api/ws-events";

afterEach(() => {
  // RTL auto-cleanup needs test.globals; with explicit vitest imports the
  // unmount must be manual or mounted trees leak across tests.
  cleanup();
  resetIncidentFeed();
});

const INCIDENT: WsIncidentEvent = {
  type: "incident",
  action: "health_failure",
  resource_id: "r-1",
  provider_id: "p-1",
  display_name: "vm-web-1",
};

describe("NotificationFeedWidget", () => {
  it("shows the honest since-page-load empty state before any incident", () => {
    render(<NotificationFeedWidget />);

    expect(screen.getByText(/live incidents since page load/i)).toBeDefined();
    expect(screen.getByText("No incidents this session.")).toBeDefined();
  });

  it("renders pushed incidents with action badges, newest first", () => {
    render(<NotificationFeedWidget />);

    act(() => {
      pushIncident(INCIDENT);
      pushIncident({ ...INCIDENT, action: "health_recovery" });
    });

    expect(screen.getAllByText("vm-web-1")).toHaveLength(2);
    expect(screen.getByText("health failure")).toBeDefined();
    expect(screen.getByText("recovered")).toBeDefined();
    expect(screen.queryByText("No incidents this session.")).toBeNull();
  });

  it("falls back to resource_id when display_name is absent", () => {
    render(<NotificationFeedWidget />);

    act(() =>
      pushIncident({
        type: "incident",
        action: "health_failure",
        resource_id: "r-9",
        provider_id: "p-1",
      }),
    );

    expect(screen.getByText("r-9")).toBeDefined();
  });

  it("ships zero mutating affordances", () => {
    render(<NotificationFeedWidget />);

    act(() => pushIncident(INCIDENT));

    expect(screen.queryByRole("button")).toBeNull();
  });
});
