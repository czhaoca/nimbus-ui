"use client";

import { useErrors } from "@/lib/hooks/useApi";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { clearErrors as clearErrorsApi } from "@/lib/api/client";
import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function ErrorsPage() {
  const { data, isLoading } = useErrors();
  const qc = useQueryClient();
  const clearMut = useMutation({
    mutationFn: clearErrorsApi,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["errors"] }),
  });

  const errors = data?.errors ?? [];

  return (
    <div>
      <PageHeader
        title="Error Log"
        action={
          errors.length > 0 ? (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => clearMut.mutate()}
              disabled={clearMut.isPending}
            >
              Clear All ({data?.total ?? 0})
            </Button>
          ) : undefined
        }
      />

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : errors.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
          <AlertTriangle size={32} className="mb-2 opacity-40" />
          <p className="text-sm">No errors recorded.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {errors.map((e, i) => (
            <Card key={i} className="py-3">
              <CardContent className="space-y-2">
                <div className="flex items-center gap-3">
                  <Badge variant="destructive">{e.error_type}</Badge>
                  <Badge variant="secondary">{e.source}</Badge>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {new Date(e.timestamp * 1000).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm">{e.message}</p>
                {Object.keys(e.context).length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                      Context
                    </summary>
                    <pre className="mt-1 p-3 rounded bg-muted text-xs overflow-auto max-h-40">
                      {JSON.stringify(e.context, null, 2)}
                    </pre>
                  </details>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
