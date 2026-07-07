import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { setAuthToken } from "@/lib/api/client";
import { NetworkPlanPage } from "../NetworkPlanPage";
import type { PlanDiff, PlanTreeNode } from "../types";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// RFC 5737 documentation ranges only (192.0.2.0/24, 198.51.100.0/24,
// 203.0.113.0/24) — the privacy rules forbid RFC-1918 fixtures.
const TREE: PlanTreeNode[] = [
  {
    id: 1,
    provider_type: "proxmox",
    cidr_block: "192.0.2.0/24",
    network_name: "site-core",
    site_label: "HQ",
    vlan_id: 10,
    status: "active",
    gateway_ip: "192.0.2.1",
    children: [
      {
        id: 2,
        provider_type: "proxmox",
        cidr_block: "192.0.2.0/26",
        network_name: "lab-segment",
        site_label: "HQ",
        vlan_id: 20,
        status: "planned",
        gateway_ip: "192.0.2.1",
        children: [
          {
            id: 3,
            provider_type: "proxmox",
            cidr_block: "192.0.2.0/28",
            // Empty name -> the row falls back to provider_type.
            network_name: "",
            site_label: "",
            vlan_id: null,
            status: "decommissioning",
            gateway_ip: "",
            children: [],
          },
        ],
      },
    ],
  },
  {
    id: 4,
    provider_type: "oci",
    cidr_block: "198.51.100.0/24",
    network_name: "cloud-vcn",
    site_label: "OCI",
    vlan_id: null,
    status: "active",
    gateway_ip: "198.51.100.1",
    children: [],
  },
];

const DIFF: PlanDiff = {
  planned_unmatched: [
    { id: 11, cidr_block: "203.0.113.0/28", name: "edge-dmz", provider: "proxmox" },
  ],
  active_unplanned: [
    { id: 12, cidr_block: "203.0.113.64/28", name: "", provider: "oci" },
  ],
  matched_count: 3,
};

interface Overrides {
  tree?: PlanTreeNode[] | { status: number; detail: string };
  diff?: PlanDiff | { status: number; detail: string };
}

// Routed fetch stub: plan tree + plan diff (the only two endpoints the
// page's read-only views hit).
function routeFetch(overrides: Overrides = {}) {
  const fetchMock = vi.fn(async (input: Request | string) => {
    const req = input as Request;
    const path = new URL(req.url).pathname;
    if (path === "/api/v1/network-plan/tree") {
      const t = overrides.tree ?? TREE;
      if (!Array.isArray(t)) return json(t.status, { detail: t.detail });
      return json(200, t);
    }
    if (path === "/api/v1/network-plan/diff") {
      const d = overrides.diff ?? DIFF;
      if ("detail" in d) return json(d.status, { detail: d.detail });
      return json(200, d);
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
      <NetworkPlanPage />
    </QueryClientProvider>,
  );
}

function skeleton() {
  return document.querySelector('[data-slot="skeleton"]');
}

describe("NetworkPlanPage", () => {
  beforeEach(() => {
    setAuthToken("token");
  });

  afterEach(() => {
    cleanup();
    setAuthToken(null);
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("shows a loading skeleton then the plan tree data", async () => {
    routeFetch();
    renderPage();

    // Tree tab is the default; the query starts in the loading state.
    expect(skeleton()).toBeTruthy();

    expect(await screen.findByText("192.0.2.0/24")).toBeTruthy();
    expect(skeleton()).toBeNull();
    expect(screen.getByText("CIDR Master Plan")).toBeTruthy();
  });

  it("renders node metadata: name, VLAN, status, provider, site", async () => {
    routeFetch();
    renderPage();

    const rootRow = (await screen.findByText("192.0.2.0/24"))
      .closest("div") as HTMLElement;
    expect(within(rootRow).getByText("site-core")).toBeTruthy();
    expect(within(rootRow).getByText("VLAN 10")).toBeTruthy();
    expect(within(rootRow).getByText("active")).toBeTruthy();
    expect(within(rootRow).getByText("proxmox")).toBeTruthy();
    expect(within(rootRow).getByText("HQ")).toBeTruthy();

    // Second root renders alongside the first.
    const ociRow = screen.getByText("198.51.100.0/24").closest("div") as HTMLElement;
    expect(within(ociRow).getByText("cloud-vcn")).toBeTruthy();
    // vlan_id null -> no VLAN chip on that row.
    expect(within(ociRow).queryByText(/VLAN/)).toBeNull();
  });

  it("renders nested children indented by depth", async () => {
    routeFetch();
    renderPage();

    await screen.findByText("192.0.2.0/24");

    // TreeNode indents via inline paddingLeft = depth * 24.
    const child = screen
      .getByText("192.0.2.0/26")
      .closest("div[style]") as HTMLElement;
    expect(child.style.paddingLeft).toBe("24px");
    expect(within(child).getByText("planned")).toBeTruthy();

    const grandchild = screen
      .getByText("192.0.2.0/28")
      .closest("div[style]") as HTMLElement;
    expect(grandchild.style.paddingLeft).toBe("48px");
    expect(within(grandchild).getByText("decommissioning")).toBeTruthy();
    // Empty network_name falls back to provider_type (name span + badge).
    const gcRow = screen.getByText("192.0.2.0/28").closest("div") as HTMLElement;
    expect(within(gcRow).getAllByText("proxmox")).toHaveLength(2);
  });

  it("shows the tree empty state with the register hint", async () => {
    routeFetch({ tree: [] });
    renderPage();

    expect(
      await screen.findByText(/no allocations registered/i),
    ).toBeTruthy();
    expect(screen.getByText("nimbus network register")).toBeTruthy();
  });

  it("masks a tree fetch error as the empty state (current behavior)", async () => {
    // DEFECT (pinned, not fixed): PlanTreeView ignores useQuery's error —
    // a failed fetch leaves `roots` undefined, which renders the same
    // "No allocations registered" copy as a genuinely empty plan.
    routeFetch({ tree: { status: 500, detail: "plan store unavailable" } });
    renderPage();

    expect(
      await screen.findByText(/no allocations registered/i),
    ).toBeTruthy();
    expect(screen.queryByText(/plan store unavailable/)).toBeNull();
  });

  it("switches to the diff tab and renders adds, removes and matches", async () => {
    const fetchMock = routeFetch();
    renderPage();
    const user = userEvent.setup();

    // The diff query only fires once the tab is opened.
    await screen.findByText("192.0.2.0/24");
    expect(
      fetchMock.mock.calls.some(
        (c) => new URL((c[0] as Request).url).pathname === "/api/v1/network-plan/diff",
      ),
    ).toBe(false);

    await user.click(screen.getByRole("button", { name: /plan vs actual/i }));

    // Removes-side: planned but not active.
    const planned = (await screen.findByText("Planned but NOT Active"))
      .closest('[data-slot="card"]') as HTMLElement;
    expect(within(planned).getByText("203.0.113.0/28")).toBeTruthy();
    expect(within(planned).getByText("edge-dmz")).toBeTruthy();
    expect(within(planned).getByText("proxmox")).toBeTruthy();

    // Adds-side: active but not planned; empty name renders "-".
    const active = screen
      .getByText("Active but NOT in Plan")
      .closest('[data-slot="card"]') as HTMLElement;
    expect(within(active).getByText("203.0.113.64/28")).toBeTruthy();
    expect(within(active).getByText("-")).toBeTruthy();
    expect(within(active).getByText("oci")).toBeTruthy();

    // Matched allocations are summarised, not listed.
    expect(
      screen.getByText(/3 allocation\(s\) matched plan to active/),
    ).toBeTruthy();
  });

  it("omits empty diff sections and the zero matched-count line", async () => {
    routeFetch({
      diff: {
        planned_unmatched: [],
        active_unplanned: [
          { id: 21, cidr_block: "198.51.100.16/28", name: "stray", provider: "oci" },
        ],
        matched_count: 0,
      },
    });
    renderPage();
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: /plan vs actual/i }),
    );

    expect(await screen.findByText("Active but NOT in Plan")).toBeTruthy();
    expect(screen.queryByText("Planned but NOT Active")).toBeNull();
    expect(screen.queryByText(/matched plan to active/)).toBeNull();
  });

  it("shows the diff empty state when nothing is planned, active or matched", async () => {
    routeFetch({
      diff: { planned_unmatched: [], active_unplanned: [], matched_count: 0 },
    });
    renderPage();
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: /plan vs actual/i }),
    );

    expect(await screen.findByText(/no allocations to compare/i)).toBeTruthy();
  });

  it("renders nothing on a diff fetch error (current behavior)", async () => {
    // DEFECT (pinned, not fixed): PlanDiffView returns null when the query
    // errors — the tab goes blank with no error message.
    routeFetch({ diff: { status: 500, detail: "diff unavailable" } });
    renderPage();
    const user = userEvent.setup();

    await user.click(
      await screen.findByRole("button", { name: /plan vs actual/i }),
    );

    await waitFor(() => expect(skeleton()).toBeNull());
    expect(screen.queryByText(/diff unavailable/)).toBeNull();
    expect(screen.queryByText("Planned but NOT Active")).toBeNull();
    expect(screen.queryByText("Active but NOT in Plan")).toBeNull();
    expect(screen.queryByText(/no allocations to compare/i)).toBeNull();
  });
});
