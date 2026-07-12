/**
 * Hermetic e2e harness (#31): every engine endpoint the pages fire is
 * fulfilled from fixtures, so specs are deterministic, engine-free, and
 * honest — the shell renders because auth/me returns 200, not because the
 * engine happens to be down.
 */
import { expect, type Page } from "@playwright/test";

import {
  ACTION_LOGS,
  ACTIVITY_FEED,
  BUDGET_STATUSES,
  DASHBOARD_PREFERENCES,
  FIXTURE_USER,
  HEALTH,
  METRICS,
  PROVIDERS,
  PROVIDER_RESILIENCE,
  RESOURCES,
  RESOURCE_DEPENDENCIES,
  RESOURCE_DETAIL,
  SPENDING_HISTORY,
} from "./fixtures";

export type SeededTheme = "light" | "dark";

const json = (body: unknown) => ({
  status: 200,
  contentType: "application/json",
  body: JSON.stringify(body),
});

/**
 * Route-mock the engine. Playwright matches routes last-registered-first,
 * so the catch-all goes in first: any endpoint this map misses is answered
 * with a deterministic 404 instead of leaking to a real (or absent) engine.
 */
export async function mockEngine(page: Page): Promise<void> {
  await page.route("**/api/**", (route) =>
    route.fulfill({
      status: 404,
      contentType: "application/json",
      body: JSON.stringify({ detail: "e2e harness: unmocked endpoint" }),
    }),
  );

  // Exact-path probe match: the previous "**/health" glob also swallowed
  // document navigations to nested /health routes (e.g. the
  // /resources/{id}/health redirect page), fulfilling the page itself with
  // probe JSON.
  await page.route(/^https?:\/\/[^/]+\/health(\?.*)?$/, (route) =>
    route.fulfill(json(HEALTH)),
  );
  await page.route("**/api/v1/auth/me", (route) => route.fulfill(json(FIXTURE_USER)));
  await page.route("**/api/v1/providers", (route) => route.fulfill(json(PROVIDERS)));
  await page.route("**/api/v1/resources", (route) => route.fulfill(json(RESOURCES)));
  // Detail routes (#35): registered after the catch-all — Playwright matches
  // last-registered-first, so these win; the list glob above has no trailing
  // wildcard and never shadows them.
  await page.route("**/api/v1/resources/res-0001", (route) =>
    route.fulfill(json(RESOURCE_DETAIL)),
  );
  await page.route("**/api/v1/resources/res-0001/logs", (route) =>
    route.fulfill(json(ACTION_LOGS)),
  );
  await page.route("**/api/v1/resources/res-0001/dependencies", (route) =>
    route.fulfill(json(RESOURCE_DEPENDENCIES)),
  );
  // Trailing * so the ?hours=N query string still matches (#37).
  await page.route("**/api/v1/resources/res-0001/metrics*", (route) =>
    route.fulfill(json(METRICS)),
  );
  await page.route("**/api/v1/budget/status", (route) =>
    route.fulfill(json(BUDGET_STATUSES)),
  );
  await page.route("**/api/v1/budget/spending-history*", (route) =>
    route.fulfill(json(SPENDING_HISTORY)),
  );
  await page.route("**/api/v1/activity*", (route) =>
    route.fulfill(json(ACTIVITY_FEED)),
  );
  await page.route("**/api/v1/providers/status/resilience", (route) =>
    route.fulfill(json(PROVIDER_RESILIENCE)),
  );
  await page.route("**/api/v1/dashboard/preferences", (route) =>
    route.fulfill(json(DASHBOARD_PREFERENCES)),
  );

  // page.route() cannot intercept WebSocket upgrades; routeWebSocket is the
  // mechanism that actually keeps /ws off the wire. With no
  // connectToServer() the page-side socket opens mocked and stays silent —
  // no engine traffic, no reconnect backoff loop destabilizing networkidle.
  await page.routeWebSocket("**/ws", () => {});
}

/**
 * Seed next-themes' persisted choice BEFORE first paint. The provider
 * (src/providers/ThemeProvider.tsx) sets no custom storageKey, so the
 * default localStorage key "theme" applies; its inline script reads the key
 * at document start and stamps the <html> class.
 */
export async function seedTheme(page: Page, theme: SeededTheme): Promise<void> {
  await page.addInitScript(
    (t) => window.localStorage.setItem("theme", t),
    theme,
  );
}

/**
 * The honest guard from #31: assert the seeded theme was actually applied
 * to <html> before screenshotting — under the old emulateMedia approach
 * "light" still rendered dark and this assert fails.
 */
export async function expectSeededTheme(
  page: Page,
  theme: SeededTheme,
): Promise<void> {
  await expect(page.locator("html")).toHaveClass(new RegExp(`\\b${theme}\\b`));
}
