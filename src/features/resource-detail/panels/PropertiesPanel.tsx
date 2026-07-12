import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatTimestamp } from "@/lib/format";
import type { Resource } from "../types";

export function PropertiesPanel({ resource }: { resource: Resource }) {
  const props = [
    { label: "Resource ID", value: resource.id },
    { label: "External ID", value: resource.external_id },
    { label: "Provider", value: resource.provider_id },
    { label: "Type", value: resource.resource_type },
    { label: "Name Prefix", value: resource.name_prefix || "—" },
    { label: "Status", value: resource.status },
    { label: "Created", value: formatTimestamp(resource.created_at) },
    { label: "Updated", value: formatTimestamp(resource.updated_at) },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Properties</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
          {props.map((prop) => (
            <div key={prop.label}>
              <dt className="text-muted-foreground text-xs">{prop.label}</dt>
              <dd className="mt-0.5 font-mono text-xs break-all">{prop.value}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}
