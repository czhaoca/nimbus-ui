# nimbus-ui

Next.js 15 dashboard for the [Nimbus](https://github.com/czhaoca/nimbus)
infrastructure platform — a standalone API consumer speaking the versioned
`/api/v1` contract.

## Contract pinning

- Pinned contract version: `package.json` → `nimbusContract` (semver; matches
  the backend's `openapi.json` `info.version`).
- The generated schema is **vendored** at `src/lib/api/schema.d.ts`
  (openapi-typescript output). `pnpm typecheck` is the contract test; contract
  bumps arrive as backend-CI commits updating the schema + stamp together.
- WS events are typed in `src/lib/api/ws-events.ts`, mirroring the backend's
  committed `ws-events.json` catalog.

## Dev

```bash
pnpm install
NIMBUS_API_URL=http://localhost:8000 pnpm dev   # server-side /api proxy target
pnpm typecheck && pnpm lint && pnpm build
pnpm test:e2e   # Playwright (visual); needs a running engine
```

The API is consumed exclusively through the server-side rewrite proxy — the
browser never talks to the engine directly. Auth uses a per-consumer key
provisioned by the backend (never committed; see SECURITY.md).
