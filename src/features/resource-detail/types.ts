// Contract-typed aliases only (DEC-4): every shape here is schema-derived.
// Hand-written interfaces are allowed solely for unknown-typed responses
// and must cite the engine serializer they mirror.
export type { ActionLogEntry, Resource, ResourceAction } from "@/lib/types";
export type { ResourceDependencies } from "@/lib/api/client";
