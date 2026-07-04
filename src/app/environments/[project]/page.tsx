"use client";

import { use } from "react";

import { ProjectDetailPage } from "@/features/environment-registry/ProjectDetailPage";

export default function ProjectPage({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project } = use(params);
  return <ProjectDetailPage projectName={project} />;
}
