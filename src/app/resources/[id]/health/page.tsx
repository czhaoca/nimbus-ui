"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";

// The health timeline stub is retired (#35): per-resource health history has
// no /api/v1 endpoint, and the detail page names that gap in-page.
export default function HealthRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  useEffect(() => {
    router.replace(`/resources/${id}`);
  }, [router, id]);
  return null;
}
