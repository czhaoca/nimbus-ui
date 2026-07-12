import { test, expect } from "@playwright/test";

import { OPERATOR_USER } from "../support/fixtures";
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

    // Metrics panel (#37): the chart region and its period toggle render
    // from the deterministic METRICS fixture.
    await expect(page.getByText("Metrics", { exact: true })).toBeVisible();
    await expect(page.locator('[data-slot="chart"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "1h" })).toBeVisible();
    await expect(page.getByRole("button", { name: "24h" })).toBeVisible();
    await expect(page.getByRole("button", { name: "7d" })).toBeVisible();

    // The harness user is a viewer: the cosmetic operator gate (#36) must
    // render zero action affordances, and no Edit affordance either (#38).
    await expect(page.getByRole("button", { name: "Stop" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Health Check" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Terminate" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Edit" })).toHaveCount(0);
  });

  test("operators see the status-driven action affordances", async ({
    page,
  }) => {
    // Routes match last-registered-first: this override wins over the
    // harness's viewer stub (auth-gate.spec.ts precedent).
    await page.route("**/api/v1/auth/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(OPERATOR_USER),
      }),
    );
    await page.goto("/resources/res-0001");

    await expect(page.getByRole("heading", { name: "demo-web-01" })).toBeVisible();
    // running fixture → Stop / Health Check / Terminate, never Start.
    await expect(page.getByRole("button", { name: "Stop" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Health Check" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Terminate" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Start" })).toHaveCount(0);
  });

  test("operators edit the display name and the page re-renders it", async ({
    page,
  }) => {
    await page.route("**/api/v1/auth/me", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(OPERATOR_USER),
      }),
    );
    await page.goto("/resources/res-0001");
    await expect(page.getByRole("heading", { name: "demo-web-01" })).toBeVisible();

    await page.getByRole("button", { name: "Edit" }).click();
    const nameInput = page.getByLabel("Display name");
    await expect(nameInput).toHaveValue("demo-web-01");
    await nameInput.fill("demo-web-01-renamed");
    await page.getByRole("button", { name: "Save changes" }).click();

    // The stateful harness PUT persists the change; the success-path
    // invalidation refetches and the header re-renders the new name.
    await expect(
      page.getByRole("heading", { name: "demo-web-01-renamed" }),
    ).toBeVisible();
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
