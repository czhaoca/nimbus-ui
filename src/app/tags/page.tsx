"use client";

import { useState, useEffect, useMemo } from "react";
import { Tag, Filter } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import Link from "next/link";
import { apiFetch } from "@/lib/api/client";
import type { Resource } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function TagsPage() {
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    apiFetch<Resource[]>("/api/resources")
      .then(setResources)
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    resources.forEach((r) => {
      Object.keys(r.tags).forEach((k) => tagSet.add(k));
    });
    return Array.from(tagSet).sort();
  }, [resources]);

  const filteredResources = useMemo(() => {
    let result = resources;
    if (selectedTags.size > 0) {
      result = result.filter((r) =>
        Array.from(selectedTags).every((tag) => tag in r.tags),
      );
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (r) =>
          r.display_name.toLowerCase().includes(term) ||
          r.external_id.toLowerCase().includes(term),
      );
    }
    return result;
  }, [resources, selectedTags, searchTerm]);

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => {
      const next = new Set(prev);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  };

  if (loading) {
    return (
      <div className="flex gap-6">
        <aside className="w-64 shrink-0">
          <Skeleton className="h-64 w-full" />
        </aside>
        <div className="flex-1 space-y-4">
          <Skeleton className="h-10 w-full" />
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Tag filter sidebar */}
      <aside className="w-64 shrink-0">
        <Card className="py-4">
          <CardHeader className="px-4 py-0">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Filter size={16} className="text-muted-foreground" />
              Filter by Tags
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4">
            {allTags.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No tags found on any resources.
              </p>
            ) : (
              <div className="space-y-1">
                {allTags.map((tag) => (
                  <Button
                    key={tag}
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleTag(tag)}
                    className={`w-full justify-start ${
                      selectedTags.has(tag)
                        ? "bg-blue-600/20 text-blue-400 hover:bg-blue-600/30 hover:text-blue-400"
                        : "text-muted-foreground"
                    }`}
                  >
                    <Tag size={12} className="mr-2" />
                    {tag}
                  </Button>
                ))}
              </div>
            )}

            {selectedTags.size > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedTags(new Set())}
                className="mt-3 w-full"
              >
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      </aside>

      {/* Resource cards */}
      <div className="flex-1">
        <PageHeader
          title="Tag Manager"
          icon={<Tag size={20} />}
          action={
            <Input
              type="text"
              placeholder="Search resources..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-xs"
            />
          }
        />

        <p className="text-sm text-muted-foreground mb-4">
          {filteredResources.length} resource{filteredResources.length !== 1 && "s"}
          {selectedTags.size > 0 &&
            ` matching ${selectedTags.size} tag${selectedTags.size !== 1 ? "s" : ""}`}
        </p>

        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {filteredResources.map((r) => (
            <Card key={r.id} className="py-4">
              <CardContent className="px-4">
                <Link
                  href={`/resources/${r.id}`}
                  className="block text-sm font-semibold text-foreground hover:text-primary transition-colors truncate mb-2"
                >
                  {r.display_name || r.external_id}
                </Link>

                <div className="text-xs text-muted-foreground mb-3">
                  {r.provider_id} &middot; {r.resource_type}
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {Object.entries(r.tags).map(([k, v]) => (
                    <Badge
                      key={k}
                      variant={selectedTags.has(k) ? "default" : "secondary"}
                      className={`cursor-pointer ${
                        selectedTags.has(k)
                          ? "bg-blue-600/20 text-blue-400 border-transparent hover:bg-blue-600/30"
                          : ""
                      }`}
                      onClick={() => toggleTag(k)}
                    >
                      <Tag size={10} />
                      {k}={String(v)}
                    </Badge>
                  ))}
                  {Object.keys(r.tags).length === 0 && (
                    <span className="text-xs text-muted-foreground italic">
                      No tags
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredResources.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Tag size={32} className="mb-2 opacity-40" />
            <p className="text-sm">No resources match the selected filters.</p>
          </div>
        )}
      </div>
    </div>
  );
}
