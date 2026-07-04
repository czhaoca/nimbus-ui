"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { apiFetch } from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SearchResult {
  id: string;
  type: "resource" | "provider" | "workflow" | "budget_rule";
  name: string;
  description: string;
  provider_id?: string;
  status?: string;
  url: string;
}

const TYPE_LABELS: Record<string, string> = {
  resource: "Resource",
  provider: "Provider",
  workflow: "Workflow",
  budget_rule: "Budget Rule",
};

const TYPE_COLOR: Record<string, string> = {
  resource: "bg-blue-500/20 text-blue-400 border-transparent",
  provider: "bg-purple-500/20 text-purple-400 border-transparent",
  workflow: "bg-amber-500/20 text-amber-400 border-transparent",
  budget_rule: "bg-emerald-500/20 text-emerald-400 border-transparent",
};

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const doSearch = useCallback(async () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q: query.trim() });
      if (typeFilter !== "all") params.set("type", typeFilter);
      const data = await apiFetch<SearchResult[]>(`/api/search?${params}`);
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, [query, typeFilter]);

  useEffect(() => {
    doSearch();
  }, [doSearch]);

  const filteredResults =
    typeFilter === "all" ? results : results.filter((r) => r.type === typeFilter);

  const typeCounts = results.reduce<Record<string, number>>((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div>
      <PageHeader title={query ? `Search results for "${query}"` : "Search"} />

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {!query.trim() && (
        <p className="text-muted-foreground text-sm">
          Enter a search term in the header search bar to find resources, providers, workflows, and more.
        </p>
      )}

      {query.trim() && (
        <>
          {/* Type filter pills */}
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <Button
              variant={typeFilter === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => setTypeFilter("all")}
            >
              All ({results.length})
            </Button>
            {Object.entries(TYPE_LABELS).map(([key, label]) => {
              const count = typeCounts[key] || 0;
              if (count === 0) return null;
              return (
                <Button
                  key={key}
                  variant={typeFilter === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => setTypeFilter(key)}
                >
                  {label} ({count})
                </Button>
              );
            })}
          </div>

          {/* Results */}
          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : filteredResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Search size={32} className="mb-2 opacity-40" />
              <p className="text-sm">No results found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredResults.map((r) => (
                <Link key={r.id} href={r.url} className="block">
                  <Card className="py-0 hover:border-primary transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Badge className={TYPE_COLOR[r.type] || "bg-gray-500/20 text-gray-400 border-transparent"}>
                          {TYPE_LABELS[r.type] || r.type}
                        </Badge>
                        <h3 className="font-medium">{r.name}</h3>
                        {r.status && (
                          <Badge
                            className={
                              r.status === "running" || r.status === "active"
                                ? "bg-emerald-500/20 text-emerald-400 border-transparent"
                                : r.status === "stopped" || r.status === "inactive"
                                  ? "bg-gray-500/20 text-gray-400 border-transparent"
                                  : "bg-amber-500/20 text-amber-400 border-transparent"
                            }
                          >
                            {r.status}
                          </Badge>
                        )}
                      </div>
                      {r.description && (
                        <p className="text-sm text-muted-foreground mt-1">{r.description}</p>
                      )}
                      {r.provider_id && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Provider: {r.provider_id}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
