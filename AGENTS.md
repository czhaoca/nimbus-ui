# nimbus-ui — Agent Operating Contract

## Registry Metadata

- **Project name**: `nimbus` (this repo ships the `ui` service of that project)
- **Repository**: `git@github.com:czhaoca/nimbus-ui.git`
- **Description**: Next.js 15 dashboard for the Nimbus platform — a standalone
  consumer of the versioned `/api/v1` contract
- **Image**: `ghcr.io/czhaoca/nimbus-ui` (published by `.woodpecker.yml` on
  main pushes; the backend repo's compose pulls it by tag)
- **Deploy**: governed via the Nimbus environment registry — host ports, IPs,
  and URLs always come from the registry, never from committed files
- **Env types / slot**: canonical `dev`/`prod` per the registry; `ui` does not
  reserve its own slot — it deploys inside the `nimbus` project's slot
  alongside `api` (see the nimbus repo's AGENTS.md "Governed Environments")

## Services

| Service | Container Port | Protocol | Health Endpoint |
|---------|----------------|----------|-----------------|
| ui | 3000 | http | / |

`3000` is the internal container port only. Never hardcode governed host
ports; local `pnpm dev` / compose ports are workstation defaults.

## Contract Workflow (ADR-0008)

- The **vendored schema** `src/lib/api/schema.d.ts` (openapi-typescript
  output) is the contract; it is never hand-edited. `package.json` →
  `nimbusContract` pins the semver. With a backend checkout at `../nimbus`:
  `pnpm sync-contract` refreshes it, `pnpm check-contract` exits non-zero on
  drift (without a checkout it prints that the vendored schema is
  authoritative and succeeds). Drift is a signal for a deliberate contract
  bump — a dedicated commit updating schema + pin together — not something to
  silently re-sync mid-feature.
- All requests go through the path-typed openapi-fetch client
  (`src/lib/api/client.ts`). **Only `/api/v1` paths** — the engine's legacy
  unversioned `/api` alias is never referenced. `pnpm typecheck` is the
  contract test.
- **Type aliasing (DEC-4)**: never hand-copy a shape that exists as a named
  schema component — alias it in `src/lib/types/index.ts`
  (`Schemas["..."]`) so contract breaks surface as compile errors.
  Hand-written interfaces are allowed only for responses the schema types as
  `unknown`, and must cite the engine serializer they mirror.
- **Ops bridge**: engine operations without dedicated REST routes are
  reachable via the schema-present `POST /api/v1/ops/{op_id}` (shared helper
  `src/lib/api/ops.ts`). The registry enforces tier gates server-side
  (Tier-1 = viewer reads; Tier-2+ = operator/admin, 403 on denial) and writes
  audit rows. UI role checks are cosmetic only.
- WS events are typed in `src/lib/api/ws-events.ts`, mirroring the backend's
  committed `ws-events.json`; unknown event types are log-and-ignore.

## Verification Gate

Every change must pass, in order, before commit:

```bash
pnpm test && pnpm typecheck && pnpm lint && pnpm build
```

Unit tests are Vitest 4 + jsdom + Testing Library (`vitest.config.ts`;
jsdom over happy-dom was panel-decided in issue #3 — the component surface is
portal/focus-heavy radix-ui). `vitest.setup.ts` carries load-bearing
Request/fetch shims for openapi-fetch's at-import captures — do not remove
them. `pnpm test:e2e` (Playwright smoke + visual) runs hermetically against
route-mocked fixtures — the `e2e-smoke` suite gates CI; visual baselines stay
local-only. Only `pnpm test:e2e:engine` needs a real engine; its `e2e-gate`
CI step is real but disabled pending nimbus GAP-014 (runbook: `e2e/README.md`).

## Feature Conventions

- **Tests-first**: capture the failing test before implementing.
- Feature modules live at `src/features/<name>/` (`types.ts`, `api.ts`,
  `<Name>Page.tsx`, `__tests__/`); route wrappers at `src/app/<route>/page.tsx`
  are thin, alias the feature import, and name their default export with the
  `Page` suffix.
- **Convention scope (GAP-001, decided 2026-07-06)**: the module convention
  binds new routes and any route being **materially changed**. Routes that
  predate the convention (the inline implementations under `src/app/`) are
  **grandfathered as-is**; migrate a grandfathered route to a feature module
  when it is next materially touched — never as bulk churn.
- **Honest degradation**: never render fabricated values (a $0 for a provider
  whose cost API is unsupported, a client-computed next-run the engine does
  not store). Missing data gets an explicit unknown/unsupported state, and
  deferred surfaces are named in-page (op id) rather than omitted silently.
- **Read-only first (DEC-1)**: coverage pages ship without mutation
  affordances unless the ticket says otherwise; pin that with a
  no-mutating-affordances test.

## Commit QA Workflow

Use `/commit-with-qa` for any **material** commit: more than 5 files, more
than 2 semantic categories, or any touch of `AGENTS.md`, `CLAUDE.md`,
`.githooks/`, `.woodpecker.yml`, or `src/lib/api/`. Below the threshold,
direct `git commit` is allowed with a one-paragraph rationale in the body.

## Work-Order Queue

Roadmap work is staged as self-contained GitHub issues labeled `work-order`
with `Epic:` / `Sequence: NN` / `Next: #N` headers. Execute via the
user-level `/issue-resolver` skill: fresh-load each ticket at head, resolve
DEC-X points with a pre-edit audit comment on the issue, TDD-execute, run the
verification gate, commit, close with evidence, then loop. Decision records
live in the backend repo (`design/brainstorms/`).

## Privacy & Safety (repo-privacy-kit)

- **Never commit** secrets, API keys, tokens, private IPs/CIDRs, internal
  hostnames, live target IDs, or governed port bindings. The pre-commit hook
  blocks them; the allowlist is `.githooks/allowlist.conf`.
- Test fixtures use RFC 5737 documentation ranges (`192.0.2.0/24`,
  `198.51.100.0/24`) — the hook rejects RFC-1918 ranges.
- Private/live values belong in `local/` (gitignored) or the runtime
  database, never in source or commit messages.
- When the permission classifier denies an action (e.g. pushing to `main`),
  stop that path and hand the owner a ready-to-run command instead — never
  route around a denial.
