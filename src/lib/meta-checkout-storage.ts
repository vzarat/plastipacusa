export const META_CHECKOUT_STORAGE_KEY = "plastipac-meta-checkout-pending";
export const META_CHECKOUT_COOKIE = "plastipac_meta_checkout";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

export interface PendingMetaCheckout {
  products: string;
  coupon: string;
  savedAt: number;
}

export function serializeMetaCheckout(products: string, coupon: string | null): string {
  return JSON.stringify({
    products,
    coupon: coupon || "",
    savedAt: Date.now(),
  } satisfies PendingMetaCheckout);
}

export function parseMetaCheckoutPayload(raw: string | null | undefined): PendingMetaCheckout | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<PendingMetaCheckout>;
    const products = String(parsed.products || "").trim();
    const savedAt = Number(parsed.savedAt) || 0;
    if (!products || !savedAt || Date.now() - savedAt > MAX_AGE_MS) return null;
    return { products, coupon: String(parsed.coupon || ""), savedAt };
  } catch {
    return null;
  }
}

/** Runs in the document head, before React or the login redirect. */
export const META_CHECKOUT_BOOTSTRAP_SCRIPT = `(function(){try{var params=new URLSearchParams(location.search);var products=params.get("products");if(!products)return;localStorage.setItem(${JSON.stringify(META_CHECKOUT_STORAGE_KEY)}, JSON.stringify({products:products,coupon:params.get("coupon")||"",savedAt:Date.now()}));}catch(e){}})();`;

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const prefix = `${name}=`;
  for (const part of document.cookie.split(";")) {
    const item = part.trim();
    if (item.startsWith(prefix)) return decodeURIComponent(item.slice(prefix.length));
  }
  return null;
}

export function rememberMetaCheckoutQuery(products: string, coupon: string | null) {
  if (typeof window === "undefined") return;
  const payload = serializeMetaCheckout(products, coupon);
  try {
    localStorage.setItem(META_CHECKOUT_STORAGE_KEY, payload);
  } catch {
    // Private mode can block storage. The cookie still carries the link through login.
  }
  document.cookie = `${META_CHECKOUT_COOKIE}=${encodeURIComponent(payload)}; Path=/; Max-Age=86400; SameSite=Lax`;
}

export function readMetaCheckoutQuery(): PendingMetaCheckout | null {
  if (typeof window === "undefined") return null;
  let fromStorage: string | null = null;
  try {
    fromStorage = localStorage.getItem(META_CHECKOUT_STORAGE_KEY);
  } catch {
    fromStorage = null;
  }
  return parseMetaCheckoutPayload(fromStorage) || parseMetaCheckoutPayload(readCookie(META_CHECKOUT_COOKIE));
}

export function clearMetaCheckoutQuery() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(META_CHECKOUT_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
  document.cookie = `${META_CHECKOUT_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function checkoutLoginPath(): string {
  return `/login?redirect=${encodeURIComponent("/checkout")}`;
}
