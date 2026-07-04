"use client";

import { useHealth } from "@/lib/hooks/useApi";
import { Separator } from "@/components/ui/separator";

export function Footer() {
  const { data: health } = useHealth();

  return (
    <footer className="px-4 py-2">
      <Separator className="mb-2" />
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>Nimbus v{health?.version ?? "..."}</span>
      </div>
    </footer>
  );
}
