# nimbus-ui e2e

Playwright suite in two projects (`playwright.config.ts`):

| Project | Match | Role |
|---|---|---|
| `chromium-smoke` | `e2e/smoke/**` | Functional DOM asserts — the CI-gating suite (`e2e-smoke` step) |
| `chromium-visual` | `e2e/visual/**` | Screenshot comparison — a **local tool**, not CI-gating |
| `chromium-engine` | `e2e/engine/**` | Seed-tolerant specs vs a real demo-seeded engine — the gated `e2e-gate` job (CI-unverified) |

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
pnpm test:e2e:smoke    # functional smoke (the CI gate)
pnpm test:e2e:visual   # visual comparison against local baselines
pnpm test:e2e          # both local suites (smoke + visual)
pnpm test:e2e:engine   # engine-backed specs — needs a real engine, see below
pnpm exec playwright install chromium   # once, if browsers are absent
```

Locally the config boots `next dev` automatically. In CI the smoke step
sets `E2E_WEB_SERVER=standalone` to serve the build step's prebuilt
output instead (`node .next/standalone/server.js` after the standalone
asset copies) — no cold compile, small memory footprint on the runner.

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

## The engine-backed gate (`e2e/engine/`, CI-unverified)

The `chromium-engine` project runs seed-tolerant specs against a **real**
demo-seeded engine (`nimbus db init && nimbus db seed --demo && nimbus
serve` — backend `design/shared/dev-db-bootstrap.md`). It is excluded
from the local `pnpm test:e2e` default because without an engine it
fails by design (`pnpm test:e2e:engine` to run it deliberately; login
posts through the UI proxy, so a missing engine fails fast at
`/api/v1/auth/login`). Credentials come from `E2E_ENGINE_USER` /
`E2E_ENGINE_PASSWORD`, defaulting to the engine's documented first-run
bootstrap values. In CI the `e2e-gate` step boots the UI dev server
in-step with `NIMBUS_API_URL` pointed at the engine sidecar; for a
future externally-hosted UI target, `E2E_BASE_URL` is the seam instead.

## Enabling the engine gate (owner runbook)

The `engine` + `e2e-gate` steps in `.woodpecker.yml` are real but kept
skipped by a constant-false `when:` filter until pulling
`ghcr.io/czhaoca/nimbus/engine` is authorized for this repo (nimbus
GAP-014). Names and procedure only — **never** put a secret value in any
committed file:

1. **Mint** a fine-grained GitHub PAT with `read:packages` scoped to the
   `nimbus` repo's packages (the same shape backend #297 proved pullable).
2. **Stage it as a registry credential** in Woodpecker — repo
   `nimbus-ui` → Settings → Registries → add `ghcr.io` with username
   `czhaoca` and the PAT as password. (Private *image pulls*
   authenticate via the repo's registry credentials, not via
   `from_secret` env — `from_secret` is only how the publish step gets
   its push token.)
3. **Flip both `when:` filters** — the `engine` and `e2e-gate` steps
   share the GAP-014 constant-false guard; replace each with a real
   event filter, e.g. `when: { event: [push, pull_request], branch: main }`.
4. **Expect a first-run fix pass.** The gate is explicitly CI-unverified
   until this flip: the engine sidecar's shell/entrypoint behavior,
   pull latency, and seed timing are unproven on the runner. Treat the
   first red as in-scope debugging, not a revert signal.

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
