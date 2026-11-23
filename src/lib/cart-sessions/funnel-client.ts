"use client";

import { recordCartFunnelEvent } from "@/actions/cart-sessions";
import { getOrCreateCartGuestKey } from "./client";
import type { CartFunnelEventName } from "./types";

export function trackCartFunnelEvent(input: {
  eventName: CartFunnelEventName;
  palletCount?: number;
  cartValueUsd?: number;
  metadata?: Record<string, unknown>;
}): void {
  if (typeof window === "undefined") return;
  const guestKey = getOrCreateCartGuestKey();
  void recordCartFunnelEvent({
    eventName: input.eventName,
    guestKey: guestKey || null,
    palletCount: input.palletCount,
    cartValueUsd: input.cartValueUsd,
    metadata: input.metadata,
  }).catch(() => {
    // best-effort analytics
  });
}
