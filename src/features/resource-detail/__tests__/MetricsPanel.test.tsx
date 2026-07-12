import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { getResourceMetricsMock } = vi.hoisted(() => ({
  getResourceMetricsMock: vi.fn(),
}));

vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  getResourceMetrics: getResourceMetricsMock,
}));

import { MetricsPanel } from "../panels/MetricsPanel";
import type { ResourceMetrics } from "../types";

// recharts' ResponsiveContainer observes its host with ResizeObserver,
// which jsdom lacks. First unit test in the repo to render live recharts —
// DashboardPage.test.tsx stubs SpendingChart out instead.
beforeAll(() => {
  window.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver;
});

const SERIES: ResourceMetrics = {
  resource_id: "res-0001",
  period_hours: 24,
  data: Array.from({ length: 4 }, (_, i) => ({
    timestamp: `2026-06-30T0${i}:00:00+00:00`,
    cpu_percent: 20 + i,
    memory_percent: 40 + i,
    network_in_bytes: 1024 * (i + 1),
    network_out_bytes: 512 * (i + 1),
  })),
};

function renderPanel() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <MetricsPanel resourceId="res-0001" />
    </QueryClientProvider>,
  );
}

describe("MetricsPanel", () => {
  beforeEach(() => {
    getResourceMetricsMock.mockResolvedValue(SERIES);
  });

  afterEach(() => {
    // RTL auto-cleanup needs test.globals; with explicit vitest imports the
    // unmount must be manual or mounted trees leak across tests.
    cleanup();
    vi.clearAllMocks();
  });

  it("renders the chart region for a non-empty series", async () => {
    renderPanel();

    expect(await screen.findByText("Metrics")).toBeTruthy();
    await waitFor(() =>
      expect(document.querySelector('[data-slot="chart"]')).toBeTruthy(),
    );
    expect(screen.queryByText(/No metrics recorded/)).toBeNull();
    expect(getResourceMetricsMock).toHaveBeenCalledWith("res-0001", 24);
  });

  it('renders the explicit "No metrics recorded" empty state for data: []', async () => {
    // Empty is the seed's steady state (zero ResourceMetric rows) — it must
    // be named, never a blank chart and never fabricated zeros.
    getResourceMetricsMock.mockResolvedValue({
      resource_id: "res-0001",
      period_hours: 24,
      data: [],
    });
    renderPanel();

    expect(await screen.findByText(/No metrics recorded/)).toBeTruthy();
    expect(document.querySelector('[data-slot="chart"]')).toBeNull();
  });

  it("switches the hours param through the period toggle", async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByText("Metrics");

    await user.click(screen.getByRole("button", { name: "7d" }));
    // A refetch with the new hours proves the query key includes it.
    await waitFor(() =>
      expect(getResourceMetricsMock).toHaveBeenCalledWith("res-0001", 168),
    );

    await user.click(screen.getByRole("button", { name: "1h" }));
    await waitFor(() =>
      expect(getResourceMetricsMock).toHaveBeenCalledWith("res-0001", 1),
    );
  });

  it("surfaces a fetch failure instead of masking it as empty", async () => {
    getResourceMetricsMock.mockRejectedValue(new Error("metrics-boom"));
    renderPanel();

    expect(await screen.findByText("metrics-boom")).toBeTruthy();
    expect(screen.queryByText(/No metrics recorded/)).toBeNull();
  });
});
