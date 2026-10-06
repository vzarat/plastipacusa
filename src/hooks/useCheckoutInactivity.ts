"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/** 15 minutes of no interaction on /checkout. */
export const CHECKOUT_INACTIVITY_MS = 15 * 60 * 1000;

const ACTIVITY_EVENTS = ["mousemove", "keydown", "click", "touchstart", "scroll"] as const;

function isCheckoutRoute(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname === "/checkout" || pathname.startsWith("/checkout/");
}

export function useCheckoutInactivity(timeoutMs = CHECKOUT_INACTIVITY_MS) {
  const pathname = usePathname();
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const watching = isCheckoutRoute(pathname) && !pathname?.startsWith("/checkout/success");

  useEffect(() => {
    if (!watching) {
      setIsSessionExpired(false);
      return;
    }
    if (isSessionExpired) return;

    let timer = window.setTimeout(() => {
      setIsSessionExpired(true);
    }, timeoutMs);

    const onActivity = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        setIsSessionExpired(true);
      }, timeoutMs);
    };

    for (const eventName of ACTIVITY_EVENTS) {
      window.addEventListener(eventName, onActivity, { passive: true, capture: true });
    }

    return () => {
      window.clearTimeout(timer);
      for (const eventName of ACTIVITY_EVENTS) {
        window.removeEventListener(eventName, onActivity, { capture: true });
      }
    };
  }, [watching, isSessionExpired, timeoutMs]);

  return { isSessionExpired, setIsSessionExpired };
}
