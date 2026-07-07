import { afterEach, describe, expect, it, vi } from "vitest";
import { setAuthToken } from "@/lib/api/client";
import { fetchPlanDiff, fetchPlanTree, updateAllocationStatus } from "../api";
import type { PlanDiff, PlanTreeNode } from "../types";

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

// RFC 5737 documentation ranges only — never RFC-1918.
const NODE: PlanTreeNode = {
  id: 1,
  provider_type: "proxmox",
  cidr_block: "192.0.2.0/24",
  network_name: "site-core",
  site_label: "HQ",
  vlan_id: 10,
  status: "active",
  gateway_ip: "192.0.2.1",
  children: [],
};

const DIFF: PlanDiff = {
  planned_unmatched: [
    { id: 11, cidr_block: "203.0.113.0/28", name: "edge-dmz", provider: "proxmox" },
  ],
  active_unplanned: [
    { id: 12, cidr_block: "203.0.113.64/28", name: "stray-net", provider: "oci" },
  ],
  matched_count: 3,
};

describe("network-plan api module", () => {
  it("fetches the plan tree without a provider filter by default", async () => {
    const fetchMock = mockFetch(200, [NODE]);

    const roots = await fetchPlanTree();

    const req = requestOf(fetchMock);
    const url = new URL(req.url);
    expect(url.pathname).toBe("/api/v1/network-plan/tree");
    expect(req.method).toBe("GET");
    // No filter given -> no provider_type query param at all.
    expect(url.searchParams.get("provider_type")).toBeNull();
    expect(roots).toHaveLength(1);
    expect(roots[0].cidr_block).toBe("192.0.2.0/24");
  });

  it("scopes the plan tree with the provider_type query param", async () => {
    const fetchMock = mockFetch(200, []);

    await fetchPlanTree("proxmox");

    const url = new URL(requestOf(fetchMock).url);
    expect(url.pathname).toBe("/api/v1/network-plan/tree");
    expect(url.searchParams.get("provider_type")).toBe("proxmox");
  });

  it("fetches the plan diff from /api/v1/network-plan/diff", async () => {
    const fetchMock = mockFetch(200, DIFF);

    const diff = await fetchPlanDiff();

    const req = requestOf(fetchMock);
    expect(new URL(req.url).pathname).toBe("/api/v1/network-plan/diff");
    expect(req.method).toBe("GET");
    expect(diff.matched_count).toBe(3);
    expect(diff.planned_unmatched[0].cidr_block).toBe("203.0.113.0/28");
    expect(diff.active_unplanned[0].provider).toBe("oci");
  });

  it("PATCHes the allocation status with the id in the path", async () => {
    const fetchMock = mockFetch(200, { id: 7, status: "active" });

    const result = await updateAllocationStatus(7, "active");

    const req = requestOf(fetchMock);
    expect(new URL(req.url).pathname).toBe("/api/v1/network-plan/7/status");
    expect(req.method).toBe("PATCH");
    expect(await req.clone().json()).toEqual({ status: "active" });
    expect(result).toEqual({ id: 7, status: "active" });
  });

  it("throws the engine detail on an error response", async () => {
    mockFetch(404, { detail: "Allocation not found" });

    await expect(updateAllocationStatus(999, "active")).rejects.toThrow(
      "Allocation not found",
    );
  });

  it("falls back to the HTTP status when the error body has no detail", async () => {
    mockFetch(500, {});

    await expect(fetchPlanDiff()).rejects.toThrow("HTTP 500");
  });
});
