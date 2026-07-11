import { test, expect } from "@playwright/test";

import { mockEngine } from "../support/harness";

test.describe("Cross-page navigation smoke", () => {
  test("sidebar link routes to the providers page", async ({ page }) => {
    await mockEngine(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    // Multi-item sidebar groups start collapsed unless a child is active
    // (Collapsible defaultOpen={hasActive} in src/components/Sidebar.tsx),
    // so expand the Providers group first — the real user path.
    await page.getByRole("button", { name: "Providers" }).click();
    await page.getByRole("link", { name: "All Providers" }).click();

    await expect(page).toHaveURL(/\/providers$/);
    await expect(page.getByText("Proxmox Demo")).toBeVisible();
  });
});
