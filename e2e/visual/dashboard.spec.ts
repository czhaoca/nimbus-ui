import { test, expect } from "@playwright/test";

import {
  expectSeededTheme,
  mockEngine,
  seedTheme,
  type SeededTheme,
} from "../support/harness";

// #31: both themes run on the hermetic harness — engine mocked, auth 200,
// WS off the wire — and each shot is guarded by an <html>-class assert so
// a silently-unapplied theme can never freeze into a baseline again.
test.describe("Dashboard visual regression", () => {
  for (const theme of ["light", "dark"] as SeededTheme[]) {
    test(`${theme} theme`, async ({ page }) => {
      await mockEngine(page);
      await seedTheme(page, theme);
      await page.goto("/");
      await page.waitForLoadState("networkidle");
      await expectSeededTheme(page, theme);
      await expect(page).toHaveScreenshot(`dashboard-${theme}.png`, {
        fullPage: true,
      });
    });
  }
});
