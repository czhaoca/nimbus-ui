import { test, expect } from "@playwright/test";

test.describe("Providers page visual regression", () => {
  test("default view", async ({ page }) => {
    await page.goto("/providers");
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveScreenshot("providers-default.png", {
      maxDiffPixelRatio: 0.01,
      fullPage: true,
    });
  });
});
