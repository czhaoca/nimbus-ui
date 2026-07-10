import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DashboardPage } from "../DashboardPage";
import type { DashboardWidget } from "@/lib/api/client";

const {
  useProvidersMock,
  useResourcesMock,
  useResourceActionMock,
  useSyncResourcesMock,
  useBudgetStatusMock,
  useEnforceBudgetMock,
  useProviderStatusMock,
  getPrefsMock,
  savePrefsMock,
} = vi.hoisted(() => ({
  useProvidersMock: vi.fn(),
  useResourcesMock: vi.fn(),
  useResourceActionMock: vi.fn(),
  useSyncResourcesMock: vi.fn(),
  useBudgetStatusMock: vi.fn(),
  useEnforceBudgetMock: vi.fn(),
  useProviderStatusMock: vi.fn(),
  getPrefsMock: vi.fn(),
  savePrefsMock: vi.fn(),
}));

vi.mock("@/lib/hooks/useApi", () => ({
  useProviders: useProvidersMock,
  useResources: useResourcesMock,
  useResourceAction: useResourceActionMock,
  useSyncResources: useSyncResourcesMock,
  useBudgetStatus: useBudgetStatusMock,
  useEnforceBudget: useEnforceBudgetMock,
  useProviderStatus: useProviderStatusMock,
}));

vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  getDashboardPreferences: getPrefsMock,
  saveDashboardPreferences: savePrefsMock,
}));

vi.mock("@/components/SpendingChart", () => ({
  SpendingChart: () => <div>spending-chart-stub</div>,
}));

vi.mock("@/components/BudgetOverview", () => ({
  BudgetOverview: () => <div>budget-overview-stub</div>,
}));

function renderPage(ui = <DashboardPage />) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>,
  );
}

beforeEach(() => {
  useProvidersMock.mockReturnValue({ data: [] });
  useResourcesMock.mockReturnValue({ data: [], isLoading: false });
  useResourceActionMock.mockReturnValue({ mutate: vi.fn(), isPending: false });
  useSyncResourcesMock.mockReturnValue({ mutate: vi.fn(), isPending: false });
  useBudgetStatusMock.mockReturnValue({ data: [] });
  useEnforceBudgetMock.mockReturnValue({ mutate: vi.fn(), isPending: false });
  useProviderStatusMock.mockReturnValue({ data: { providers: [] } });
  getPrefsMock.mockResolvedValue(null);
  savePrefsMock.mockImplementation(async (p: unknown) => p);
});

afterEach(() => {
  // RTL auto-cleanup needs test.globals; with explicit vitest imports the
  // unmount must be manual or mounted trees leak across tests.
  cleanup();
  vi.clearAllMocks();
});

describe("DashboardPage", () => {
  it("renders every surviving widget section with honest empty states", async () => {
    renderPage();

    expect(await screen.findByText("Total Resources")).toBeDefined();
    expect(screen.getByText("Budget Status")).toBeDefined();
    expect(screen.getByText("spending-chart-stub")).toBeDefined();
    expect(screen.getByText("Recent Activity")).toBeDefined();
    expect(screen.getByText("No recent activity recorded.")).toBeDefined();
    expect(screen.getByText("Notifications")).toBeDefined();
    expect(screen.getByText("No notifications.")).toBeDefined();
    expect(screen.getByText("No providers configured.")).toBeDefined();
    expect(screen.getByText(/no resources found/i)).toBeDefined();
  });

  it("ships no fabricated cost chart and exactly one costs card", async () => {
    renderPage();
    await screen.findByText("spending-chart-stub");

    expect(screen.queryByText(/weekly cost trend/i)).toBeNull();
    expect(screen.getAllByText("spending-chart-stub")).toHaveLength(1);
  });

  it("toggling a widget hides its card and saves preferences", async () => {
    const user = userEvent.setup();
    let saved: { widgets: DashboardWidget[] } | null = null;
    getPrefsMock.mockImplementation(async () => saved);
    savePrefsMock.mockImplementation(async (p: { widgets: DashboardWidget[] }) => {
      saved = p;
      return p;
    });
    renderPage();
    expect(await screen.findByText("Budget Status")).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Widgets" }));
    await user.click(await screen.findByRole("button", { name: "budget" }));

    expect(savePrefsMock).toHaveBeenCalledTimes(1);
    const payload = savePrefsMock.mock.calls[0][0] as {
      widgets: DashboardWidget[];
    };
    expect(payload.widgets.find((w) => w.id === "budget")?.visible).toBe(false);
    await waitFor(() =>
      expect(screen.queryByText("Budget Status")).toBeNull(),
    );
  });

  it("offers no dead 'providers' toggle in the widget panel (DEC-A)", async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText("Budget Status");

    await user.click(screen.getByRole("button", { name: "Widgets" }));

    expect(screen.getByRole("button", { name: "provider-cards" })).toBeDefined();
    expect(screen.queryByRole("button", { name: "providers" })).toBeNull();
  });

  it("route wrapper delegates to the feature module", async () => {
    const { default: RoutePage } = await import("@/app/page");
    renderPage(<RoutePage />);

    expect(await screen.findByText("Total Resources")).toBeDefined();
  });
});
