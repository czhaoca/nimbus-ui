import { afterEach, describe, expect, it, vi } from "vitest";
import { setAuthToken } from "@/lib/api/client";
import {
  fetchBillingConfigs,
  fetchBudgetDigest,
  fetchEnforcementHistory,
} from "../api";

// Request/fetch shims for the at-import captures live in vitest.setup.ts.

afterEach(() => {
  setAuthToken(null);
  vi.unstubAllGlobals();
});

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn(
    async () =>
      new Response(JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
      }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function requestOf(fetchMock: ReturnType<typeof vi.fn>): Request {
  return fetchMock.mock.calls[0][0] as Request;
}

describe("budget guardian api module", () => {
  it("renders the digest from the budget.digest op (ops bridge)", async () => {
    const fetchMock = mockFetch(200, {
      status: "success",
      message: "",
      data: {
        statuses: [
          {
            provider_id: null,
            period: "2026-07",
            total_spent: 12.5,
            monthly_limit: 100,
            utilization: 0.125,
            status: "ok",
            action_on_exceed: "alert",
            alerts: [],
          },
        ],
        active_resources: 4,
      },
      action_log_id: null,
    });

    const digest = await fetchBudgetDigest();

    const req = requestOf(fetchMock);
    expect(new URL(req.url).pathname).toBe("/api/v1/ops/budget.digest");
    expect(req.method).toBe("POST");
    expect(digest.active_resources).toBe(4);
    expect(digest.statuses[0].status).toBe("ok");
  });

  it("fetches billing configs from /api/v1/billing-configs", async () => {
    const fetchMock = mockFetch(200, [
      {
        id: "bc-1",
        provider_id: "gcp-1",
        billing_enabled: true,
        polling_interval_seconds: 3600,
        cache_ttl_seconds: 3600,
        last_poll_at: null,
        last_amount: 0,
        created_at: "2026-07-01T00:00:00+00:00",
        updated_at: "2026-07-01T00:00:00+00:00",
      },
    ]);

    const configs = await fetchBillingConfigs();

    const req = requestOf(fetchMock);
    expect(new URL(req.url).pathname).toBe("/api/v1/billing-configs");
    expect(configs[0].last_poll_at).toBeNull();
  });

  it("keeps only budget_monitor rows from the audit feed", async () => {
    const row = (id: string, initiated_by: string) => ({
      id,
      action_type: "terminate",
      created_at: "2026-07-06T10:00:00+00:00",
      details: { reason: "Budget exceeded" },
      initiated_by,
      resource_id: "r-1",
      status: "pending",
    });
    const fetchMock = mockFetch(200, [
      row("a-1", "budget_monitor"),
      row("a-2", "admin"),
      row("a-3", "budget_monitor"),
    ]);

    const history = await fetchEnforcementHistory();

    const req = requestOf(fetchMock);
    const url = new URL(req.url);
    expect(url.pathname).toBe("/api/v1/audit");
    // The default window is load-bearing for the "honest cap" note.
    expect(url.searchParams.get("limit")).toBe("100");
    expect(history.map((h) => h.id)).toEqual(["a-1", "a-3"]);
  });
});
