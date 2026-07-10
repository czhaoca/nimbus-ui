import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";

import ActivityPage from "../page";

// Regression pin (nimbus-ui#29): /api/v1/activity returns the envelope
// {total, page, per_page, items} (activity.py::get_activity_feed 74-79);
// the page must consume .items, never map the envelope itself.

afterEach(() => {
  // RTL auto-cleanup needs test.globals; with explicit vitest imports the
  // unmount must be manual or mounted trees leak across tests.
  cleanup();
  vi.unstubAllGlobals();
});

const ENVELOPE = {
  total: 1,
  page: 1,
  per_page: 20,
  items: [
    {
      id: "log-1",
      type: "audit",
      summary: "start on i-abc",
      timestamp: "2026-07-09T00:00:00+00:00",
      source: "audit",
      details: { action_type: "start", status: "success", initiated_by: "cli" },
    },
  ],
};

function stubFetch(body: unknown) {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(JSON.stringify(body), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    ),
  );
}

describe("ActivityPage", () => {
  it("renders feed items from the envelope response", async () => {
    stubFetch(ENVELOPE);
    render(<ActivityPage />);

    expect(await screen.findByText("start on i-abc")).toBeDefined();
    expect(screen.getByText("audit")).toBeDefined();
    expect(screen.getByText(/1 event\b/)).toBeDefined();
  });

  it("shows the honest empty state for an empty envelope", async () => {
    stubFetch({ total: 0, page: 1, per_page: 20, items: [] });
    render(<ActivityPage />);

    expect(await screen.findByText(/no activity recorded yet/i)).toBeDefined();
  });
});
