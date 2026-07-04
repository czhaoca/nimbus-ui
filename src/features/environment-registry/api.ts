import { apiFetch } from "@/lib/api/client";

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
  apiFetch<RegistrySlot[]>("/api/access-registry");

export const fetchRegistryTargets = () =>
  apiFetch<RegistryTarget[]>("/api/targets");

export const fetchRegistryPortPools = () =>
  apiFetch<RegistryPortPool[]>("/api/port-pools");

export const fetchRegistryProjects = () =>
  apiFetch<RegistryProject[]>("/api/projects");

export const fetchCidrAllocations = () =>
  apiFetch<CidrAllocation[]>("/api/cidr-allocations");

export const fetchProjectCompose = (project: string, env: string, template = false) =>
  apiFetch<string>(`/api/projects/${project}/docker-compose?env=${env}&template=${template}`);

export const validateDeployment = (project: string, env: string) =>
  apiFetch<ValidationResult>(`/api/deploy/validate?project_name=${project}&env_type=${env}`, {
    method: "POST",
  });

export const triggerHealthCheck = (slotId: string) =>
  apiFetch<HealthCheckResult>(`/api/slots/${slotId}/health-check`, {
    method: "POST",
  });

export const syncProxmoxTargets = (providerId: string) =>
  apiFetch<RegistryTarget[]>(`/api/targets/sync/proxmox/${providerId}`, {
    method: "POST",
  });
