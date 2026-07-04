import { test, expect } from "@playwright/test";

test.describe("Dashboard visual regression", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
  });

  test("light theme", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await expect(page).toHaveScreenshot("dashboard-light.png", {
      maxDiffPixelRatio: 0.01,
      fullPage: true,
    });
  });

  test("dark theme", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await expect(page).toHaveScreenshot("dashboard-dark.png", {
      maxDiffPixelRatio: 0.01,
      fullPage: true,
    });
  });
});
