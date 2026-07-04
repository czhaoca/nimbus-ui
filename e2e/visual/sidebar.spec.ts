import { test, expect } from "@playwright/test";

test.describe("Sidebar visual regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("expanded state", async ({ page }) => {
    const sidebar = page.locator("[data-sidebar='sidebar']");
    await expect(sidebar).toBeVisible();
    await expect(sidebar).toHaveScreenshot("sidebar-expanded.png", {
      maxDiffPixelRatio: 0.01,
    });
  });

  test("collapsed state", async ({ page }) => {
    const trigger = page.locator("[data-sidebar='trigger']");
    if (await trigger.isVisible()) {
      await trigger.click();
      await page.waitForTimeout(300);
    }
    const sidebar = page.locator("[data-sidebar='sidebar']");
    await expect(sidebar).toHaveScreenshot("sidebar-collapsed.png", {
      maxDiffPixelRatio: 0.01,
    });
  });
});
