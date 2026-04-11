"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import * as gtag from "@/lib/gtag";

/**
 * Analytics tracker — standalone component (does NOT wrap children).
 * Must be inside a <Suspense> boundary because useSearchParams() triggers
 * BAILOUT_TO_CLIENT_SIDE_RENDERING for all wrapped children.
 */
export default function AnalyticsProvider() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const url = pathname + searchParams.toString();
    gtag.pageview(url);
  }, [pathname, searchParams]);

  return null;
}
