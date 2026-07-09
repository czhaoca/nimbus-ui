# Requirement Gaps — nimbus-ui

Architectural gap register maintained by `/alignment-cleanup` (created
2026-07-06, round 1). Each row records an owner decision and links the
work-order issue that implements it. Tactical/trivial gaps do not get rows —
they live in their issues and commit messages.

| ID | Date | Gap | Decision | Rationale | Status | Issue |
|---|---|---|---|---|---|---|
| GAP-001 | 2026-07-06 | 22 pre-convention routes in `src/app` hold full inline implementations (134–504 lines), while AGENTS.md states the thin-wrapper/feature-module convention unconditionally and the 10 post-convention routes follow it. | Grandfather + migrate-on-touch: amend AGENTS.md to scope the convention — new routes and any route being materially changed must be feature modules; pre-convention routes are grandfathered as-is. No bulk migration. | All 22 pages are gate-green and working; a bulk migration is weeks of churn and regression risk with no user-visible gain. The convention stays binding for all new/touched work. | Resolved | [#14](https://github.com/czhaoca/nimbus-ui/issues/14) |
| GAP-002 | 2026-07-06 | Vendored `/api/v1` contract (pin 1.0.0) is behind the backend: ADR-0009 scanner lease-gating params (`holder`/`force`, additive) landed upstream; `pnpm check-contract` is red, masking any future real drift. | Deliberate contract bump per AGENTS.md: `pnpm sync-contract` + `nimbusContract` pin bump in one dedicated commit, full gate verified. | Drift is additive so no UI break is expected, but a red check-contract hides new breaking drift; the bump restores the tripwire. | Resolved | [#19](https://github.com/czhaoca/nimbus-ui/issues/19) |
| GAP-003 | 2026-07-09 | Vendored `/api/v1` contract is behind the backend again: `@nimbus/api-types` 1.1.0 landed upstream (doc-only — SonarQube status field gains a `crashed` state, backend #291) while the pin is 1.0.0; `pnpm check-contract` is red, masking any future real drift. | Deliberate contract bump per AGENTS.md: `pnpm sync-contract` + `nimbusContract` pin 1.0.0→1.1.0 in one dedicated commit, full gate verified. | Drift is doc-only additive with no UI consumer of the changed field, so no UI break; a red check-contract hides new breaking drift; the bump restores the tripwire. | Resolved | [#21](https://github.com/czhaoca/nimbus-ui/issues/21) |
