"use client";

import { useEffect, useRef } from "react";
import { upsertCartSession } from "@/actions/cart-sessions";
import {
  cartContactIsIdentifiable,
  getOrCreateCartGuestKey,
  readStoredCartContact,
} from "@/lib/cart-sessions/client";
import { snapshotItemsFromCart } from "@/lib/cart-sessions/map";
import { countCartPallets } from "@/lib/shipping-method";
import { useCartStore } from "@/lib/store/useCartStore";

/**
 * Debounced persistence of cart snapshots for authenticated shoppers,
 * and for guests once ZIP/contact is available (checkout address).
 */
export function CartSessionSync() {
  const items = useCartStore((state) => state.items);
  const getDiscountedTotal = useCartStore((state) => state.getDiscountedTotal);
  const hydrated = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPayload = useRef("");

  useEffect(() => {
    if (useCartStore.persist.hasHydrated()) {
      hydrated.current = true;
      return;
    }
    return useCartStore.persist.onFinishHydration(() => {
      hydrated.current = true;
    });
  }, []);

  useEffect(() => {
    if (!hydrated.current && !useCartStore.persist.hasHydrated()) return;

    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const guestKey = getOrCreateCartGuestKey();
      const contact = readStoredCartContact();
      const snapshots = snapshotItemsFromCart(items);
      const subtotalUsd = getDiscountedTotal();
      const totalPallets = countCartPallets(items);
      const fingerprint = JSON.stringify({
        guestKey,
        contact,
        snapshots,
        subtotalUsd,
        totalPallets,
      });
      if (fingerprint === lastPayload.current) return;
      lastPayload.current = fingerprint;

      // Server decides auth vs guest eligibility; skip obvious empty guest noise.
      if (snapshots.length === 0 && !cartContactIsIdentifiable(contact) && !guestKey) {
        return;
      }

      void upsertCartSession({
        guestKey,
        items: snapshots,
        subtotalUsd,
        totalPallets,
        ...contact,
      });
    }, 800);

    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [items, getDiscountedTotal]);

  return null;
}
