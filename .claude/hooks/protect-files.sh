#!/usr/bin/env bash
# Claude Code hook: block writes to sensitive file paths
# Triggered by PreToolUse on Write/Edit tools
set -euo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ]; then
  exit 0
fi

# Block writes to local/ directories (secrets)
if echo "$FILE_PATH" | grep -q '/local/'; then
  echo "BLOCKED: Cannot write to local/ directory (contains secrets)." >&2
  echo "  Path: $FILE_PATH" >&2
  echo "  Use templates/ for config templates instead." >&2
  exit 2
fi

# Block writes to .env (but allow .env.example)
BASENAME=$(basename "$FILE_PATH")
if [[ "$BASENAME" == ".env" ]]; then
  echo "BLOCKED: Cannot write to .env file (may contain secrets)." >&2
  echo "  Path: $FILE_PATH" >&2
  echo "  Edit .env.example for templates, or use local/config/ for actual values." >&2
  exit 2
fi

# Block writes to private key files
if echo "$FILE_PATH" | grep -qE '\.(pem|key|p12|pfx)$'; then
  echo "BLOCKED: Cannot write private key files." >&2
  echo "  Path: $FILE_PATH" >&2
  echo "  Store keys in local/api-keys/ or local/ssh/ (gitignored)." >&2
  exit 2
fi

exit 0
