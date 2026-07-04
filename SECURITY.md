# Security & Privacy Conventions

This repo uses [repo-privacy-kit](https://github.com/czhaoca/repo-privacy-kit):

- **Never commit** secrets, API keys, private IPs/CIDRs, internal hostnames,
  or governed port bindings. The pre-commit hook scans staged files.
- Private values live in `local/` (gitignored) or a secrets vault — never in
  tracked files. Use placeholders (`<hostname>`, `{{TOKEN}}`) in docs.
- Per-repo scan exceptions are declared in `.githooks/allowlist.conf` with a
  justification comment per entry.
