import { api, unwrap } from "@/lib/api/client";

import type {
  CidrAllocation,
  HealthCheckResult,
  RegistryPortPool,
  RegistryProject,
  RegistrySlot,
  RegistryTarget,
  ValidationResult,
} from "./types";

export const fetchRegistrySlots = () =>
  unwrap<RegistrySlot[]>(api.GET("/api/v1/access-registry"));

export const fetchRegistryTargets = () =>
  unwrap<RegistryTarget[]>(api.GET("/api/v1/targets"));

export const fetchRegistryPortPools = () =>
  unwrap<RegistryPortPool[]>(api.GET("/api/v1/port-pools"));

export const fetchRegistryProjects = () =>
  unwrap<RegistryProject[]>(api.GET("/api/v1/projects"));

export const fetchCidrAllocations = () =>
  unwrap<CidrAllocation[]>(api.GET("/api/v1/cidr-allocations"));

export const fetchProjectCompose = (project: string, env: string, template = false) =>
  unwrap<string>(
    api.GET("/api/v1/projects/{project_name}/docker-compose", {
      params: { path: { project_name: project }, query: { env, template } },
    }),
  );

export const validateDeployment = (project: string, env: string) =>
  unwrap<ValidationResult>(
    api.POST("/api/v1/deploy/validate", {
      params: { query: { project_name: project, env_type: env } },
    }),
  );

export const triggerHealthCheck = (slotId: string) =>
  unwrap<HealthCheckResult>(
    api.POST("/api/v1/slots/{slot_id}/health-check", {
      params: { path: { slot_id: slotId } },
    }),
  );

export const syncProxmoxTargets = (providerId: string) =>
  unwrap<RegistryTarget[]>(
    api.POST("/api/v1/targets/sync/proxmox/{provider_id}", {
      params: { path: { provider_id: providerId } },
    }),
  );
