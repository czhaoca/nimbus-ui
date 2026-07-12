import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Resource } from "../types";

export function TagsPanel({ tags }: { tags: Resource["tags"] }) {
  const entries = Object.entries(tags ?? {});

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Tags</CardTitle>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tags.</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {entries.map(([key, val]) => (
              <Badge key={key} variant="outline" className="font-normal">
                <span className="font-medium text-foreground">{key}</span>
                {val != null && val !== "" && (
                  <span className="text-muted-foreground">: {String(val)}</span>
                )}
              </Badge>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
