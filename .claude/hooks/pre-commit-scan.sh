#!/usr/bin/env bash
# Claude Code hook: scan for secrets before git commit/add commands
# Triggered by PreToolUse on Bash tool
set -euo pipefail

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Only intercept git commit and git add commands
if ! echo "$COMMAND" | grep -qE '^\s*git\s+(commit|add)'; then
  exit 0
fi

# --- Secret pattern scan on staged files ---
STAGED=$(git diff --cached --name-only 2>/dev/null || true)
if [ -z "$STAGED" ]; then
  exit 0
fi

SECRET_PATTERNS='BEGIN (RSA|PRIVATE|EC|OPENSSH) KEY|password\s*=\s*\S+|token\s*=\s*\S+|secret\s*=\s*\S+|api[_-]?key\s*=\s*\S+|ocid1\.[a-z]+\.oc1\.|AKIA[A-Z0-9]{16}|ghp_[A-Za-z0-9]{36}|sk-[A-Za-z0-9]{48}'

FOUND=""
for f in $STAGED; do
  if [ -f "$f" ]; then
    # Filter out false positives: instance vars (self.), config reads, placeholders
    MATCHES=$(grep -nEi "$SECRET_PATTERNS" "$f" 2>/dev/null | grep -vE 'self\._\w+|config\[|read_text|xxxxxxxx|\.strip\(\)|\.get\(|\.getItem\(|_authToken|sessionStorage|localStorage|\$\{[A-Z_]+[\}:]|==\s*"|openssl rand|settings\.\w+|\.\w*(password|token|secret)\s*=\s*\w+$|=\s*(True|False|None)\b|create_access_token|bcrypt\.hashpw|getattr\(|hashed_password|access_token=\w+|password="changeme"|\w+=\$\(|_password\b|_token=\w+,|="\$[A-Z_]+|f"PVE|{token_' | head -5 || true)
    if [ -n "$MATCHES" ]; then
      # Exclude docs, test files (fake credentials), templates (placeholders),
      # and clients/ (generated contract artifacts derived from the scanned
      # docs/openapi.json — see clients/README.md)
      if [[ "$f" != "CLAUDE.md" && "$f" != "README.md" && "$f" != "requirements/"* && "$f" != "design/"* && "$f" != "docs/src/"* && "$f" != *"/tests/"* && "$f" != "templates/"* && "$f" != "deploy/"* && "$f" != "clients/"* ]]; then
        FOUND="${FOUND}\n  ${f}:\n${MATCHES}\n"
      fi
    fi
  fi
done

if [ -n "$FOUND" ]; then
  echo "BLOCKED: Potential secrets detected in staged files:" >&2
  echo -e "$FOUND" >&2
  echo "Remove secrets and use local/ config files instead." >&2
  exit 2
fi

# --- Check no local/ files staged ---
LOCAL_FILES=$(echo "$STAGED" | grep '/local/' || true)
if [ -n "$LOCAL_FILES" ]; then
  echo "BLOCKED: local/ files are staged for commit:" >&2
  echo "$LOCAL_FILES" >&2
  echo "Unstage with: git reset HEAD <file>" >&2
  exit 2
fi

# --- Check no private IP addresses in staged files ---
IP_PATTERNS='10\.[0-9]+\.[0-9]+\.[0-9]+|172\.(1[6-9]|2[0-9]|3[01])\.[0-9]+\.[0-9]+|192\.168\.[0-9]+\.[0-9]+'
for f in $STAGED; do
  if [ -f "$f" ] && [[ "$f" != "CLAUDE.md" && "$f" != "README.md" && "$f" != "requirements/"* && "$f" != "design/"* && "$f" != "*.md" ]]; then
    IP_MATCHES=$(grep -nE "$IP_PATTERNS" "$f" 2>/dev/null | head -3 || true)
    if [ -n "$IP_MATCHES" ]; then
      echo "WARNING: Private IP addresses found in $f:" >&2
      echo "$IP_MATCHES" >&2
      echo "Ensure these are placeholders, not real infrastructure IPs." >&2
      # Warning only, not blocking
    fi
  fi
done

exit 0
