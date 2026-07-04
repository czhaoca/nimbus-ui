"use client";

import { useQuery } from "@tanstack/react-query";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { fetchCidrAllocations } from "./api";

export function CidrTable() {
  const { data: allocations, isLoading } = useQuery({
    queryKey: ["cidr-allocations"],
    queryFn: fetchCidrAllocations,
    refetchInterval: 60_000,
  });

  if (isLoading) return <Skeleton className="h-60 rounded-xl" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>CIDR Allocations</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Network</TableHead>
              <TableHead>CIDR</TableHead>
              <TableHead>Provider</TableHead>
              <TableHead>Site</TableHead>
              <TableHead>VLAN</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!allocations || allocations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No CIDR allocations registered.
                </TableCell>
              </TableRow>
            ) : (
              allocations.map((alloc) => (
                <TableRow key={alloc.id}>
                  <TableCell className="font-medium">{alloc.network_name || "-"}</TableCell>
                  <TableCell className="font-mono text-sm">{alloc.cidr_block}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{alloc.provider_type}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{alloc.site_label || "-"}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {alloc.vlan_id != null ? alloc.vlan_id : "-"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        alloc.status === "active"
                          ? "default"
                          : alloc.status === "planned"
                            ? "secondary"
                            : "destructive"
                      }
                    >
                      {alloc.status || "active"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
