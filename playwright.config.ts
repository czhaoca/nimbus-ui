import { defineConfig, devices } from "@playwright/test";

// Governed URLs come from the environment, never from committed files
// (registry rule): when E2E_BASE_URL is set the suite targets it and no
// local dev server is booted; the default is the workstation-local dev
// server on Next's default port.
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./test-results",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [["html", { outputFolder: "./playwright-report", open: "never" }]],
  expect: {
    // Global screenshot policy (#31, hoisted from per-shot options):
    // one tolerance everywhere, CSS animations frozen, caret hidden.
    // JS-driven chart animation settles via toHaveScreenshot's
    // two-consecutive-frames stability loop.
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      animations: "disabled",
      caret: "hide",
    },
  },
  use: {
    baseURL,
    // Determinism pins (#31): ActivityWidget renders toLocaleString(),
    // so fixture timestamps must not shift with workstation settings.
    locale: "en-US",
    timezoneId: "UTC",
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  projects: [
    {
      // Functional DOM asserts — the CI-gating project (#32 adds specs).
      name: "chromium-smoke",
      testMatch: /e2e\/smoke\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Screenshot comparison — a local tool; baselines are gitignored
      // and platform-suffixed (see e2e/README.md).
      name: "chromium-visual",
      testMatch: /e2e\/visual\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      // Seed-tolerant specs for the gated engine job (#33) — need a REAL
      // demo-seeded engine behind the UI proxy; excluded from the local
      // test:e2e default because they fail by design without one.
      name: "chromium-engine",
      testMatch: /e2e\/engine\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  // With E2E_BASE_URL set the target is already serving (a governed env
  // or a CI service container) — booting a local dev server would test
  // the wrong thing.
  ...(process.env.E2E_BASE_URL
    ? {}
    : {
        webServer: {
          command: "pnpm dev",
          url: "http://localhost:3000",
          reuseExistingServer: !process.env.CI,
          timeout: 30_000,
        },
      }),
});
