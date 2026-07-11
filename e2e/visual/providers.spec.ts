import { test, expect } from "@playwright/test";

import { expectSeededTheme, mockEngine, seedTheme } from "../support/harness";

test.describe("Providers page visual regression", () => {
  test("default view", async ({ page }) => {
    await mockEngine(page);
    // The page's default is dark; seed + assert it explicitly so this shot
    // is pinned to a theme rather than to next-themes' fallback behavior.
    await seedTheme(page, "dark");
    await page.goto("/providers");
    await page.waitForLoadState("networkidle");
    await expectSeededTheme(page, "dark");
    await expect(page).toHaveScreenshot("providers-default.png", {
      fullPage: true,
    });
  });
});
