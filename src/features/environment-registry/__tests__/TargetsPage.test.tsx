import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setAuthToken } from "@/lib/api/client";
import { TargetsPage } from "../TargetsPage";
import type { RegistryPortPool, RegistryTarget } from "../types";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Fixture addresses use the RFC 5737 documentation ranges only.
const TARGET_A: RegistryTarget = {
  id: "tgt-1",
  provider_id: "pve-1",
  provider_type: "proxmox",
  node_name: "node-a",
  target_type: "lxc",
  external_id: "101",
  display_name: "ct-alpha",
  hostname: "ct-alpha",
  network_address: "192.0.2.10",
  public_address: "",
  network_config: "",
  status: "running",
  is_allocatable: true,
  notes: "",
  metadata_json: {},
  last_seen_at: "2026-07-01T00:00:00+00:00",
  available_for_slot: true,
};

const TARGET_B: RegistryTarget = {
  id: "tgt-2",
  provider_id: "oci-1",
  provider_type: "oci",
  node_name: "",
  target_type: "vm",
  external_id: "ocid-example",
  display_name: "vm-bravo",
  hostname: "vm-bravo",
  network_address: "198.51.100.20",
  public_address: "",
  network_config: "",
  status: "running",
  is_allocatable: false,
  notes: "",
  metadata_json: {},
  last_seen_at: "2026-07-01T00:00:00+00:00",
  available_for_slot: false,
};

const POOL: RegistryPortPool = {
  id: "pool-1",
  target_inventory_id: "tgt-1",
  name: "default-pool",
  description: "",
  port_start: 30000,
  port_end: 30099,
  is_default: true,
  is_active: true,
  created_at: "2026-07-01T00:00:00+00:00",
  updated_at: "2026-07-01T00:00:00+00:00",
};

interface Routes {
  targets?: RegistryTarget[] | { status: number; detail: string };
  pools?: RegistryPortPool[];
}

function routeFetch(routes: Routes = {}) {
  const fetchMock = vi.fn(async (input: Request | string) => {
    const req = input as Request;
    const path = new URL(req.url).pathname;
    if (path === "/api/v1/targets") {
      const t = routes.targets ?? [TARGET_A, TARGET_B];
      if (!Array.isArray(t)) return json(t.status, { detail: t.detail });
      return json(200, t);
    }
    if (path === "/api/v1/port-pools") {
      return json(200, routes.pools ?? [POOL]);
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
      <TargetsPage />
    </QueryClientProvider>,
  );
}

// Stat-card titles ("Allocatable") repeat as table headers further down;
// the stat cards come first in document order.
function cardOf(title: string): HTMLElement {
  return screen
    .getAllByText(title)[0]
    .closest('[data-slot="card"]') as HTMLElement;
}

describe("TargetsPage", () => {
  beforeEach(() => {
    setAuthToken("token");
  });

  afterEach(() => {
    cleanup();
    setAuthToken(null);
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("shows skeleton stats while loading, then the derived counts", async () => {
    routeFetch();
    const { container } = renderPage();

    // The header renders immediately; the stats and tables are skeletons.
    expect(screen.getByText("Deployment Targets")).toBeTruthy();
    expect(
      container.querySelectorAll('[data-slot="skeleton"]').length,
    ).toBeGreaterThan(0);
    expect(screen.queryByText("ct-alpha")).toBeNull();

    // "ct-alpha" renders twice once loaded (targets table + resolved pool
    // target); the id cell "tgt-1" is unique to the targets table.
    await screen.findByText("tgt-1");
    expect(within(cardOf("Total Targets")).getByText("2")).toBeTruthy();
    expect(within(cardOf("Allocatable")).getByText("1")).toBeTruthy();
    expect(within(cardOf("Available For Slot")).getByText("1")).toBeTruthy();
  });

  it("renders target rows with provider, flags, and pool counts", async () => {
    routeFetch();
    renderPage();

    const rowA = (await screen.findByText("tgt-1")).closest(
      "tr",
    ) as HTMLElement;
    expect(within(rowA).getByText("ct-alpha")).toBeTruthy();
    expect(within(rowA).getByText("proxmox")).toBeTruthy();
    expect(within(rowA).getByText("pve-1")).toBeTruthy();
    expect(within(rowA).getByText("lxc")).toBeTruthy();
    expect(within(rowA).getByText("node-a")).toBeTruthy();
    // Allocatable + available badges, plus one pool on this target.
    expect(within(rowA).getAllByText("Yes")).toHaveLength(2);
    expect(within(rowA).getByText("1")).toBeTruthy();

    const rowB = screen.getByText("vm-bravo").closest("tr") as HTMLElement;
    expect(within(rowB).getByText("oci")).toBeTruthy();
    expect(within(rowB).getByText("No")).toBeTruthy();
    expect(within(rowB).getByText("Reserved")).toBeTruthy();
    expect(within(rowB).getByText("-")).toBeTruthy(); // no node name
    expect(within(rowB).getByText("0")).toBeTruthy(); // no pools
  });

  it("renders port pools with the resolved target name and range", async () => {
    routeFetch();
    renderPage();

    const poolRow = (await screen.findByText("default-pool")).closest(
      "tr",
    ) as HTMLElement;
    expect(within(poolRow).getByText("pool-1")).toBeTruthy();
    expect(within(poolRow).getByText("ct-alpha")).toBeTruthy();
    expect(within(poolRow).getByText("30000–30099")).toBeTruthy();
    expect(within(poolRow).getByText("default")).toBeTruthy();
  });

  it("shows explicit empty states with the CLI hints", async () => {
    routeFetch({ targets: [], pools: [] });
    renderPage();

    expect(
      await screen.findByText(/no targets registered/i),
    ).toBeTruthy();
    // The page header also mentions sync-targets; the empty-state hint is
    // the only text carrying the --provider flag.
    expect(screen.getByText(/nimbus deploy sync-targets --provider/)).toBeTruthy();
    expect(screen.getByText(/no port pools configured/i)).toBeTruthy();
    expect(screen.getByText(/nimbus deploy create-pool/)).toBeTruthy();
  });

  it("surfaces target inventory load errors honestly", async () => {
    routeFetch({ targets: { status: 500, detail: "engine down" } });
    renderPage();

    expect(
      await screen.findByText(/failed to load target inventory/i),
    ).toBeTruthy();
  });
});
