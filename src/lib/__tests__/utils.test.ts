/**
 * Pins cn() — the clsx + tailwind-merge composition every component
 * class-name path funnels through (#23/G3).
 */
import { describe, expect, it } from "vitest";

import { cn } from "@/lib/utils";

describe("cn", () => {
  it("filters falsy and conditional inputs (clsx semantics)", () => {
    expect(cn("base", false && "off", undefined, null, "", "on")).toBe(
      "base on",
    );
  });

  it("supports clsx array and object forms", () => {
    expect(cn(["a", "b"], { c: true, d: false })).toBe("a b c");
  });

  it("resolves tailwind conflicts in favor of the last class", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-sm", "text-lg")).toBe("text-lg");
  });

  it("merges axis-specific paddings into a later shorthand", () => {
    expect(cn("px-2 py-1", "p-3")).toBe("p-3");
  });

  it("keeps non-conflicting classes side by side", () => {
    expect(cn("p-2", "text-lg")).toBe("p-2 text-lg");
  });
});
