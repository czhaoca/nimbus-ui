export interface RegistryEndpoint {
  id: string;
  service_name: string;
  protocol: string;
  host_port: number;
  container_port: number;
  access_url: string;
  health_endpoint: string;
  is_public: boolean;
  notes: string;
}

export interface RegistrySlot {
  id: string;
  project_id: string;
  project_name: string;
  env_type: string;
  slot_key: string;
  display_name: string;
  status: string;
  target_inventory_id: string | null;
  target_display: string;
  node_name: string;
  network_address: string;
  public_address: string;
  public_base_url: string;
  notes: string;
  requested_by: string;
  reserved_at: string | null;
  released_at: string | null;
  service_summary: string;
  endpoints: RegistryEndpoint[];
}

export interface RegistryTarget {
  id: string;
  provider_id: string;
  provider_type: string;
  node_name: string;
  target_type: string;
  external_id: string;
  display_name: string;
  hostname: string;
  network_address: string;
  public_address: string;
  network_config: string;
  status: string;
  is_allocatable: boolean;
  notes: string;
  metadata_json: Record<string, unknown>;
  last_seen_at: string;
  available_for_slot: boolean;
}

export interface RegistryPortPool {
  id: string;
  target_inventory_id: string;
  name: string;
  description: string;
  port_start: number;
  port_end: number;
  is_default: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface RegistryProject {
  id: string;
  name: string;
  description: string;
  repo_url: string;
  is_active: boolean;
  active_slot_count: number;
  created_at: string;
  updated_at: string;
}

export interface CidrAllocation {
  id: number;
  provider_type: string;
  cidr_block: string;
  network_name: string;
  tenancy_alias: string | null;
  region: string;
  external_id: string;
  gateway_ip: string;
  is_active: boolean;
  notes: string;
  status: string;
  site_label: string;
  vlan_id: number | null;
  parent_allocation_id: number | null;
  created_at: string;
}

export interface ValidationResult {
  project_name: string;
  env_type: string;
  passed: boolean;
  checks: { name: string; passed: boolean; message: string }[];
}

export interface HealthCheckResult {
  checked_at: string;
  all_healthy: boolean;
  results: { service_name: string; health_url: string; healthy: boolean }[];
}

export interface PortConflict {
  port: number;
  target: string;
  target_id: string;
  slot_a: string;
  slot_b: string;
  endpoint_count: number;
}
