// Shapes mirror the Cloudflare adapter serializers and the warp.status op
// payload (the ops bridge types bodies as unknown).

export interface CfTunnel {
  id: string;
  name: string;
  status: string; // healthy | inactive | degraded | down (Cloudflare-side)
  connections: number;
}

export interface AccessApp {
  id: string;
  name: string;
  domain: string;
  type: string;
  session_duration: string;
  created_at: string;
}

// Drift between the registry's desired WARP exposure and live Cloudflare.
export interface WarpStatus {
  to_create: unknown[];
  to_delete: unknown[];
  split_tunnel_changed: boolean;
  converged: boolean;
}
