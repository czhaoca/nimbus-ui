"use client";

import { useState } from "react";

import { PlanDiffView } from "./PlanDiffView";
import { PlanTreeView } from "./PlanTreeView";

type Tab = "tree" | "diff";

export function NetworkPlanPage() {
  const [tab, setTab] = useState<Tab>("tree");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Network Plan</h1>
        <p className="text-muted-foreground">
          CIDR master plan across all sites and providers.
        </p>
      </div>

      <div className="flex gap-2 border-b pb-2">
        <button
          onClick={() => setTab("tree")}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            tab === "tree"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Plan Tree
        </button>
        <button
          onClick={() => setTab("diff")}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            tab === "diff"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Plan vs Actual
        </button>
      </div>

      {tab === "tree" && <PlanTreeView />}
      {tab === "diff" && <PlanDiffView />}
    </div>
  );
}
