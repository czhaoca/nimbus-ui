"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { searchResources } from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface SearchResult {
  id: string;
  provider_id: string;
  resource_type: string;
  display_name: string;
  status: string;
  tags: Record<string, string> | null;
}

export default function SearchPage() {
  const searchParams = useSearchParams();
  const query = searchParams.get("q") || "";

  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doSearch = useCallback(async () => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await searchResources(query.trim());
      setResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    doSearch();
  }, [doSearch]);

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
          Enter a search term in the header search bar to find resources.
        </p>
      )}

      {query.trim() && (
        <>
          {/* /api/v1 exposes resource search only (resources/search); the old
              cross-entity search (providers, workflows, budget rules) has no
              contract endpoint and is deferred. */}
          <p className="text-xs text-muted-foreground mb-4">
            Searching resources by name, type, provider, and tags. Provider,
            workflow, and budget-rule search is not yet exposed by the /api/v1
            contract.
          </p>

          {loading ? (
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Search size={32} className="mb-2 opacity-40" />
              <p className="text-sm">No results found.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {results.map((r) => (
                <Link key={r.id} href={`/resources/${r.id}`} className="block">
                  <Card className="py-0 hover:border-primary transition-colors">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Badge className="bg-blue-500/20 text-blue-400 border-transparent">
                          {r.resource_type}
                        </Badge>
                        <h3 className="font-medium">{r.display_name}</h3>
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
                      <p className="text-xs text-muted-foreground mt-1">
                        Provider: {r.provider_id}
                      </p>
                      {r.tags && Object.keys(r.tags).length > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {Object.entries(r.tags)
                            .map(([k, v]) => `${k}=${v}`)
                            .join(" · ")}
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
