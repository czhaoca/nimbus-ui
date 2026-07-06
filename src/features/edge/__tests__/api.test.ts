import { afterEach, describe, expect, it, vi } from "vitest";
import { setAuthToken } from "@/lib/api/client";
import { fetchAccessApps, fetchTunnels, fetchWarpStatus } from "../api";

// Request/fetch shims for the at-import captures live in vitest.setup.ts.

afterEach(() => {
  setAuthToken(null);
  vi.unstubAllGlobals();
});

function envelope(data: unknown) {
  return { status: "success", message: "", data, action_log_id: null };
}

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

async function requestOf(fetchMock: ReturnType<typeof vi.fn>) {
  const req = fetchMock.mock.calls[0][0] as Request;
  return { req, body: await req.clone().json() };
}

describe("edge api module (ops bridge)", () => {
  it("lists tunnels via the cloudflare.tunnel.list op", async () => {
    const fetchMock = mockFetch(
      200,
      envelope([{ id: "t-1", name: "home", status: "healthy", connections: 4 }]),
    );

    const tunnels = await fetchTunnels("cf-1");

    const { req, body } = await requestOf(fetchMock);
    expect(new URL(req.url).pathname).toBe(
      "/api/v1/ops/cloudflare.tunnel.list",
    );
    expect(body).toEqual({ provider_id: "cf-1" });
    expect(tunnels[0].status).toBe("healthy");
  });

  it("lists access apps via the zerotrust op", async () => {
    const fetchMock = mockFetch(
      200,
      envelope([
        {
          id: "a-1",
          name: "grafana",
          domain: "grafana.example.com",
          type: "self_hosted",
          session_duration: "24h",
          created_at: "2026-01-01T00:00:00Z",
        },
      ]),
    );

    const apps = await fetchAccessApps("cf-1");

    const { req, body } = await requestOf(fetchMock);
    expect(new URL(req.url).pathname).toBe(
      "/api/v1/ops/cloudflare.zerotrust.access-apps.list",
    );
    expect(body).toEqual({ provider_id: "cf-1" });
    expect(apps[0].domain).toBe("grafana.example.com");
  });

  it("fetches WARP drift with the provider key (not provider_id)", async () => {
    const fetchMock = mockFetch(
      200,
      envelope({
        to_create: [],
        to_delete: [],
        split_tunnel_changed: false,
        converged: true,
      }),
    );

    const status = await fetchWarpStatus("cf-1");

    const { req, body } = await requestOf(fetchMock);
    expect(new URL(req.url).pathname).toBe("/api/v1/ops/warp.status");
    expect(body).toEqual({ provider: "cf-1" });
    expect(status.converged).toBe(true);
  });

  it("surfaces op failures via the redacted 400 detail", async () => {
    mockFetch(400, { detail: "Operation failed" });

    await expect(fetchTunnels("cf-1")).rejects.toThrow("Operation failed");
  });
});
