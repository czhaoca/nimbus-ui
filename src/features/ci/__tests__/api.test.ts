import { afterEach, describe, expect, it, vi } from "vitest";
import { setAuthToken } from "@/lib/api/client";
import { fetchCiRunners } from "../api";
import type { CiRunner } from "../types";

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

const RUNNER: CiRunner = {
  id: "3f6a2c9e-0000-4000-8000-000000000001",
  github_job_id: 101,
  github_run_id: 900,
  container_vmid: 2101,
  status: "running",
  repository: "acme/widgets",
  workflow_name: "ci",
  created_at: "2026-07-06T10:00:00+00:00",
  started_at: "2026-07-06T10:00:05+00:00",
  completed_at: null,
};

describe("ci api module", () => {
  it("fetches runner records from /api/v1/ci-runners", async () => {
    const fetchMock = mockFetch(200, [RUNNER]);

    const runners = await fetchCiRunners();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const req = requestOf(fetchMock);
    expect(new URL(req.url).pathname).toBe("/api/v1/ci-runners");
    expect(req.method).toBe("GET");
    expect(runners).toHaveLength(1);
    expect(runners[0].status).toBe("running");
  });

  it("passes active_only as a query param when requested", async () => {
    const fetchMock = mockFetch(200, []);

    await fetchCiRunners(true);

    const url = new URL(requestOf(fetchMock).url);
    expect(url.searchParams.get("active_only")).toBe("true");
  });

  it("surfaces the admin-only 403 detail as the error message", async () => {
    mockFetch(403, { detail: "Admin privileges required" });

    await expect(fetchCiRunners()).rejects.toThrow("Admin privileges required");
  });
});
