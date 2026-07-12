// Contract-typed aliases only (DEC-4): the user shape is schema-derived —
// no hand interface, so contract drift surfaces as compile errors (#42).
export type { UserOut as User } from "@/lib/api/client";

// The UI's offered role choices for the create/role Selects — an input
// constant, not a response narrowing (the contract types role as string).
export const ROLES = ["admin", "operator", "viewer"] as const;
export type Role = (typeof ROLES)[number];
