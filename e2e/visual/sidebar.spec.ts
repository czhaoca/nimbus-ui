import { test, expect } from "@playwright/test";

import { expectSeededTheme, mockEngine, seedTheme } from "../support/harness";

// Element-scoped shots (the keeper pattern from the original scaffold):
// [data-sidebar='sidebar'] stays visible when collapsed because AppSidebar
// uses collapsible="icon" (src/components/Sidebar.tsx).
test.describe("Sidebar visual regression", () => {
  test.beforeEach(async ({ page }) => {
    await mockEngine(page);
    await seedTheme(page, "dark");
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expectSeededTheme(page, "dark");
  });

  test("expanded state", async ({ page }) => {
    const sidebar = page.locator("[data-sidebar='sidebar']");
    await expect(sidebar).toBeVisible();
    await expect(sidebar).toHaveScreenshot("sidebar-expanded.png");
  });

  test("collapsed state", async ({ page }) => {
    await page.locator("[data-sidebar='trigger']").click();
    // Deterministic wait: the sidebar wrapper stamps data-state="collapsed"
    // (the old 300ms timeout raced the 200ms width transition; the
    // screenshot stability loop absorbs the tail of the animation).
    await expect(
      page.locator('[data-slot="sidebar"][data-state="collapsed"]'),
    ).toBeAttached();
    const sidebar = page.locator("[data-sidebar='sidebar']");
    await expect(sidebar).toHaveScreenshot("sidebar-collapsed.png");
  });
});
