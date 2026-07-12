// Typed-client façade for the resource-detail module — all engine access
// stays on the /api/v1 contract client.
export {
  getActionLogs,
  getResource,
  getResourceDependencies,
  getResourceMetrics,
  updateResource,
} from "@/lib/api/client";
