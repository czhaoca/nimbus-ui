import { test, expect } from "@playwright/test";

import { mockEngine } from "../support/harness";

// Smoke = DOM asserts on concrete fixture values (#32) — platform-independent,
// no screenshots. Values come from e2e/support/fixtures.ts; if a fixture or
// widget changes, the matching assert here must fail (non-vacuity proven in
// the ticket by a mutate-observe-revert check).
test.describe("Dashboard smoke", () => {
  test.beforeEach(async ({ page }) => {
    await mockEngine(page);
    await page.goto("/");
  });

  test("renders the authed shell with fixture health version", async ({ page }) => {
    // Scoped to the header: the footer also renders "Nimbus v0.0.0-e2e".
    await expect(page.locator("header").getByText("v0.0.0-e2e")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  });

  test("stats card counts the three fixture resources", async ({ page }) => {
    const totalCard = page
      .locator("div")
      .filter({ hasText: /^TOTAL RESOURCES$/i })
      .locator("..");
    await expect(page.getByText("Total Resources")).toBeVisible();
    await expect(totalCard.getByText("3", { exact: true })).toBeVisible();
  });

  test("renders fixture providers and resources", async ({ page }) => {
    await expect(page.getByText("OCI Demo").first()).toBeVisible();
    await expect(page.getByText("Proxmox Demo").first()).toBeVisible();
    // exact: the activity feed also mentions these names inside longer
    // strings ("health_recovery: demo-web-01").
    await expect(page.getByText("demo-web-01", { exact: true })).toBeVisible();
    await expect(page.getByText("demo-worker-01", { exact: true })).toBeVisible();
    await expect(page.getByText("demo-lab-vm", { exact: true })).toBeVisible();
  });

  test("renders the fixture budget warning row", async ({ page }) => {
    await expect(page.getByText("approaching monthly limit")).toBeVisible();
    await expect(page.getByText("$18.75").first()).toBeVisible();
  });

  test("renders the fixture activity feed", async ({ page }) => {
    await expect(
      page.getByText("stop demo-worker-01 (completed)"),
    ).toBeVisible();
    // Locale/timezone pin (en-US/UTC) makes this rendering deterministic.
    await expect(page.getByText("6/30/2026, 2:05:00 PM")).toBeVisible();
  });

  test("renders the honest notifications empty state", async ({ page }) => {
    await expect(
      page.getByText(
        "Live incidents since page load — the engine keeps no notification history.",
      ),
    ).toBeVisible();
    await expect(page.getByText("No incidents this session.")).toBeVisible();
  });
});
