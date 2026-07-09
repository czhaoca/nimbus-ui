/**
 * Pins src/lib/types/index.ts (#23/G3): the hand-written shims and verb
 * union are constructed/enumerated in full (they are locally owned), and
 * the contract aliases are spot-pinned with expectTypeOf. The type-level
 * assertions are validated by `pnpm typecheck` (tests are included in
 * tsconfig); at runtime they are no-ops, per DEC-4 the aliases' real test
 * is the compiler.
 */
import { describe, expect, expectTypeOf, it } from "vitest";

import type {
  ActionResult,
  BudgetRule,
  HealthStatus,
  Provider,
  ResourceAction,
} from "@/lib/types";

describe("hand-written shims (awaiting backend-typed responses, #248)", () => {
  it("ActionResult carries the four response fields", () => {
    const sample: ActionResult = {
      resource_id: "r-1",
      action: "stop",
      status: "ok",
      detail: "stopped",
    };
    expect(Object.keys(sample).sort()).toEqual([
      "action",
      "detail",
      "resource_id",
      "status",
    ]);
  });

  it("HealthStatus carries the health-endpoint triple", () => {
    const sample: HealthStatus = {
      status: "ok",
      app: "nimbus",
      version: "0.0.0-test",
    };
    expect(Object.keys(sample).sort()).toEqual(["app", "status", "version"]);
  });
});

describe("ResourceAction verb union", () => {
  // `satisfies` rejects an invalid verb; toEqualTypeOf fails typecheck if
  // the union gains or loses a member without this list being updated.
  const VERBS = [
    "stop",
    "start",
    "terminate",
    "health_check",
  ] as const satisfies readonly ResourceAction[];

  it("enumerates exactly the four verbs", () => {
    expectTypeOf<(typeof VERBS)[number]>().toEqualTypeOf<ResourceAction>();
    expect(VERBS).toHaveLength(4);
  });
});

describe("contract alias spot-pins (compile-time)", () => {
  it("Provider exposes the load-bearing registry fields", () => {
    expectTypeOf<Provider>().toHaveProperty("id");
    expectTypeOf<Provider>().toHaveProperty("display_name");
    expectTypeOf<Provider>().toHaveProperty("provider_type");
    expectTypeOf<Provider>().toHaveProperty("is_active");
    expectTypeOf<Provider["id"]>().toEqualTypeOf<string>();
    expectTypeOf<Provider["is_active"]>().toEqualTypeOf<boolean>();
  });

  it("BudgetRule exposes the guardian fields", () => {
    expectTypeOf<BudgetRule>().toHaveProperty("monthly_limit");
    expectTypeOf<BudgetRule>().toHaveProperty("action_on_exceed");
    expectTypeOf<BudgetRule["monthly_limit"]>().toEqualTypeOf<number>();
  });
});
