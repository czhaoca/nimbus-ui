import { test, expect } from "@playwright/test";

/**
 * Gated-job specs (#33): run against a REAL demo-seeded engine
 * (`nimbus db init && nimbus db seed --demo && nimbus serve`) reached
 * through the UI's rewrite proxy — no route mocks, no hermetic fixtures.
 *
 * Asserts are seed-CONTRACT-tolerant: the demo dataset guarantees
 * `demo-*` ids and a non-empty inventory (backend
 * design/shared/dev-db-bootstrap.md, #246 DEC-9) — never exact values.
 * CI-unverified until the owner stages the ghcr pull secret and flips
 * the e2e-gate filter (runbook: e2e/README.md).
 */

// The engine's documented first-run bootstrap defaults (ensure_admin_exists;
// the committed LoginPage prints them) — documentation values, not live
// secrets; override via env for any non-default engine deployment.
const ENGINE_CREDENTIALS = {
  username: process.env.E2E_ENGINE_USER ?? "admin",
  password: process.env.E2E_ENGINE_PASSWORD ?? "changeme",
};

test.describe("Seeded-engine e2e", () => {
  test.beforeEach(async ({ page, request }) => {
    // DEC-A (API login): the request context posts through the same Next
    // rewrite proxy a browser login uses; AppShell's gate only checks the
    // /auth/me probe, so a valid seeded token renders the authed shell.
    const resp = await request.post("/api/v1/auth/login", {
      data: ENGINE_CREDENTIALS,
    });
    expect(resp.ok(), `engine login failed: HTTP ${resp.status()}`).toBeTruthy();
    const body = (await resp.json()) as {
      access_token: string;
      username: string;
      role: string;
    };
    await page.addInitScript(
      ([token, user]) => {
        window.sessionStorage.setItem("nimbus_token", token);
        window.sessionStorage.setItem("nimbus_user", user);
      },
      [
        body.access_token,
        JSON.stringify({ username: body.username, role: body.role }),
      ] as const,
    );
  });

  test("renders the authed dashboard with non-empty seeded inventory", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Dashboard" }),
    ).toBeVisible();
    // Seed contract: demo-* providers/resources exist, so the honest
    // empty states must NOT render.
    await expect(page.getByText(/demo-/).first()).toBeVisible({
      timeout: 15_000,
    });
    await expect(page.getByText("No providers configured.")).toHaveCount(0);
    await expect(page.getByText(/no resources found/i)).toHaveCount(0);
  });

  test("a resource detail page loads from a dashboard card link", async ({
    page,
  }) => {
    await page.goto("/");
    // ResourceCard's title links to /resources/[id].
    const firstResourceLink = page.locator('a[href^="/resources/"]').first();
    await expect(firstResourceLink).toBeVisible({ timeout: 15_000 });
    await firstResourceLink.click();
    await expect(page).toHaveURL(/\/resources\/.+/);
    await expect(page.getByText(/demo-/).first()).toBeVisible();
    // #35 hardening: the detail page must render real panel content, not
    // just navigate — a Properties label plus a seeded demo-* display name
    // in the page heading (seed-CONTRACT-tolerant: never exact values).
    await expect(page.getByText("Properties", { exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByRole("heading", { level: 1 }).filter({ hasText: /demo-/ }),
    ).toBeVisible();
  });
});
