import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Provider, Resource, ActionLogEntry } from "@/lib/types";
import type { ResourceDependencies } from "@/lib/api/client";

const {
  getResourceMock,
  getActionLogsMock,
  getResourceDependenciesMock,
  listResourcesMock,
  listProvidersMock,
} = vi.hoisted(() => ({
  getResourceMock: vi.fn(),
  getActionLogsMock: vi.fn(),
  getResourceDependenciesMock: vi.fn(),
  listResourcesMock: vi.fn(),
  listProvidersMock: vi.fn(),
}));

vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  getResource: getResourceMock,
  getActionLogs: getActionLogsMock,
  getResourceDependencies: getResourceDependenciesMock,
  listResources: listResourcesMock,
  listProviders: listProvidersMock,
}));

// ProviderIcon imports raw .svg as components via @svgr/webpack — a
// Next-only transform vitest doesn't have; stub the leaf, assert wiring.
vi.mock("@/components/ProviderIcon", () => ({
  ProviderIcon: ({ type }: { type: string }) => (
    <span data-testid="provider-icon" data-provider-type={type} />
  ),
  getProviderMeta: (type: string) => ({ label: `meta:${type}`, color: "#6B7280" }),
}));

import { ResourceDetailPage } from "../ResourceDetailPage";

const RESOURCE: Resource = {
  id: "res-0001",
  provider_id: "oci-demo",
  external_id: "unit-fixture-instance-0001",
  resource_type: "compute",
  display_name: "unit-web-01",
  name_prefix: "unit",
  status: "running",
  protection_level: "standard",
  auto_terminate: false,
  monthly_cost_estimate: 12.5,
  tags: { env: "unit" },
  created_at: "2026-02-01T00:00:00Z",
  updated_at: "2026-06-01T00:00:00Z",
  last_seen_at: "2026-06-01T00:00:00Z",
};

const NEIGHBORS: Resource[] = [
  RESOURCE,
  {
    ...RESOURCE,
    id: "res-0002",
    external_id: "unit-fixture-instance-0002",
    display_name: "unit-worker-01",
    status: "stopped",
  },
  {
    ...RESOURCE,
    id: "res-0003",
    external_id: "unit-fixture-instance-0003",
    display_name: "unit-lab-vm",
  },
];

const PROVIDERS: Provider[] = [
  {
    id: "oci-demo",
    provider_type: "oci",
    display_name: "OCI Demo",
    region: "us-ashburn-1",
    instance_index: 0,
    is_active: true,
    credentials_configured: true,
    credentials_source: "file",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-06-01T00:00:00Z",
  },
];

const LOGS: ActionLogEntry[] = [
  {
    id: "act-0001",
    resource_id: "res-0001",
    action_type: "health_check",
    status: "success",
    initiated_by: "unit-admin",
    details: {},
    created_at: "2026-06-30T14:05:00Z",
  },
  {
    id: "act-0002",
    resource_id: "res-0001",
    action_type: "stop",
    status: "failed",
    initiated_by: "unit-admin",
    details: { error: "probe timeout (fixture)" },
    created_at: "2026-06-29T08:00:00Z",
  },
];

const DEPENDENCIES: ResourceDependencies = {
  resource_id: "res-0001",
  depends_on: [{ id: "dep-0001", target_id: "res-0002", type: "network" }],
  depended_by: [{ id: "dep-0002", source_id: "res-0003", type: "storage" }],
};

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ResourceDetailPage resourceId="res-0001" />
    </QueryClientProvider>,
  );
}

describe("ResourceDetailPage", () => {
  beforeEach(() => {
    getResourceMock.mockResolvedValue(RESOURCE);
    getActionLogsMock.mockResolvedValue(LOGS);
    getResourceDependenciesMock.mockResolvedValue(DEPENDENCIES);
    listResourcesMock.mockResolvedValue(NEIGHBORS);
    listProvidersMock.mockResolvedValue(PROVIDERS);
  });

  afterEach(() => {
    // RTL auto-cleanup needs test.globals; with explicit vitest imports the
    // unmount must be manual or mounted trees leak across tests.
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the loading skeleton while the resource query is pending", () => {
    getResourceMock.mockReturnValue(new Promise(() => {}));
    renderPage();
    expect(document.querySelector('[data-slot="skeleton"]')).toBeTruthy();
    expect(screen.queryByText("unit-web-01")).toBeNull();
  });

  it("renders the header and all five panels from fixture data", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "unit-web-01" })).toBeTruthy();
    // Header provider identity resolves type via the providers list.
    expect(screen.getByTestId("provider-icon").getAttribute("data-provider-type")).toBe("oci");
    expect(screen.getByText("meta:oci")).toBeTruthy();

    expect(screen.getByText("Properties")).toBeTruthy();
    expect(screen.getByText("unit-fixture-instance-0001")).toBeTruthy();

    expect(screen.getByText("Lifecycle & Cost")).toBeTruthy();
    expect(screen.getByText("$12.50")).toBeTruthy();

    expect(screen.getByText("Tags")).toBeTruthy();
    expect(screen.getByText("env")).toBeTruthy();

    expect(screen.getByText("Dependencies")).toBeTruthy();
    expect(await screen.findByText("unit-worker-01")).toBeTruthy();

    expect(screen.getByText("Action History")).toBeTruthy();
    expect(await screen.findByText("health_check")).toBeTruthy();
    expect(screen.getByText("Jun 30, 2026, 2:05 PM UTC")).toBeTruthy();
  });

  it("renders dependency chips with the edge.type relationship label", async () => {
    renderPage();

    expect(await screen.findByText("unit-worker-01")).toBeTruthy();
    expect(screen.getByText("network")).toBeTruthy();
    expect(await screen.findByText("unit-lab-vm")).toBeTruthy();
    expect(screen.getByText("storage")).toBeTruthy();
    // Chips link to the neighbor's detail page.
    const chip = screen.getByText("unit-worker-01").closest("a");
    expect(chip?.getAttribute("href")).toBe("/resources/res-0002");
  });

  it("renders an explicit unknown when last_seen_at is null", async () => {
    getResourceMock.mockResolvedValue({ ...RESOURCE, last_seen_at: null });
    renderPage();

    const label = await screen.findByText("Last Seen");
    expect(label.nextElementSibling?.textContent).toBe("—");
  });

  it("names the health-history contract gap honestly in-page", async () => {
    renderPage();
    expect(
      await screen.findByText(/health history is not exposed by the \/api\/v1 contract/i),
    ).toBeTruthy();
  });

  it("renders honest empty states for tags and action history", async () => {
    getResourceMock.mockResolvedValue({ ...RESOURCE, tags: {} });
    getActionLogsMock.mockResolvedValue([]);
    renderPage();

    expect(await screen.findByText("No tags.")).toBeTruthy();
    expect(await screen.findByText("No actions recorded yet.")).toBeTruthy();
  });

  it("surfaces an action-log fetch failure instead of masking it as empty", async () => {
    getActionLogsMock.mockRejectedValue(new Error("logs-boom"));
    renderPage();

    expect(await screen.findByText("logs-boom")).toBeTruthy();
    expect(screen.queryByText("No actions recorded yet.")).toBeNull();
  });

  it("surfaces a destructive alert with a breadcrumb on load failure", async () => {
    getResourceMock.mockRejectedValue(new Error("boom-404"));
    renderPage();

    expect(await screen.findByText("boom-404")).toBeTruthy();
    const back = screen.getByText(/Back to Dashboard/);
    expect(back.closest("a")?.getAttribute("href")).toBe("/");
  });

  it("carries the pre-idiom action buttons over unchanged (upgrade is Sequence 30)", async () => {
    renderPage();
    await screen.findByRole("heading", { name: "unit-web-01" });

    // status=running → Stop, Health Check, Terminate; Start only when stopped.
    expect(screen.getByRole("button", { name: "Stop" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Health Check" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Terminate" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Start" })).toBeNull();
  });
});
