export interface PlanTreeNode {
  id: number;
  provider_type: string;
  cidr_block: string;
  network_name: string;
  site_label: string;
  vlan_id: number | null;
  status: string;
  gateway_ip: string;
  children: PlanTreeNode[];
}

export interface PlanDiffItem {
  id: number;
  cidr_block: string;
  name: string;
  provider: string;
}

export interface PlanDiff {
  planned_unmatched: PlanDiffItem[];
  active_unplanned: PlanDiffItem[];
  matched_count: number;
}
