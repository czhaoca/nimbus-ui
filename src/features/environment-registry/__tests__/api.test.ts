import { afterEach, describe, expect, it, vi } from "vitest";
import { setAuthToken } from "@/lib/api/client";
import {
  fetchCidrAllocations,
  fetchProjectCompose,
  fetchRegistryPortPools,
  fetchRegistryProjects,
  fetchRegistrySlots,
  fetchRegistryTargets,
  syncProxmoxTargets,
  triggerHealthCheck,
  validateDeployment,
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

describe("environment-registry api module", () => {
  it("fetches slots from GET /api/v1/access-registry", async () => {
    const fetchMock = mockFetch(200, [
      { id: "slot-1", project_name: "flight-analytics", endpoints: [] },
    ]);

    const slots = await fetchRegistrySlots();

    const req = requestOf(fetchMock);
    expect(new URL(req.url).pathname).toBe("/api/v1/access-registry");
    expect(req.method).toBe("GET");
    expect(slots[0].project_name).toBe("flight-analytics");
  });

  it("fetches targets from GET /api/v1/targets", async () => {
    const fetchMock = mockFetch(200, [
      { id: "tgt-1", display_name: "ct-alpha", is_allocatable: true },
    ]);

    const targets = await fetchRegistryTargets();

    const req = requestOf(fetchMock);
    expect(new URL(req.url).pathname).toBe("/api/v1/targets");
    expect(req.method).toBe("GET");
    expect(targets[0].display_name).toBe("ct-alpha");
  });

  it("fetches port pools from GET /api/v1/port-pools", async () => {
    const fetchMock = mockFetch(200, [
      { id: "pool-1", name: "default-pool", port_start: 30000, port_end: 30099 },
    ]);

    const pools = await fetchRegistryPortPools();

    const req = requestOf(fetchMock);
    expect(new URL(req.url).pathname).toBe("/api/v1/port-pools");
    expect(req.method).toBe("GET");
    expect(pools[0].port_start).toBe(30000);
  });

  it("fetches projects from GET /api/v1/projects", async () => {
    const fetchMock = mockFetch(200, [
      { id: "proj-1", name: "flight-analytics", active_slot_count: 1 },
    ]);

    const projects = await fetchRegistryProjects();

    const req = requestOf(fetchMock);
    expect(new URL(req.url).pathname).toBe("/api/v1/projects");
    expect(req.method).toBe("GET");
    expect(projects[0].name).toBe("flight-analytics");
  });

  it("fetches CIDR allocations from GET /api/v1/cidr-allocations", async () => {
    // RFC 5737 documentation range only — never real infrastructure CIDRs.
    const fetchMock = mockFetch(200, [
      { id: 1, cidr_block: "192.0.2.0/24", network_name: "lab-net" },
    ]);

    const allocations = await fetchCidrAllocations();

    const req = requestOf(fetchMock);
    expect(new URL(req.url).pathname).toBe("/api/v1/cidr-allocations");
    expect(req.method).toBe("GET");
    expect(allocations[0].cidr_block).toBe("192.0.2.0/24");
  });

  it("fetches project compose with env and the template default (false)", async () => {
    const fetchMock = mockFetch(200, "services: {}");

    const compose = await fetchProjectCompose("flight-analytics", "dev");

    const req = requestOf(fetchMock);
    const url = new URL(req.url);
    expect(url.pathname).toBe(
      "/api/v1/projects/flight-analytics/docker-compose",
    );
    expect(req.method).toBe("GET");
    expect(url.searchParams.get("env")).toBe("dev");
    expect(url.searchParams.get("template")).toBe("false");
    expect(compose).toBe("services: {}");
  });

  it("passes template=true through to the compose query", async () => {
    const fetchMock = mockFetch(200, "services: {}");

    await fetchProjectCompose("flight-analytics", "prod", true);

    const url = new URL(requestOf(fetchMock).url);
    expect(url.searchParams.get("env")).toBe("prod");
    expect(url.searchParams.get("template")).toBe("true");
  });

  it("validates a deployment via POST /api/v1/deploy/validate query params", async () => {
    const fetchMock = mockFetch(200, {
      project_name: "flight-analytics",
      env_type: "dev",
      passed: true,
      checks: [{ name: "ports", passed: true, message: "ok" }],
    });

    const result = await validateDeployment("flight-analytics", "dev");

    const req = requestOf(fetchMock);
    const url = new URL(req.url);
    expect(url.pathname).toBe("/api/v1/deploy/validate");
    expect(req.method).toBe("POST");
    expect(url.searchParams.get("project_name")).toBe("flight-analytics");
    expect(url.searchParams.get("env_type")).toBe("dev");
    // Everything rides the query string — no request body.
    expect(await req.clone().text()).toBe("");
    expect(result.passed).toBe(true);
  });

  it("triggers a health check via POST /api/v1/slots/{slot_id}/health-check", async () => {
    const fetchMock = mockFetch(200, {
      checked_at: "2026-07-06T10:00:00+00:00",
      all_healthy: true,
      results: [
        {
          service_name: "web",
          health_url: "http://192.0.2.10:30080/health",
          healthy: true,
        },
      ],
    });

    const result = await triggerHealthCheck("slot-1");

    const req = requestOf(fetchMock);
    expect(new URL(req.url).pathname).toBe(
      "/api/v1/slots/slot-1/health-check",
    );
    expect(req.method).toBe("POST");
    expect(await req.clone().text()).toBe("");
    expect(result.all_healthy).toBe(true);
  });

  it("syncs proxmox targets via POST /api/v1/targets/sync/proxmox/{provider_id}", async () => {
    const fetchMock = mockFetch(200, [
      { id: "tgt-1", provider_id: "pve-1", display_name: "ct-alpha" },
    ]);

    const targets = await syncProxmoxTargets("pve-1");

    const req = requestOf(fetchMock);
    expect(new URL(req.url).pathname).toBe(
      "/api/v1/targets/sync/proxmox/pve-1",
    );
    expect(req.method).toBe("POST");
    expect(await req.clone().text()).toBe("");
    expect(targets[0].provider_id).toBe("pve-1");
  });

  it("surfaces engine failures via the error detail", async () => {
    mockFetch(500, { detail: "registry unavailable" });

    await expect(fetchRegistrySlots()).rejects.toThrow("registry unavailable");
  });

  it("falls back to the HTTP status when the error has no detail", async () => {
    mockFetch(502, {});

    await expect(fetchRegistryTargets()).rejects.toThrow("HTTP 502");
  });
});
