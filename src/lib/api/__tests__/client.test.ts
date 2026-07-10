import { afterEach, describe, expect, it, vi } from "vitest";
import { api, setAuthToken, listProviders, login, getActivityFeed } from "../client";

// Request/fetch shims for the at-import captures live in vitest.setup.ts.

afterEach(() => {
  setAuthToken(null);
  vi.unstubAllGlobals();
});

function mockFetch(status: number, body: unknown) {
  const fetchMock = vi.fn(async () =>
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

describe("typed client auth-header injection", () => {
  it("attaches Authorization: Bearer after setAuthToken", async () => {
    const fetchMock = mockFetch(200, []);
    setAuthToken("test-token-123");

    await listProviders();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const req = requestOf(fetchMock);
    expect(req.headers.get("Authorization")).toBe("Bearer test-token-123");
    expect(new URL(req.url).pathname).toBe("/api/v1/providers");
  });

  it("sends no Authorization header without a token", async () => {
    const fetchMock = mockFetch(200, []);

    await listProviders();

    const req = requestOf(fetchMock);
    expect(req.headers.get("Authorization")).toBeNull();
  });

  it("clears the header after setAuthToken(null)", async () => {
    setAuthToken("stale-token");
    setAuthToken(null);
    const fetchMock = mockFetch(200, []);

    await listProviders();

    expect(requestOf(fetchMock).headers.get("Authorization")).toBeNull();
  });
});

describe("typed client error paths", () => {
  it("rejects with the engine's detail message on 401", async () => {
    mockFetch(401, { detail: "Not authenticated" });

    await expect(listProviders()).rejects.toThrow("Not authenticated");
  });

  it("falls back to HTTP <status> when the error body has no detail", async () => {
    mockFetch(500, {});

    await expect(listProviders()).rejects.toThrow("HTTP 500");
  });

  it("login posts credentials to /api/v1/auth/login and returns the token payload", async () => {
    const fetchMock = mockFetch(200, {
      access_token: "jwt-abc",
      username: "admin",
      role: "admin",
    });

    const result = await login("admin", "pw");

    const req = requestOf(fetchMock);
    expect(new URL(req.url).pathname).toBe("/api/v1/auth/login");
    expect(req.method).toBe("POST");
    expect(result.access_token).toBe("jwt-abc");
  });

  it("exposes the raw typed client for status-based flows (auth probe)", async () => {
    mockFetch(401, { detail: "Not authenticated" });

    const { response } = await api.GET("/api/v1/auth/me");

    expect(response.status).toBe(401);
  });
});

describe("activity feed envelope (nimbus-ui#29)", () => {
  // /api/v1/activity returns {total, page, per_page, items} — the engine
  // envelope (activity.py::get_activity_feed lines 74-79), not a bare array.
  it("resolves the engine envelope and exposes items", async () => {
    mockFetch(200, {
      total: 1,
      page: 1,
      per_page: 8,
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
    });

    const feed = await getActivityFeed({ per_page: 8 });

    expect(feed.total).toBe(1);
    expect(feed.items).toHaveLength(1);
    expect(feed.items[0].summary).toBe("start on i-abc");
  });
});
