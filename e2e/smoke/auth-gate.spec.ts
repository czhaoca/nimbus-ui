import { test, expect } from "@playwright/test";

import { mockEngine } from "../support/harness";

// The scoping landmine pinned as behavior (#32): a 401 from auth/me must
// render the login card, NOT the shell. The old visual scaffold only ever
// rendered the shell because the engine was down (no 401, just a failed
// fetch) — this spec is what makes that distinction load-bearing.
test.describe("Auth gate smoke", () => {
  test("401 from auth/me renders the login card, not the shell", async ({
    page,
  }) => {
    await mockEngine(page);
    // Routes match last-registered-first: this override wins over the
    // harness's 200 stub without forking the harness.
    await page.route("**/api/v1/auth/me", (route) =>
      route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Not authenticated" }),
      }),
    );
    await page.goto("/");

    await expect(page.getByText("Sign in to continue")).toBeVisible();
    await expect(page.getByLabel("Username")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Sign In" })).toBeVisible();

    // The authed shell must NOT mount alongside the login card.
    await expect(page.locator('[data-slot="sidebar"]')).toHaveCount(0);
    await expect(page.getByText("Total Resources")).toHaveCount(0);
  });
});
