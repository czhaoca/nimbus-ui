# CLAUDE.md — nimbus-ui Core Rules

Read **[AGENTS.md](AGENTS.md)** first — it is the repo's operating contract
(registry metadata, contract workflow, verification gate, feature
conventions, queue mechanics). This file repeats only the hard rules.

## Hard Rules (Non-Negotiable)

- **Never commit** secrets, API keys, tokens, private IPs/CIDRs, internal
  hostnames, live target IDs, or governed port bindings — in any file or
  commit message. Test fixtures use RFC 5737 documentation ranges. Private
  values live in `local/` (gitignored) or the runtime database.
- **Contract only**: consume the engine exclusively through the vendored
  `/api/v1` schema (`src/lib/api/schema.d.ts`, refreshed by
  `pnpm sync-contract`) and the typed client — never engine internals, never
  the legacy unversioned `/api` alias. Do not hand-edit the vendored schema;
  alias schema shapes instead of copying them.
- **Governed access comes from the Nimbus environment registry** — never
  infer host ports, IPs, or URLs from compose files, `.env` examples, or old
  docs. Container port 3000 is internal.
- **Verification gate before commit**:
  `pnpm test && pnpm typecheck && pnpm lint && pnpm build`.
- **Classifier denials**: stop that path, hand the owner a ready-to-run
  command, and never switch tools or models to route around a denial.
