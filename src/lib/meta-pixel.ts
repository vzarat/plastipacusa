/** Meta Pixel. Stays quiet when NEXT_PUBLIC_META_PIXEL_ID is unset. */

export interface MetaPixelItem {
  sku: string;
  quantity: number;
  price?: number;
}

type Fbq = {
  (command: "track", event: string, params?: Record<string, unknown>): void;
  (command: "init", pixelId: string): void;
  callMethod?: (...args: unknown[]) => void;
  queue: unknown[];
  loaded?: boolean;
  version?: string;
  push: Fbq;
};

declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

/** Meta pixel ids are numeric. Anything else is treated as not configured. */
export function metaPixelId(): string | null {
  const raw = String(process.env.NEXT_PUBLIC_META_PIXEL_ID || "").trim();
  return /^\d{5,20}$/.test(raw) ? raw : null;
}

function track(event: string, params?: Record<string, unknown>) {
  if (!metaPixelId()) return;
  if (typeof window === "undefined" || typeof window.fbq !== "function") return;
  window.fbq("track", event, params);
}

export function trackPageView() {
  track("PageView");
}

export function addToCartParams(input: {
  sku: string;
  price: number;
  currency: string;
  quantity: number;
}): Record<string, unknown> {
  const quantity = Math.max(1, Math.floor(Number(input.quantity) || 1));
  const price = Number(input.price) || 0;
  const sku = String(input.sku || "").trim();
  return {
    content_ids: sku ? [sku] : [],
    content_type: "product",
    contents: [{ id: sku, quantity, item_price: price }],
    currency: input.currency || "USD",
    value: Math.round(price * quantity * 100) / 100,
  };
}

export function trackAddToCart(input: {
  sku: string;
  price: number;
  currency: string;
  quantity: number;
}) {
  track("AddToCart", addToCartParams(input));
}

export function trackInitiateCheckout(input: {
  cartSubtotal: number;
  currency: string;
  itemsCount: number;
}) {
  track("InitiateCheckout", {
    value: Math.round((Number(input.cartSubtotal) || 0) * 100) / 100,
    currency: input.currency || "USD",
    num_items: Math.max(0, Math.floor(Number(input.itemsCount) || 0)),
  });
}

export function purchaseParams(input: {
  orderId: string;
  total: number;
  currency: string;
  items: MetaPixelItem[];
}): Record<string, unknown> {
  const items = input.items.filter((item) => String(item.sku || "").trim());
  return {
    value: Math.round((Number(input.total) || 0) * 100) / 100,
    currency: input.currency || "USD",
    order_id: String(input.orderId || ""),
    content_type: "product",
    content_ids: items.map((item) => item.sku),
    contents: items.map((item) => ({
      id: item.sku,
      quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
      item_price: Number(item.price) || 0,
    })),
    num_items: items.reduce(
      (sum, item) => sum + Math.max(1, Math.floor(Number(item.quantity) || 1)),
      0
    ),
  };
}

export function trackPurchase(input: {
  orderId: string;
  total: number;
  currency: string;
  items: MetaPixelItem[];
}) {
  track("Purchase", purchaseParams(input));
}
