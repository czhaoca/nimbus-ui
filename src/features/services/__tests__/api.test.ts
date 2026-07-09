import { afterEach, describe, expect, it, vi } from "vitest";
import { setAuthToken } from "@/lib/api/client";

import { fetchSonarqubeStatus } from "../api";

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

describe("fetchSonarqubeStatus", () => {
  it("GETs /api/v1/services/sonarqube/status with no params (server defaults)", async () => {
    const fetchMock = mockFetch(200, {
      service: "sonarqube",
      state: "up",
      holders: 2,
    });

    const result = await fetchSonarqubeStatus();

    expect(result.state).toBe("up");
    expect(result.holders).toBe(2);
    const req = requestOf(fetchMock);
    expect(req.method).toBe("GET");
    const url = new URL(req.url);
    expect(url.pathname).toBe("/api/v1/services/sonarqube/status");
    expect([...url.searchParams.keys()]).toHaveLength(0);
  });

  it("passes through the crashed state's detail payload", async () => {
    mockFetch(200, {
      service: "sonarqube",
      state: "crashed",
      holders: 0,
      detail: { exit_code: 137, finished_at: "2026-07-09T00:00:00+00:00" },
    });

    const result = await fetchSonarqubeStatus();

    expect(result.state).toBe("crashed");
    expect(result.detail).toEqual({
      exit_code: 137,
      finished_at: "2026-07-09T00:00:00+00:00",
    });
  });

  it("surfaces API errors", async () => {
    mockFetch(502, { detail: "SSH probe failed" });

    await expect(fetchSonarqubeStatus()).rejects.toThrow("SSH probe failed");
  });
});
