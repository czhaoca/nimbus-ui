import { test, expect } from "@playwright/test";

import { mockEngine } from "../support/harness";

// Functional pin of the sidebar toggle: the desktop wrapper stamps
// data-state (src/components/ui/sidebar/sidebar.tsx), no pixels involved.
test.describe("Sidebar smoke", () => {
  test("toggles expanded → collapsed → expanded", async ({ page }) => {
    await mockEngine(page);
    await page.goto("/");

    const wrapper = page.locator('[data-slot="sidebar"]').first();
    await expect(wrapper).toHaveAttribute("data-state", "expanded");

    await page.locator("[data-sidebar='trigger']").click();
    await expect(wrapper).toHaveAttribute("data-state", "collapsed");

    await page.locator("[data-sidebar='trigger']").click();
    await expect(wrapper).toHaveAttribute("data-state", "expanded");
  });
});
