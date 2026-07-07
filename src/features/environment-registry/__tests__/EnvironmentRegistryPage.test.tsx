import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setAuthToken } from "@/lib/api/client";
import { EnvironmentRegistryPage } from "../EnvironmentRegistryPage";
import type {
  CidrAllocation,
  RegistryPortPool,
  RegistryProject,
  RegistrySlot,
  RegistryTarget,
} from "../types";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Fixture addresses use the RFC 5737 documentation ranges only.
const SLOT: RegistrySlot = {
  id: "slot-1",
  project_id: "proj-1",
  project_name: "flight-analytics",
  env_type: "dev",
  slot_key: "flight-analytics-dev-1",
  display_name: "flight-analytics dev",
  status: "reserved",
  target_inventory_id: "tgt-1",
  target_display: "ct-alpha",
  node_name: "node-a",
  network_address: "192.0.2.10",
  public_address: "",
  public_base_url: "",
  notes: "",
  requested_by: "operator",
  reserved_at: "2026-07-01T00:00:00+00:00",
  released_at: null,
  service_summary: "web",
  endpoints: [
    {
      id: "ep-1",
      service_name: "web",
      protocol: "http",
      host_port: 30080,
      container_port: 8080,
      access_url: "http://192.0.2.10:30080",
      health_endpoint: "/health",
      is_public: false,
      notes: "",
    },
  ],
};

const TARGET: RegistryTarget = {
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

const PROJECT: RegistryProject = {
  id: "proj-1",
  name: "flight-analytics",
  description: "Flight data pipeline",
  repo_url: "https://example.com/flight-analytics.git",
  is_active: true,
  active_slot_count: 1,
  created_at: "2026-07-01T00:00:00+00:00",
  updated_at: "2026-07-01T00:00:00+00:00",
};

const CIDR: CidrAllocation = {
  id: 1,
  provider_type: "proxmox",
  cidr_block: "192.0.2.0/24",
  network_name: "lab-net",
  tenancy_alias: null,
  region: "home",
  external_id: "",
  gateway_ip: "192.0.2.1",
  is_active: true,
  notes: "",
  status: "active",
  site_label: "site-a",
  vlan_id: 42,
  parent_allocation_id: null,
  created_at: "2026-07-01T00:00:00+00:00",
};

interface Routes {
  slots?: RegistrySlot[] | { status: number; detail: string };
  targets?: RegistryTarget[];
  pools?: RegistryPortPool[];
  projects?: RegistryProject[];
  cidrs?: CidrAllocation[];
}

// Routed fetch stub over the five registry list endpoints the page (plus its
// DashboardCards / ProjectsTable / CidrTable children) queries.
function routeFetch(routes: Routes = {}) {
  const fetchMock = vi.fn(async (input: Request | string) => {
    const req = input as Request;
    const path = new URL(req.url).pathname;
    if (path === "/api/v1/access-registry") {
      const s = routes.slots ?? [SLOT];
      if (!Array.isArray(s)) return json(s.status, { detail: s.detail });
      return json(200, s);
    }
    if (path === "/api/v1/targets") {
      return json(200, routes.targets ?? [TARGET]);
    }
    if (path === "/api/v1/port-pools") {
      return json(200, routes.pools ?? [POOL]);
    }
    if (path === "/api/v1/projects") {
      return json(200, routes.projects ?? [PROJECT]);
    }
    if (path === "/api/v1/cidr-allocations") {
      return json(200, routes.cidrs ?? [CIDR]);
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
      <EnvironmentRegistryPage />
    </QueryClientProvider>,
  );
}

describe("EnvironmentRegistryPage", () => {
  beforeEach(() => {
    setAuthToken("token");
  });

  afterEach(() => {
    cleanup();
    setAuthToken(null);
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("shows skeletons while loading, then renders the slot access table", async () => {
    routeFetch();
    const { container } = renderPage();

    // Loading branch: skeletons only, no page content yet.
    expect(container.querySelector('[data-slot="skeleton"]')).toBeTruthy();
    expect(screen.queryByText("Slot Access Table")).toBeNull();

    const slotRow = (
      await screen.findByText("flight-analytics-dev-1")
    ).closest("tr") as HTMLElement;
    expect(screen.getByText("Slot Access Table")).toBeTruthy();
    expect(within(slotRow).getByText("dev")).toBeTruthy();
    expect(within(slotRow).getByText("reserved")).toBeTruthy();
    expect(within(slotRow).getByText("ct-alpha")).toBeTruthy();
    expect(within(slotRow).getByText("192.0.2.10")).toBeTruthy();
    const endpointLink = within(slotRow).getByRole("link", {
      name: "web:30080",
    });
    expect(endpointLink.getAttribute("href")).toBe("http://192.0.2.10:30080");
  });

  it("renders targets and port pools tables", async () => {
    routeFetch();
    renderPage();

    const targetRow = (await screen.findByText("pve-1")).closest(
      "tr",
    ) as HTMLElement;
    expect(within(targetRow).getByText("ct-alpha")).toBeTruthy();
    expect(within(targetRow).getByText("node-a")).toBeTruthy();
    expect(within(targetRow).getByText("yes")).toBeTruthy();

    const poolRow = (screen.getByText("default-pool")).closest(
      "tr",
    ) as HTMLElement;
    expect(within(poolRow).getByText("tgt-1")).toBeTruthy();
    expect(within(poolRow).getByText("30000-30099")).toBeTruthy();
    expect(within(poolRow).getByText("default")).toBeTruthy();
  });

  it("renders dashboard summary counts from all five feeds", async () => {
    routeFetch();
    renderPage();

    const projectsCard = (await screen.findByText("Projects")).closest(
      '[data-slot="card"]',
    ) as HTMLElement;
    expect(within(projectsCard).getByText("1")).toBeTruthy();

    const slotsCard = screen.getByText("Reserved Slots").closest(
      '[data-slot="card"]',
    ) as HTMLElement;
    expect(within(slotsCard).getByText("1")).toBeTruthy();

    const endpointsCard = screen.getByText("Total Endpoints").closest(
      '[data-slot="card"]',
    ) as HTMLElement;
    expect(within(endpointsCard).getByText("1")).toBeTruthy();

    // "CIDR Allocations" is both a dashboard label and the CidrTable title;
    // the dashboard card comes first in document order.
    const cidrCard = screen.getAllByText("CIDR Allocations")[0].closest(
      '[data-slot="card"]',
    ) as HTMLElement;
    expect(within(cidrCard).getByText("1")).toBeTruthy();
  });

  it("links registered projects to their detail page", async () => {
    routeFetch();
    renderPage();

    const link = await screen.findByRole("link", {
      name: "flight-analytics",
    });
    expect(link.getAttribute("href")).toBe("/environments/flight-analytics");
    expect(screen.getByText("Flight data pipeline")).toBeTruthy();
  });

  it("renders CIDR allocations with network, block, and VLAN", async () => {
    routeFetch();
    renderPage();

    const cidrRow = (await screen.findByText("lab-net")).closest(
      "tr",
    ) as HTMLElement;
    expect(within(cidrRow).getByText("192.0.2.0/24")).toBeTruthy();
    expect(within(cidrRow).getByText("proxmox")).toBeTruthy();
    expect(within(cidrRow).getByText("site-a")).toBeTruthy();
    expect(within(cidrRow).getByText("42")).toBeTruthy();
    expect(within(cidrRow).getByText("active")).toBeTruthy();
  });

  it("shows explicit empty states when the registry has no data", async () => {
    routeFetch({ slots: [], targets: [], pools: [], projects: [], cidrs: [] });
    renderPage();

    expect(
      await screen.findByText("No environment slots registered."),
    ).toBeTruthy();
    expect(screen.getByText("No targets synced.")).toBeTruthy();
    expect(screen.getByText("No port pools configured.")).toBeTruthy();
    expect(screen.getByText("No projects registered.")).toBeTruthy();
    expect(screen.getByText("No CIDR allocations registered.")).toBeTruthy();
  });

  it("surfaces registry load errors honestly", async () => {
    routeFetch({ slots: { status: 500, detail: "registry unavailable" } });
    renderPage();

    expect(await screen.findByText("registry unavailable")).toBeTruthy();
    // The error branch replaces the page body entirely.
    expect(screen.queryByText("Slot Access Table")).toBeNull();
  });
});
