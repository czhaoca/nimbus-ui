"use client";

import { useQuery } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import Link from "next/link";

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

import { fetchRegistryProjects } from "./api";

export function ProjectsTable() {
  const { data: projects, isLoading } = useQuery({
    queryKey: ["registry-projects"],
    queryFn: fetchRegistryProjects,
    refetchInterval: 30_000,
  });

  if (isLoading) return <Skeleton className="h-60 rounded-xl" />;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Registered Projects</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Active Slots</TableHead>
              <TableHead>Repo</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!projects || projects.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No projects registered.
                </TableCell>
              </TableRow>
            ) : (
              projects.map((project) => (
                <TableRow key={project.id}>
                  <TableCell>
                    <Link
                      href={`/environments/${project.name}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {project.name}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm max-w-xs truncate">
                    {project.description || "-"}
                  </TableCell>
                  <TableCell>
                    <Badge variant={project.active_slot_count > 0 ? "default" : "secondary"}>
                      {project.active_slot_count}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {project.repo_url ? (
                      <a
                        href={project.repo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-muted-foreground hover:text-primary"
                      >
                        <ExternalLink className="size-4" />
                      </a>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={project.is_active ? "default" : "secondary"}>
                      {project.is_active ? "active" : "inactive"}
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
