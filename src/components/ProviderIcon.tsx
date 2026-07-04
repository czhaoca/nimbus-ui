import type { FC, SVGProps } from "react";
import { Server } from "lucide-react";
import { cn } from "@/lib/utils";

import OracleIcon from "@/assets/provider-icons/oracle.svg";
import AwsIcon from "@/assets/provider-icons/aws.svg";
import AzureIcon from "@/assets/provider-icons/azure.svg";
import GcpIcon from "@/assets/provider-icons/gcp.svg";
import CloudflareIcon from "@/assets/provider-icons/cloudflare.svg";
import ProxmoxIcon from "@/assets/provider-icons/proxmox.svg";

interface ProviderMeta {
  label: string;
  color: string;
  SvgIcon: FC<SVGProps<SVGSVGElement>>;
}

const PROVIDER_META: Record<string, ProviderMeta> = {
  oci:        { label: "Oracle Cloud",         color: "#F80000", SvgIcon: OracleIcon },
  aws:        { label: "Amazon Web Services",  color: "#FF9900", SvgIcon: AwsIcon },
  azure:      { label: "Microsoft Azure",      color: "#0078D4", SvgIcon: AzureIcon },
  gcp:        { label: "Google Cloud",         color: "#4285F4", SvgIcon: GcpIcon },
  cloudflare: { label: "Cloudflare",           color: "#F38020", SvgIcon: CloudflareIcon },
  proxmox:    { label: "Proxmox VE",           color: "#E57000", SvgIcon: ProxmoxIcon },
};

export function getProviderMeta(type: string) {
  const meta = PROVIDER_META[type];
  return meta ? { label: meta.label, color: meta.color } : { label: type, color: "#6B7280" };
}

interface ProviderIconProps {
  type: string;
  size?: number;
  className?: string;
}

export function ProviderIcon({ type, size = 20, className }: ProviderIconProps) {
  const meta = PROVIDER_META[type];

  if (!meta) {
    return <Server size={size} className={cn("text-muted-foreground shrink-0", className)} />;
  }

  const { SvgIcon, color } = meta;
  return (
    <span className={cn("inline-flex shrink-0", className)} style={{ color }}>
      <SvgIcon width={size} height={size} />
    </span>
  );
}
