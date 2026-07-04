#!/usr/bin/env bash
# Claude Code hook: auto-lint files after Write/Edit
# Triggered by PostToolUse on Write/Edit tools
# Non-blocking (exit 0 always)
set -uo pipefail

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')

if [ -z "$FILE_PATH" ] || [ ! -f "$FILE_PATH" ]; then
  exit 0
fi

# Python files: run ruff
if echo "$FILE_PATH" | grep -qE '\.py$'; then
  if command -v ruff &>/dev/null; then
    ruff check --fix --quiet "$FILE_PATH" 2>/dev/null || true
    ruff format --quiet "$FILE_PATH" 2>/dev/null || true
  fi
fi

# TypeScript/JavaScript files: run eslint if available
if echo "$FILE_PATH" | grep -qE '\.(ts|tsx|js|jsx)$'; then
  PROJECT_DIR=$(echo "$INPUT" | jq -r '.cwd // empty')
  if [ -n "$PROJECT_DIR" ] && [ -f "$PROJECT_DIR/node_modules/.bin/eslint" ]; then
    "$PROJECT_DIR/node_modules/.bin/eslint" --fix --quiet "$FILE_PATH" 2>/dev/null || true
  fi
fi

exit 0
