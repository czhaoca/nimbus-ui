"use client";

import { use } from "react";

import { ResourceDetailPage } from "@/features/resource-detail/ResourceDetailPage";

export default function ResourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  return <ResourceDetailPage resourceId={id} />;
}
