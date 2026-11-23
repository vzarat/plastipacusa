/** Hours without checkout before an active cart is marked abandoned. */
export function abandonedCartHours(): number {
  const raw = Number(process.env.ABANDONED_CART_HOURS || process.env.NEXT_PUBLIC_ABANDONED_CART_HOURS || 2);
  if (!Number.isFinite(raw) || raw <= 0) return 2;
  return Math.min(168, Math.max(0.25, raw));
}

export const CART_GUEST_KEY_STORAGE = "plastipac-cart-guest-key";
export const CART_CONTACT_STORAGE = "plastipac-cart-contact";
