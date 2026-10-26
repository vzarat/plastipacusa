"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { metaPixelId, trackPageView } from "@/lib/meta-pixel";

/**
 * The base snippet in the document head records the first PageView.
 * This records another PageView on client navigations, not the first load.
 */
export function MetaPixel() {
  const pixelId = metaPixelId();
  const pathname = usePathname();
  const skipInitialView = useRef(true);

  useEffect(() => {
    if (!pixelId) return;
    if (skipInitialView.current) {
      skipInitialView.current = false;
      return;
    }
    trackPageView();
  }, [pathname, pixelId]);

  return null;
}
