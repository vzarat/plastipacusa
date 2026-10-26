"use client";

import { applyCouponCode } from "@/actions/coupons";
import { resolveMetaCartLines } from "@/actions/meta-checkout";
import { parseMetaProducts } from "@/lib/meta-checkout";
import { useCartStore } from "@/lib/store/useCartStore";
import { toast } from "sonner";

/** Replace the cart with the Meta Commerce `products` list and optional coupon. */
export async function applyMetaCheckoutQuery(
  productsParam: string | null,
  couponParam: string | null
): Promise<boolean> {
  if (!parseMetaProducts(productsParam)) return false;
  if (!useCartStore.persist.hasHydrated()) {
    await useCartStore.persist.rehydrate();
  }
  const resolved = await resolveMetaCartLines(String(productsParam));
  if (!resolved.ok) return false;

  const store = useCartStore.getState();
  store.clearCart();
  for (const line of resolved.lines) {
    store.addItem(line);
  }
  store.closeDrawer();

  const coupon = String(couponParam || "").trim();
  if (coupon) {
    const applied = await applyCouponCode(coupon);
    if (applied.success && applied.coupon) {
      useCartStore.getState().setAppliedCoupon(applied.coupon);
    } else {
      toast.error(applied.error || "Promo code could not be applied.");
    }
  }
  return useCartStore.getState().items.length > 0;
}
