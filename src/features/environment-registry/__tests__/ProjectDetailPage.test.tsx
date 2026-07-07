import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setAuthToken } from "@/lib/api/client";
import { ProjectDetailPage } from "../ProjectDetailPage";
import type { RegistrySlot, RegistryTarget } from "../types";

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

// A slot for another project — must be filtered out of the detail view.
const OTHER_SLOT: RegistrySlot = {
  ...SLOT,
  id: "slot-2",
  project_id: "proj-2",
  project_name: "other-app",
  slot_key: "other-app-dev-1",
  target_inventory_id: null,
  endpoints: [],
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
  available_for_slot: false,
};

interface Routes {
  slots?: RegistrySlot[] | { status: number; detail: string };
  targets?: RegistryTarget[];
}

function routeFetch(routes: Routes = {}) {
  const fetchMock = vi.fn(async (input: Request | string) => {
    const req = input as Request;
    const path = new URL(req.url).pathname;
    if (path === "/api/v1/access-registry") {
      const s = routes.slots ?? [SLOT, OTHER_SLOT];
      if (!Array.isArray(s)) return json(s.status, { detail: s.detail });
      return json(200, s);
    }
    if (path === "/api/v1/targets") {
      return json(200, routes.targets ?? [TARGET]);
    }
    return json(404, { detail: `unrouted ${path}` });
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

// The app wrapper (src/app/environments/[project]/page.tsx) unwraps the
// route-param promise and passes `projectName` as a plain prop.
function renderPage(projectName = "flight-analytics") {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ProjectDetailPage projectName={projectName} />
    </QueryClientProvider>,
  );
}

describe("ProjectDetailPage", () => {
  beforeEach(() => {
    setAuthToken("token");
  });

  afterEach(() => {
    cleanup();
    setAuthToken(null);
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("shows skeletons while loading, then only this project's slots", async () => {
    routeFetch();
    const { container } = renderPage();

    // Loading branch: skeletons only, no heading yet.
    expect(container.querySelector('[data-slot="skeleton"]')).toBeTruthy();
    expect(screen.queryByText("flight-analytics")).toBeNull();

    expect(
      await screen.findByRole("heading", { name: "flight-analytics" }),
    ).toBeTruthy();
    expect(screen.getByText("flight-analytics-dev-1")).toBeTruthy();
    expect(screen.getByText("reserved")).toBeTruthy();
    // Slots belonging to other projects are filtered out.
    expect(screen.queryByText("other-app-dev-1")).toBeNull();
  });

  it("renders the resolved target details for a slot", async () => {
    routeFetch();
    renderPage();

    await screen.findByText("flight-analytics-dev-1");
    expect(screen.getByText("ct-alpha")).toBeTruthy();
    expect(screen.getByText("node-a")).toBeTruthy();
    expect(screen.getByText("192.0.2.10")).toBeTruthy();
    expect(screen.getByText("lxc")).toBeTruthy();
  });

  it("renders endpoint rows with ports and access URLs", async () => {
    routeFetch();
    renderPage();

    const row = (await screen.findByText("web")).closest("tr") as HTMLElement;
    expect(within(row).getByText("http")).toBeTruthy();
    expect(within(row).getByText("30080")).toBeTruthy();
    expect(within(row).getByText("8080")).toBeTruthy();
    const link = within(row).getByRole("link", {
      name: "http://192.0.2.10:30080",
    });
    expect(link.getAttribute("href")).toBe("http://192.0.2.10:30080");
  });

  it("offers a compose download link pinned to the contract path", async () => {
    routeFetch();
    renderPage();

    const link = await screen.findByRole("link", { name: /compose/i });
    expect(link.getAttribute("href")).toBe(
      "/api/v1/projects/flight-analytics/docker-compose?env=dev",
    );
    expect(link.getAttribute("download")).toBe("docker-compose.dev.yml");
  });

  it("shows the empty state when the project has no slots", async () => {
    routeFetch({ slots: [OTHER_SLOT] });
    renderPage();

    expect(
      await screen.findByText("No slots reserved for this project."),
    ).toBeTruthy();
  });

  it("renders slots without endpoints with an explicit empty row", async () => {
    routeFetch({ slots: [{ ...SLOT, endpoints: [] }] });
    renderPage();

    await screen.findByText("flight-analytics-dev-1");
    expect(screen.getByText("No endpoints allocated.")).toBeTruthy();
  });

  it("shows the empty state on a fetch error (no error branch — known gap)", async () => {
    // Pinned current behavior: the page only checks isLoading; a failed
    // slots query falls through to `data ?? []` and renders as if the
    // project had no slots instead of surfacing the error. Defect reported
    // in the work-order notes; do not fix here.
    routeFetch({ slots: { status: 500, detail: "registry unavailable" } });
    renderPage();

    expect(
      await screen.findByText("No slots reserved for this project."),
    ).toBeTruthy();
    expect(screen.queryByText("registry unavailable")).toBeNull();
  });
});
