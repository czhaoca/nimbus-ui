/**
 * Repo guard (#41, epic contract-mirror-deletion): a regression pin on
 * engine-checkout path citations — nothing under src/ may reference the
 * engine source tree by its checkout path prefix (the NEEDLE below, the
 * literal coupling idiom the pre-#41 mirrors carried). Contract types
 * cite the vendored schema
 * (src/lib/api/schema.d.ts) or the committed WS catalog
 * (contracts/ws-events.json, czhaoca/nimbus) instead. Scope is
 * deliberately this narrow (#41 pre-decided "grep for the literal, no
 * lint-plugin machinery"): DEC-4 hand-written interfaces still cite
 * their engine serializer in the sanctioned `file.py:NN` house style
 * (AGENTS.md Contract Workflow) — that idiom is out of scope here. The
 * needle is assembled at runtime so this guard never matches itself.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const NEEDLE = ["engine", "nimbus"].join("/");
const SRC_ROOT = path.resolve(process.cwd(), "src");

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

describe("engine-checkout citation guard", () => {
  it("src/ never cites the engine source tree by checkout path", () => {
    const offenders = walk(SRC_ROOT).flatMap((file) =>
      readFileSync(file, "utf8")
        .split("\n")
        .flatMap((line, idx) =>
          line.includes(NEEDLE)
            ? [`${path.relative(SRC_ROOT, file)}:${idx + 1}: ${line.trim()}`]
            : [],
        ),
    );
    expect(offenders).toEqual([]);
  });
});
