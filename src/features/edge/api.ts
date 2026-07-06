import { executeOp } from "@/lib/api/ops";

import type { AccessApp, CfTunnel, WarpStatus } from "./types";

// Edge surfaces are ops-registry-backed (no dedicated REST routes); every
// read here is a Tier-1 viewer op via the bridge. Strictly read-only per
// issue #10 — tunnel/DNS/access-app mutations get no wrappers.
export const fetchTunnels = async (providerId: string): Promise<CfTunnel[]> => {
  const env = await executeOp<CfTunnel[]>("cloudflare.tunnel.list", {
    provider_id: providerId,
  });
  return env.data;
};

export const fetchAccessApps = async (
  providerId: string,
): Promise<AccessApp[]> => {
  const env = await executeOp<AccessApp[]>(
    "cloudflare.zerotrust.access-apps.list",
    { provider_id: providerId },
  );
  return env.data;
};

export const fetchWarpStatus = async (
  providerId: string,
): Promise<WarpStatus> => {
  // WarpParams keys this as `provider`, unlike the CloudflareScopedParams ops.
  const env = await executeOp<WarpStatus>("warp.status", {
    provider: providerId,
  });
  return env.data;
};
