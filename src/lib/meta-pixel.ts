/** Meta Pixel. The public id comes from Meta; a valid NEXT_PUBLIC_META_PIXEL_ID overrides it. */

import { canonicalCatalogSku } from "@/lib/catalog-sku";

export const META_PIXEL_ID = "1740638949795559";

const OFFICIAL_CATALOG_SKU = /^(?:STD|ELT|HPF)-SF\d{6}-(?:1|16|32|64)B$|^HPF-SF\d{6}-(?:HLP|FLP)$/;

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

/** Meta pixel ids are numeric. A valid env id wins; otherwise the Meta snippet id is used. */
export function metaPixelId(): string | null {
  const raw = String(process.env.NEXT_PUBLIC_META_PIXEL_ID || "").trim();
  if (/^\d{5,20}$/.test(raw)) return raw;
  return META_PIXEL_ID;
}

/** Official base snippet. The first PageView is inside this script. */
export function metaPixelSnippet(pixelId: string): string {
  return `!function(f,b,e,v,n,t,s)
{if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};
if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];
s.parentNode.insertBefore(t,s)}(window, document,'script',
'https://connect.facebook.net/en_US/fbevents.js');
fbq('init', '${pixelId}');
fbq('track', 'PageView');`;
}

/** Catalog content id. Legacy FEL/FST/HPFSF/GEN codes become the current SKU. */
export function catalogContentId(value: unknown): string {
  const raw = String(value ?? "")
    .trim()
    .replace(/BX$/i, "B");
  const canonical = canonicalCatalogSku(raw);
  return OFFICIAL_CATALOG_SKU.test(canonical) ? canonical : "";
}

function logPixel(event: string, params?: Record<string, unknown>) {
  if (process.env.NODE_ENV === "production") return;
  console.info("[meta-pixel]", event, params);
}

function track(event: string, params?: Record<string, unknown>) {
  const ids = params?.content_ids;
  if (Array.isArray(ids) && ids.length === 0) {
    logPixel(`${event} skipped`, params);
    return;
  }
  logPixel(event, params);
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
  const sku = catalogContentId(input.sku);
  return {
    content_ids: sku ? [sku] : [],
    content_type: "product",
    contents: sku ? [{ id: sku, quantity, item_price: price }] : [],
    currency: input.currency || "USD",
    value: Math.round(price * quantity * 100) / 100,
  };
}

export function viewContentParams(input: {
  sku: string;
  price?: number;
  currency?: string;
  name?: string;
}): Record<string, unknown> {
  const sku = catalogContentId(input.sku);
  const price = Number(input.price) || 0;
  return {
    content_ids: sku ? [sku] : [],
    content_type: "product",
    content_name: String(input.name || "").trim() || undefined,
    contents: sku ? [{ id: sku, quantity: 1, item_price: price }] : [],
    currency: input.currency || "USD",
    value: Math.round(price * 100) / 100,
  };
}

export function trackViewContent(input: {
  sku: string;
  price?: number;
  currency?: string;
  name?: string;
}) {
  track("ViewContent", viewContentParams(input));
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
  const items = input.items
    .map((item) => ({ ...item, sku: catalogContentId(item.sku) }))
    .filter((item) => item.sku);
  const contentIds = [...new Set(items.map((item) => item.sku))];
  return {
    value: Math.round((Number(input.total) || 0) * 100) / 100,
    currency: input.currency || "USD",
    order_id: String(input.orderId || ""),
    content_type: "product",
    content_ids: contentIds,
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
