import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApprovalsPage } from "../ApprovalsPage";
import type { ApprovalsListResponse } from "../types";

const { fetchApprovalsMock } = vi.hoisted(() => ({
  fetchApprovalsMock: vi.fn<() => Promise<ApprovalsListResponse>>(),
}));

vi.mock("../api", () => ({
  fetchApprovals: fetchApprovalsMock,
}));

function renderPage() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <ApprovalsPage />
    </QueryClientProvider>,
  );
}

afterEach(() => {
  // RTL auto-cleanup needs test.globals; with explicit vitest imports the
  // unmount must be manual or mounted trees leak across tests.
  cleanup();
  vi.clearAllMocks();
});

const APPROVAL = {
  id: "apr-0001",
  approval_id: "apr-0001",
  operation: "resource.terminate",
  requested_by: "ops-bot",
  created_at: "2026-07-09T00:00:00+00:00",
  expires_at: "2026-07-09T01:00:00+00:00",
  status: "pending",
};

describe("ApprovalsPage", () => {
  it("renders pending approvals from the queue", async () => {
    fetchApprovalsMock.mockResolvedValue({ items: [APPROVAL] });
    renderPage();

    expect(await screen.findByText("resource.terminate")).toBeDefined();
    expect(screen.getByText("ops-bot")).toBeDefined();
    expect(screen.getByText("pending")).toBeDefined();
  });

  it("shows an explicit empty state", async () => {
    fetchApprovalsMock.mockResolvedValue({ items: [] });
    renderPage();

    expect(await screen.findByText(/no pending approvals/i)).toBeDefined();
  });

  it("surfaces fetch errors honestly", async () => {
    fetchApprovalsMock.mockRejectedValue(new Error("Operator role required"));
    renderPage();

    expect(await screen.findByText(/operator role required/i)).toBeDefined();
  });

  it("ships zero mutating affordances (read-only pin)", async () => {
    fetchApprovalsMock.mockResolvedValue({ items: [APPROVAL] });
    renderPage();
    await screen.findByText("resource.terminate");

    expect(screen.queryByRole("button", { name: /approve/i })).toBeNull();
    expect(screen.queryByRole("button", { name: /deny/i })).toBeNull();
  });

  it("names the read-only posture in-page", async () => {
    fetchApprovalsMock.mockResolvedValue({ items: [] });
    renderPage();

    expect(
      await screen.findByText(/read-only .* approve\/deny .* in chat/i),
    ).toBeDefined();
  });
});
