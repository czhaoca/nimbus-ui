import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ActivityWidget } from "../widgets/ActivityWidget";
import type { ActivityFeedResponse } from "@/lib/api/client";

const { getActivityFeedMock } = vi.hoisted(() => ({
  getActivityFeedMock: vi.fn(),
}));

vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  getActivityFeed: getActivityFeedMock,
}));

function renderWidget() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ActivityWidget />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  // RTL auto-cleanup needs test.globals; with explicit vitest imports the
  // unmount must be manual or mounted trees leak across tests.
  cleanup();
  vi.clearAllMocks();
});

const feed = (items: ActivityFeedResponse["items"]): ActivityFeedResponse => ({
  total: items.length,
  page: 1,
  per_page: 8,
  items,
});

const ITEM = {
  id: "log-1",
  type: "audit",
  summary: "start on i-abc",
  timestamp: "2026-07-09T00:00:00+00:00",
  source: "audit",
  details: { action_type: "start", status: "success", initiated_by: "cli" },
};

describe("ActivityWidget", () => {
  it("renders the top feed items with source badges", async () => {
    getActivityFeedMock.mockResolvedValue(
      feed([
        ITEM,
        { ...ITEM, id: "log-2", type: "webhook", summary: "outbound discord → https://…", source: "webhook" },
      ]),
    );
    renderWidget();

    expect(await screen.findByText("start on i-abc")).toBeDefined();
    expect(screen.getByText("audit")).toBeDefined();
    expect(screen.getByText("outbound discord → https://…")).toBeDefined();
    expect(screen.getByText("webhook")).toBeDefined();
    expect(getActivityFeedMock).toHaveBeenCalledWith({ per_page: 8 });
  });

  it("keeps the honest empty state only for a truly empty feed", async () => {
    getActivityFeedMock.mockResolvedValue(feed([]));
    renderWidget();

    expect(await screen.findByText("No recent activity recorded.")).toBeDefined();
  });

  it("surfaces fetch errors honestly", async () => {
    getActivityFeedMock.mockRejectedValue(new Error("Not authenticated"));
    renderWidget();

    expect(await screen.findByText(/not authenticated/i)).toBeDefined();
  });

  it("links to the full activity timeline", async () => {
    getActivityFeedMock.mockResolvedValue(feed([]));
    renderWidget();
    await screen.findByText("No recent activity recorded.");

    const link = screen.getByRole("link", { name: /view all activity/i });
    expect(link.getAttribute("href")).toBe("/activity");
  });

  it("ships zero mutating affordances", async () => {
    getActivityFeedMock.mockResolvedValue(feed([ITEM]));
    renderWidget();
    await screen.findByText("start on i-abc");

    expect(screen.queryByRole("button")).toBeNull();
  });
});
