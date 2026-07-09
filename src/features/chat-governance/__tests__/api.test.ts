import { afterEach, describe, expect, it, vi } from "vitest";
import { setAuthToken } from "@/lib/api/client";

import { fetchApprovals, fetchChannels, fetchRole } from "../api";

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

const APPROVAL = {
  id: "apr-0001",
  approval_id: "apr-0001",
  operation: "resource.terminate",
  requested_by: "ops-bot",
  created_at: "2026-07-09T00:00:00+00:00",
  expires_at: "2026-07-09T01:00:00+00:00",
  status: "pending",
};

describe("fetchApprovals", () => {
  it("GETs /api/v1/chat/approvals and returns the items envelope", async () => {
    const fetchMock = mockFetch(200, { items: [APPROVAL] });

    const result = await fetchApprovals();

    expect(result.items).toHaveLength(1);
    expect(result.items[0].operation).toBe("resource.terminate");
    const req = requestOf(fetchMock);
    expect(req.method).toBe("GET");
    expect(new URL(req.url).pathname).toBe("/api/v1/chat/approvals");
    expect(new URL(req.url).searchParams.get("status")).toBeNull();
  });

  it("passes the status filter as a query param when given", async () => {
    const fetchMock = mockFetch(200, { items: [] });

    await fetchApprovals("denied");

    expect(new URL(requestOf(fetchMock).url).searchParams.get("status")).toBe(
      "denied",
    );
  });

  it("surfaces API errors (the operator gate's literal 403 detail)", async () => {
    // require_operator raises detail="Insufficient role" (_chat_gates.py:32).
    mockFetch(403, { detail: "Insufficient role" });

    await expect(fetchApprovals()).rejects.toThrow("Insufficient role");
  });
});

const CHANNELS = {
  feed_channel_id: "123456789",
  briefing_channel_id: null,
  incidents_channel_id: null,
  approvals_channel_id: null,
  provider_filter: "",
  env_filter: "prod",
};

describe("fetchChannels", () => {
  it("GETs /api/v1/chat/channels/{platform} and returns the config", async () => {
    const fetchMock = mockFetch(200, CHANNELS);

    const result = await fetchChannels("discord");

    expect(result.feed_channel_id).toBe("123456789");
    expect(result.briefing_channel_id).toBeNull();
    const req = requestOf(fetchMock);
    expect(req.method).toBe("GET");
    expect(new URL(req.url).pathname).toBe("/api/v1/chat/channels/discord");
  });
});

describe("fetchRole", () => {
  it("GETs /api/v1/chat/roles/{platform}/{platform_user_id}", async () => {
    const fetchMock = mockFetch(200, {
      platform: "discord",
      platform_user_id: "u-42",
      role: "operator",
    });

    const result = await fetchRole("discord", "u-42");

    expect(result.role).toBe("operator");
    expect(new URL(requestOf(fetchMock).url).pathname).toBe(
      "/api/v1/chat/roles/discord/u-42",
    );
  });

  it("surfaces the operator gate's literal 403 detail", async () => {
    mockFetch(403, { detail: "Insufficient role" });

    await expect(fetchRole("discord", "u-42")).rejects.toThrow(
      "Insufficient role",
    );
  });
});
