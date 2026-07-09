import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { SonarServiceCard } from "../SonarServiceCard";
import type { SonarServiceStatus } from "../types";

const { fetchSonarqubeStatusMock } = vi.hoisted(() => ({
  fetchSonarqubeStatusMock: vi.fn<() => Promise<SonarServiceStatus>>(),
}));

vi.mock("../api", () => ({
  fetchSonarqubeStatus: fetchSonarqubeStatusMock,
}));

function renderCard() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SonarServiceCard />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  // RTL auto-cleanup needs test.globals; with explicit vitest imports the
  // unmount must be manual or mounted trees leak across tests.
  cleanup();
  vi.clearAllMocks();
});

const status = (
  state: SonarServiceStatus["state"],
  extra: Partial<SonarServiceStatus> = {},
): SonarServiceStatus => ({
  service: "sonarqube",
  state,
  holders: 0,
  ...extra,
});

describe("SonarServiceCard", () => {
  it("renders the up state with the live holders count", async () => {
    fetchSonarqubeStatusMock.mockResolvedValue(status("up", { holders: 2 }));
    renderCard();

    expect(await screen.findByText("up")).toBeDefined();
    expect(screen.getByText(/2 live lease holder/i)).toBeDefined();
  });

  it("renders the starting and stopped states", async () => {
    fetchSonarqubeStatusMock.mockResolvedValue(status("starting"));
    const first = renderCard();
    expect(await screen.findByText("starting")).toBeDefined();
    first.unmount();

    fetchSonarqubeStatusMock.mockResolvedValue(status("stopped"));
    renderCard();
    expect(await screen.findByText("stopped")).toBeDefined();
  });

  it("renders crashed with the best-effort exit detail", async () => {
    fetchSonarqubeStatusMock.mockResolvedValue(
      status("crashed", { detail: { exit_code: 137 } }),
    );
    renderCard();

    expect(await screen.findByText("crashed")).toBeDefined();
    expect(screen.getByText(/exit_code/)).toBeDefined();
    expect(screen.getByText(/137/)).toBeDefined();
  });

  it("labels the slot it shows (server defaults)", async () => {
    fetchSonarqubeStatusMock.mockResolvedValue(status("up"));
    renderCard();

    expect(await screen.findByText(/prod \/ primary/i)).toBeDefined();
  });

  it("surfaces fetch errors honestly", async () => {
    fetchSonarqubeStatusMock.mockRejectedValue(new Error("SSH probe failed"));
    renderCard();

    expect(await screen.findByText(/ssh probe failed/i)).toBeDefined();
  });

  it("ships zero lifecycle affordances (status-only pin)", async () => {
    fetchSonarqubeStatusMock.mockResolvedValue(status("crashed", { detail: {} }));
    renderCard();
    await screen.findByText("crashed");

    expect(screen.getByText(/no exit detail reported/i)).toBeDefined();
    expect(screen.queryByRole("button", { name: /start/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /stop/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /force/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /restart/i })).toBeNull();
  });
});
