import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { Resource } from "@/lib/types";

const { updateResourceMock, showToastMock } = vi.hoisted(() => ({
  updateResourceMock: vi.fn(),
  showToastMock: vi.fn(),
}));

vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  updateResource: updateResourceMock,
}));

vi.mock("@/components/Toasts", () => ({
  showToast: showToastMock,
}));

import { EditResourceDialog } from "../EditResourceDialog";

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

function renderDialog(resource: Resource = RESOURCE) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidateSpy = vi.spyOn(queryClient, "invalidateQueries");
  const onOpenChange = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <EditResourceDialog
        resource={resource}
        open={true}
        onOpenChange={onOpenChange}
      />
    </QueryClientProvider>,
  );
  return { invalidateSpy, onOpenChange };
}

describe("EditResourceDialog", () => {
  beforeEach(() => {
    updateResourceMock.mockResolvedValue({
      ...RESOURCE,
      display_name: "unit-web-01-renamed",
    });
  });

  afterEach(() => {
    // RTL auto-cleanup needs test.globals; with explicit vitest imports the
    // unmount must be manual or mounted trees leak across tests.
    cleanup();
    vi.clearAllMocks();
  });

  it("prefills the four editable fields from the cached resource", () => {
    renderDialog();

    expect(
      (screen.getByLabelText("Display name") as HTMLInputElement).value,
    ).toBe("unit-web-01");
    // Select renders its controlled value; the popover is never opened.
    expect(screen.getByText("standard")).toBeTruthy();
    expect(
      screen.getByRole("switch", { name: "Auto-terminate" }).getAttribute("aria-checked"),
    ).toBe("false");
    // Existing tags become editable rows.
    expect((screen.getByDisplayValue("env") as HTMLInputElement)).toBeTruthy();
    expect((screen.getByDisplayValue("unit") as HTMLInputElement)).toBeTruthy();
  });

  it("does not render status or cost as editable (deliberate exclusions)", () => {
    renderDialog();

    expect(screen.queryByLabelText(/status/i)).toBeNull();
    expect(screen.queryByLabelText(/cost/i)).toBeNull();
    expect(screen.queryByDisplayValue("running")).toBeNull();
    expect(screen.queryByDisplayValue("12.5")).toBeNull();
  });

  it("PUTs exactly the four editable fields on save", async () => {
    const user = userEvent.setup();
    renderDialog();

    const name = screen.getByLabelText("Display name");
    await user.clear(name);
    await user.type(name, "unit-web-01-renamed");
    await user.click(screen.getByRole("switch", { name: "Auto-terminate" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(updateResourceMock).toHaveBeenCalled());
    const [id, body] = updateResourceMock.mock.calls[0];
    expect(id).toBe("res-0001");
    expect(Object.keys(body).sort()).toEqual([
      "auto_terminate",
      "display_name",
      "protection_level",
      "tags",
    ]);
    expect(body.display_name).toBe("unit-web-01-renamed");
    expect(body.auto_terminate).toBe(true);
    expect(body.protection_level).toBe("standard");
  });

  it("tag rows add and remove edit the submitted tags dict", async () => {
    const user = userEvent.setup();
    renderDialog();

    await user.click(screen.getByRole("button", { name: "Remove tag 1" }));
    await user.click(screen.getByRole("button", { name: "Add tag" }));
    const keys = screen.getAllByPlaceholderText("key");
    const values = screen.getAllByPlaceholderText("value");
    await user.type(keys[keys.length - 1], "tier");
    await user.type(values[values.length - 1], "gold");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(updateResourceMock).toHaveBeenCalled());
    const [, body] = updateResourceMock.mock.calls[0];
    expect(body.tags).toEqual({ tier: "gold" });
  });

  it("invalidates the detail keys, toasts, and closes on success", async () => {
    const user = userEvent.setup();
    const { invalidateSpy, onOpenChange } = renderDialog();

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith(
        expect.stringContaining("unit-web-01-renamed"),
        "success",
      ),
    );
    const keys = invalidateSpy.mock.calls.map(
      (c) => (c[0] as { queryKey: unknown[] }).queryKey,
    );
    expect(keys).toContainEqual(["resource", "res-0001"]);
    expect(keys).toContainEqual(["resources"]);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("surfaces the engine's 403 detail string honestly on error", async () => {
    updateResourceMock.mockRejectedValue(new Error("denied"));
    const user = userEvent.setup();
    const { onOpenChange } = renderDialog();

    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() =>
      expect(showToastMock).toHaveBeenCalledWith("denied", "error"),
    );
    // The dialog stays open so the operator can retry or cancel.
    expect(onOpenChange).not.toHaveBeenCalledWith(false);
  });
});
