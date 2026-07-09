import { afterEach, describe, expect, it, vi } from "vitest";
import { setAuthToken } from "@/lib/api/client";

import { fetchApprovals } from "../api";

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
