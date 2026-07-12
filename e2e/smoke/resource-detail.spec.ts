import { test, expect } from "@playwright/test";

import { mockEngine } from "../support/harness";

// Detail-page smoke (#35) — DOM asserts on concrete fixture values, same
// locator discipline as dashboard.spec.ts (exact where ambiguous, no
// screenshots). Values come from e2e/support/fixtures.ts.
test.describe("Resource detail smoke", () => {
  test.beforeEach(async ({ page }) => {
    await mockEngine(page);
  });

  test("navigates from the dashboard card to the detail panels", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "demo-web-01" }).click();
    await expect(page).toHaveURL(/\/resources\/res-0001$/);

    // Header resolves the provider identity through the providers fixture.
    await expect(page.getByRole("heading", { name: "demo-web-01" })).toBeVisible();
    await expect(page.getByText("Oracle Cloud")).toBeVisible();

    // Panels render the fixture resource.
    await expect(page.getByText("Properties", { exact: true })).toBeVisible();
    await expect(page.getByText("e2e-fixture-instance-0001")).toBeVisible();
    await expect(page.getByText("$12.50")).toBeVisible();

    // Honest contract-gap line for the retired health surface.
    await expect(
      page.getByText(/health history is not exposed by the \/api\/v1 contract/),
    ).toBeVisible();

    // Dependency chips resolve neighbor names and carry the edge.type label.
    await expect(page.getByText("demo-worker-01", { exact: true })).toBeVisible();
    await expect(page.getByText("network", { exact: true })).toBeVisible();
    await expect(page.getByText("demo-lab-vm", { exact: true })).toBeVisible();
    await expect(page.getByText("storage", { exact: true })).toBeVisible();

    // Action history renders the fixture rows (UTC-pinned formatter).
    await expect(page.getByText("health_check", { exact: true })).toBeVisible();
    await expect(page.getByText("Jun 30, 2026, 2:05 PM UTC")).toBeVisible();
  });

  test("the dependencies sub-route redirects to the detail anchor", async ({
    page,
  }) => {
    await page.goto("/resources/res-0001/dependencies");
    await expect(page).toHaveURL(/\/resources\/res-0001#dependencies$/);
    await expect(page.locator("#dependencies")).toBeVisible();
  });

  test("the health sub-route redirects to the detail page", async ({ page }) => {
    await page.goto("/resources/res-0001/health");
    await expect(page).toHaveURL(/\/resources\/res-0001$/);
    await expect(
      page.getByText(/health history is not exposed by the \/api\/v1 contract/),
    ).toBeVisible();
  });
});
