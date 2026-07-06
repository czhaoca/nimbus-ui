# nimbus-ui

Next.js 15 dashboard for the [Nimbus](https://github.com/czhaoca/nimbus)
infrastructure platform — a standalone API consumer speaking the versioned
`/api/v1` contract.

Contributing (human or agent)? Start with **[AGENTS.md](AGENTS.md)** — the
repo's operating contract (contract workflow, verification gate, feature
conventions, privacy rules).

## Contract workflow

- Pinned contract version: `package.json` → `nimbusContract` (semver; matches
  the backend's `openapi.json` `info.version`).
- The generated schema is **vendored** at `src/lib/api/schema.d.ts`
  (openapi-typescript output) and never hand-edited. With a local backend
  checkout at `../nimbus`:
  - `pnpm sync-contract` — refresh the vendored schema from
    `clients/ts/src/schema.d.ts`.
  - `pnpm check-contract` — fail if the vendored copy drifts from the backend
    checkout (absent checkout: the vendored schema is authoritative).
- All requests go through the path-typed openapi-fetch client in
  `src/lib/api/client.ts`: paths, methods, and params are compile-checked
  against the vendored schema, so `pnpm typecheck` is the contract test — a
  nonexistent `/api/v1` path is a compile error. Only `/api/v1` paths exist in
  the schema; the engine's legacy unversioned `/api` alias is never referenced.
- Contract bumps arrive as commits updating the schema + `nimbusContract` pin
  together; a breaking bump should fail `pnpm typecheck` at the affected call
  sites.
- WS events are typed in `src/lib/api/ws-events.ts`, mirroring the backend's
  committed `ws-events.json` catalog.

## Dev

```bash
pnpm install
NIMBUS_API_URL=http://localhost:8000 pnpm dev   # server-side /api proxy target
pnpm typecheck && pnpm lint && pnpm build
pnpm test:e2e   # Playwright (visual); needs a running engine
```

The API is consumed exclusively through the server-side rewrite proxy
(`next.config.ts`, target from `NIMBUS_API_URL`) — the browser never talks to
the engine directly.

## Auth

Human access is username/password: the login page posts to
`/api/v1/auth/login` and the returned JWT is attached as an
`Authorization: Bearer` header to every subsequent request (session-scoped,
never persisted to disk). Roles (`admin` / `operator` / `viewer`) are
enforced engine-side. Per-consumer scoped API keys exist for **machine
consumers only** (CI, MCP) and are provisioned by the backend — never
committed (see SECURITY.md).
