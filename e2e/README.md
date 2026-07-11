# nimbus-ui e2e

Playwright suite in two projects (`playwright.config.ts`):

| Project | Match | Role |
|---|---|---|
| `chromium-smoke` | `e2e/smoke/**` | Functional DOM asserts — the CI-gating suite (#32) |
| `chromium-visual` | `e2e/visual/**` | Screenshot comparison — a **local tool**, not CI-gating |

Both run on the **hermetic harness** (`e2e/support/`): every engine
endpoint the pages fire is fulfilled from typed fixtures, `GET
/api/v1/auth/me` returns 200 (the authed shell renders because auth
succeeds, not because an engine happens to be down), and `/ws` is kept
off the wire with `routeWebSocket` (mocked-open — no reconnect churn).
Fixture shapes are `import type`-checked against the typed client's DEC-4
shims, so contract drift in a fixture is a compile error.

Themes are seeded per test **before first paint** (`seedTheme` writes
next-themes' `theme` localStorage key in an init script) and every themed
spec asserts the `<html>` class actually matches before screenshotting —
the guard against the old `emulateMedia` defect where "light" silently
rendered dark.

## Running

```bash
pnpm test:e2e:smoke    # functional smoke (CI-gating once #33 lands)
pnpm test:e2e:visual   # visual comparison against local baselines
pnpm test:e2e          # everything
pnpm exec playwright install chromium   # once, if browsers are absent
```

`E2E_BASE_URL` targets an already-running instance (a governed URL from
the environment registry — never hardcode one) and skips the local
`webServer` boot:

```bash
E2E_BASE_URL=<governed-url> pnpm test:e2e:smoke
```

## Visual baselines (local-only)

Baselines are **not committed**: snapshot names are platform-suffixed
(`-darwin` locally vs `-linux` in CI images — different files *and*
different rendering), so committed macOS baselines would be dead weight
and committed-from-one-workstation baselines a flake source. While the
visual project is a local tool, `e2e/**/*-snapshots/`,
`playwright-report/`, and `test-results/` stay gitignored.

First run / intentional UI change — regenerate, then eyeball the diff:

```bash
rm -rf e2e/visual/*-snapshots/   # force fresh renders (see below)
pnpm test:e2e:update             # writes e2e/visual/*.spec.ts-snapshots/*-darwin.png
pnpm test:e2e:visual             # must be green against the fresh baselines
```

Delete before regenerating: `--update-snapshots` keeps any baseline that
still matches within `maxDiffPixelRatio`, so a small intentional change
(e.g. a fixture string) can silently survive in old pixels while the run
reports green.

## Future CI gating (deferred — see the e2e-enablement brief)

Graduating visual to a CI gate needs **Linux** baselines generated inside
the same image the CI step runs (`mcr.microsoft.com/playwright:v1.58.2-noble`):

```bash
docker run --rm -v "$PWD":/work -w /work \
  mcr.microsoft.com/playwright:v1.58.2-noble \
  bash -lc "corepack enable && pnpm install --frozen-lockfile && pnpm test:e2e:update"
```

That ticket un-ignores `e2e/**/*-snapshots/`, commits the `-linux`
baselines, and wires the CI step. Decision record: nimbus repo
`design/brainstorms/e2e-enablement.md`.
