import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ApprovalsPage } from "../ApprovalsPage";
import type {
  ApprovalsListResponse,
  ChatChannelsConfig,
  ChatRoleMapping,
} from "../types";

const { fetchApprovalsMock, fetchChannelsMock, fetchRoleMock } = vi.hoisted(
  () => ({
    fetchApprovalsMock: vi.fn<() => Promise<ApprovalsListResponse>>(),
    fetchChannelsMock: vi.fn<() => Promise<ChatChannelsConfig>>(),
    fetchRoleMock: vi.fn<() => Promise<ChatRoleMapping>>(),
  }),
);

vi.mock("../api", () => ({
  fetchApprovals: fetchApprovalsMock,
  fetchChannels: fetchChannelsMock,
  fetchRole: fetchRoleMock,
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

  it("renders the three governance tabs", async () => {
    fetchApprovalsMock.mockResolvedValue({ items: [] });
    renderPage();

    expect(await screen.findByRole("tab", { name: /approvals/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /channels/i })).toBeDefined();
    expect(screen.getByRole("tab", { name: /roles/i })).toBeDefined();
  });

  it("roles tab discloses the viewer floor before any lookup", async () => {
    const user = userEvent.setup();
    fetchApprovalsMock.mockResolvedValue({ items: [] });
    renderPage();

    await user.click(await screen.findByRole("tab", { name: /roles/i }));

    expect(
      screen.getByText(/unmapped users resolve to viewer/i),
    ).toBeDefined();
    expect(fetchRoleMock).not.toHaveBeenCalled();
  });

  it("channels tab renders config honestly, with no edit affordance", async () => {
    const user = userEvent.setup();
    fetchApprovalsMock.mockResolvedValue({ items: [] });
    fetchChannelsMock.mockResolvedValue({
      feed_channel_id: "123456789",
      briefing_channel_id: null,
      incidents_channel_id: null,
      approvals_channel_id: null,
      provider_filter: "",
      env_filter: "prod",
    });
    renderPage();

    await user.click(await screen.findByRole("tab", { name: /channels/i }));

    expect(await screen.findByText("123456789")).toBeDefined();
    // 3 null channel ids + empty provider_filter = exactly 4 honest gaps.
    expect(screen.getAllByText(/not configured/i)).toHaveLength(4);
    expect(screen.getByText("prod")).toBeDefined();
    expect(fetchChannelsMock).toHaveBeenCalledWith("discord");
    expect(
      screen.queryByRole("button", { name: /save|edit|update/i }),
    ).toBeNull();
  });

  it("roles tab looks up a user and discloses the viewer floor", async () => {
    const user = userEvent.setup();
    fetchApprovalsMock.mockResolvedValue({ items: [] });
    fetchRoleMock.mockResolvedValue({
      platform: "discord",
      platform_user_id: "u-42",
      role: "viewer",
    });
    renderPage();

    await user.click(await screen.findByRole("tab", { name: /roles/i }));
    await user.type(screen.getByLabelText(/platform user id/i), "u-42");
    await user.click(screen.getByRole("button", { name: /look up/i }));

    expect(await screen.findByText(/resolved role/i)).toBeDefined();
    expect(fetchRoleMock).toHaveBeenCalledWith("discord", "u-42");
    expect(
      screen.getByText(/unmapped users resolve to viewer/i),
    ).toBeDefined();
  });

  it("roles tab surfaces the operator-gate 403 honestly", async () => {
    const user = userEvent.setup();
    fetchApprovalsMock.mockResolvedValue({ items: [] });
    fetchRoleMock.mockRejectedValue(new Error("Insufficient role"));
    renderPage();

    await user.click(await screen.findByRole("tab", { name: /roles/i }));
    await user.type(screen.getByLabelText(/platform user id/i), "u-42");
    await user.click(screen.getByRole("button", { name: /look up/i }));

    expect(await screen.findByText(/insufficient role/i)).toBeDefined();
  });
});
