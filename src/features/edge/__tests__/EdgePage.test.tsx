import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setAuthToken } from "@/lib/api/client";
import { EdgePage } from "../EdgePage";
import type { AccessApp, CfTunnel, WarpStatus } from "../types";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function envelope(data: unknown) {
  return { status: "success", message: "", data, action_log_id: null };
}

const CF_PROVIDER = {
  id: "cf-1",
  display_name: "Cloudflare Main",
  provider_type: "cloudflare",
  is_active: true,
};
const OTHER_PROVIDER = {
  id: "p-oci",
  display_name: "OCI Home",
  provider_type: "oci",
  is_active: true,
};

const TUNNELS: CfTunnel[] = [
  { id: "t-1", name: "home-tunnel", status: "healthy", connections: 4 },
  { id: "t-2", name: "backup-tunnel", status: "inactive", connections: 0 },
];

const APPS: AccessApp[] = [
  {
    id: "a-1",
    name: "grafana",
    domain: "grafana.example.com",
    type: "self_hosted",
    session_duration: "24h",
    created_at: "2026-01-01T00:00:00Z",
  },
];

const WARP_OK: WarpStatus = {
  to_create: [],
  to_delete: [],
  split_tunnel_changed: false,
  converged: true,
};

const WARP_DRIFT: WarpStatus = {
  // Documentation-range CIDRs (RFC 5737) — the privacy hook rejects
  // RFC-1918 ranges that could mirror real infrastructure.
  to_create: [{ network: "192.0.2.0/24" }],
  to_delete: ["198.51.100.0/24"],
  split_tunnel_changed: true,
  converged: false,
};

interface Overrides {
  providers?: unknown[];
  warp?: WarpStatus | { status: number; detail: string };
  tunnels?: CfTunnel[] | { status: number; detail: string };
  apps?: AccessApp[];
  // Per-provider tunnel fixtures so multi-provider sections are observable.
  tunnelsByProvider?: Record<string, CfTunnel[]>;
}

function routeFetch(overrides: Overrides = {}) {
  const fetchMock = vi.fn(async (input: Request | string) => {
    const req = input as Request;
    const path = new URL(req.url).pathname;
    if (path === "/api/v1/providers") {
      return json(200, overrides.providers ?? [CF_PROVIDER, OTHER_PROVIDER]);
    }
    if (path === "/api/v1/ops/cloudflare.tunnel.list") {
      if (overrides.tunnelsByProvider) {
        const body = (await req.clone().json()) as { provider_id: string };
        return json(200, envelope(overrides.tunnelsByProvider[body.provider_id] ?? []));
      }
      const t = overrides.tunnels ?? TUNNELS;
      if (!Array.isArray(t)) return json(t.status, { detail: t.detail });
      return json(200, envelope(t));
    }
    if (path === "/api/v1/ops/cloudflare.zerotrust.access-apps.list") {
      return json(200, envelope(overrides.apps ?? APPS));
    }
    if (path === "/api/v1/ops/warp.status") {
      const w = overrides.warp ?? WARP_OK;
      if ("detail" in w) return json(w.status, { detail: w.detail });
      return json(200, envelope(w));
    }
    return json(404, { detail: `unrouted ${path}` });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <EdgePage />
    </QueryClientProvider>,
  );
}

describe("EdgePage", () => {
  beforeEach(() => {
    setAuthToken("token");
  });

  afterEach(() => {
    cleanup();
    setAuthToken(null);
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("renders tunnels with status and connection counts", async () => {
    routeFetch();
    renderPage();

    const healthyRow = (await screen.findByText("home-tunnel")).closest("tr");
    expect(within(healthyRow as HTMLElement).getByText("healthy")).toBeTruthy();
    expect(within(healthyRow as HTMLElement).getByText("4")).toBeTruthy();
    const inactiveRow = screen.getByText("backup-tunnel").closest("tr");
    expect(within(inactiveRow as HTMLElement).getByText("inactive")).toBeTruthy();
  });

  it("renders access apps with domains", async () => {
    routeFetch();
    renderPage();

    const row = (await screen.findByText("grafana")).closest("tr");
    expect(
      within(row as HTMLElement).getByText("grafana.example.com"),
    ).toBeTruthy();
    expect(within(row as HTMLElement).getByText("self_hosted")).toBeTruthy();
  });

  it("shows WARP as converged when there is no drift", async () => {
    routeFetch({ warp: WARP_OK });
    renderPage();

    expect(await screen.findByText(/converged/i)).toBeTruthy();
  });

  it("shows WARP drift details when not converged", async () => {
    routeFetch({ warp: WARP_DRIFT });
    renderPage();

    expect(await screen.findByText(/drift/i)).toBeTruthy();
    expect(screen.getByText(/1 route to create/i)).toBeTruthy();
    expect(screen.getByText(/1 route to delete/i)).toBeTruthy();
    expect(screen.getByText(/split-tunnel change pending/i)).toBeTruthy();
    // The drift branch is the tempting place for a reconcile CTA — keep the
    // read-only guard covering it too.
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("shows an explicit empty state without a Cloudflare provider", async () => {
    routeFetch({ providers: [OTHER_PROVIDER] });
    renderPage();

    expect(
      await screen.findByText(/no active cloudflare provider/i),
    ).toBeTruthy();
  });

  it("names the deferred engine-side ops in the in-page note", async () => {
    routeFetch();
    renderPage();

    expect(
      await screen.findByText(/cloudflare\.device\.list/),
    ).toBeTruthy();
    expect(screen.getByText(/cloudflare\.zerotrust\.gateway-rules\.list/)).toBeTruthy();
  });

  it("offers no mutating affordances", async () => {
    routeFetch();
    renderPage();

    await screen.findByText("home-tunnel");
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });

  it("surfaces per-panel errors honestly", async () => {
    routeFetch({ tunnels: { status: 400, detail: "Operation failed" } });
    renderPage();

    expect(await screen.findByText(/Operation failed/)).toBeTruthy();
    // Both sibling panels still render their data.
    expect(await screen.findByText("grafana")).toBeTruthy();
    expect(await screen.findByText(/converged/i)).toBeTruthy();
  });

  it("surfaces WARP errors in its own panel while siblings render", async () => {
    routeFetch({ warp: { status: 400, detail: "Operation failed" } });
    renderPage();

    const warpCard = (await screen.findByText("WARP Mesh")).closest(
      '[data-slot="card"]',
    ) as HTMLElement;
    expect(await within(warpCard).findByText(/Operation failed/)).toBeTruthy();
    expect(await screen.findByText("home-tunnel")).toBeTruthy();
    expect(await screen.findByText("grafana")).toBeTruthy();
  });

  it("shows the access-apps empty state", async () => {
    routeFetch({ apps: [] });
    renderPage();

    expect(
      await screen.findByText(/no zero trust access applications/i),
    ).toBeTruthy();
  });

  it("renders one section per Cloudflare provider with isolated data", async () => {
    const CF2 = {
      id: "cf-2",
      display_name: "Cloudflare Lab",
      provider_type: "cloudflare",
      is_active: true,
    };
    routeFetch({
      providers: [CF_PROVIDER, CF2, OTHER_PROVIDER],
      tunnelsByProvider: {
        "cf-1": [TUNNELS[0]],
        "cf-2": [{ id: "t-9", name: "lab-tunnel", status: "healthy", connections: 1 }],
      },
    });
    renderPage();

    expect(await screen.findByText("Cloudflare Main")).toBeTruthy();
    expect(screen.getByText("Cloudflare Lab")).toBeTruthy();
    // Per-provider query keys: each section shows its own tunnels.
    expect(await screen.findByText("home-tunnel")).toBeTruthy();
    expect(await screen.findByText("lab-tunnel")).toBeTruthy();
    expect(screen.queryByText("backup-tunnel")).toBeNull();
  });
});
