import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/lib/api/client";

export type Me = Awaited<ReturnType<typeof getMe>>;

/**
 * Shared ["auth-me"] role read (#34) — staleTime Infinity because the role is
 * session-static. Gating on isOperator is cosmetic only: the engine enforces
 * tiers server-side regardless of what the UI renders.
 */
export function useMe() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["auth-me"],
    queryFn: getMe,
    staleTime: Infinity,
  });
  return {
    me: data ?? null,
    isOperator: data?.role === "operator" || data?.role === "admin",
    isLoading,
    error,
  };
}
