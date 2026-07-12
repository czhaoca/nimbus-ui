"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";

// The standalone dependency page is absorbed by the detail page (#35); the
// anchor lands on the Dependencies panel.
export default function DependenciesRedirectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  useEffect(() => {
    router.replace(`/resources/${id}#dependencies`);
  }, [router, id]);
  return null;
}
