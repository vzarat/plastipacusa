/** Meta Pixel. The public id comes from Meta; a valid NEXT_PUBLIC_META_PIXEL_ID overrides it. */

import { canonicalCatalogSku } from "@/lib/catalog-sku";
import { handFilmTierSku } from "@/lib/hand-film-sku";
import { machineFilmTierSku } from "@/lib/machine-film-sku";

export const META_PIXEL_ID = "1740638949795559";

const OFFICIAL_CATALOG_SKU = /^(?:STD|ELT|HPF)-SF\d{6}-(?:1|16|32|64)B$|^HPF-SF\d{6}-(?:HLP|FLP)$/;

export interface PixelSkuSource {
  sku?: string | null;
  application?: string | null;
  widthInches?: string | number | null;
  gauge?: number | null;
  lengthFeet?: number | null;
  boxes?: number | null;
  rolls?: number | null;
  rollsPerBox?: number | null;
  totalRolls?: number | null;
  quantity?: number | null;
  categorySlug?: string | null;
  series?: string | null;
  partNumber?: string | null;
  title?: string | null;
  name?: string | null;
}

export interface MetaPixelItem extends PixelSkuSource {
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

const DATABASE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isDatabaseId(value: unknown): boolean {
  const text = String(value ?? "").trim();
  if (!text) return false;
  return DATABASE_ID.test(text) || /^[0-9a-f]{32}$/i.test(text) || /^\d+$/.test(text);
}

function asSkuSource(value: unknown): PixelSkuSource {
  if (value && typeof value === "object") return value as PixelSkuSource;
  return { sku: value == null ? "" : String(value) };
}

function packageRolls(source: PixelSkuSource): number {
  const direct = Math.round(Number(source.rolls ?? source.rollsPerBox) || 0);
  if (direct === 20 || direct === 40) return direct;
  if (source.application === "machine") {
    const total = Number(source.totalRolls) || 0;
    const quantity = Math.max(1, Number(source.quantity) || 1);
    const perPackage = Math.round(total / quantity);
    if (perPackage === 20 || perPackage === 40) return perPackage;
  }
  return direct;
}

function deriveCatalogSku(source: PixelSkuSource): string {
  const rolls = packageRolls(source);
  const boxes = Math.round(Number(source.boxes) || 0);
  const machine = source.application === "machine" || rolls === 20 || rolls === 40;
  const derived = machine
    ? machineFilmTierSku({
        widthInches: source.widthInches,
        gauge: source.gauge,
        lengthFeet: source.lengthFeet,
        rolls,
      })
    : handFilmTierSku({
        categorySlug: source.categorySlug,
        series: source.series,
        partNumber: isDatabaseId(source.partNumber) ? undefined : source.partNumber,
        title: source.title || source.name,
        name: source.name || source.title,
        sku: isDatabaseId(source.sku) ? undefined : source.sku,
        widthInches: source.widthInches,
        gauge: source.gauge,
        lengthFeet: source.lengthFeet,
        boxes: boxes || (rolls > 0 && rolls % 4 === 0 ? rolls / 4 : undefined),
      });
  const canonical = canonicalCatalogSku(String(derived || ""));
  return OFFICIAL_CATALOG_SKU.test(canonical) ? canonical : "";
}

/** Catalog content id. Database UUIDs are never sent. Legacy codes become the current SKU. */
export function catalogContentId(value: unknown): string {
  const source = asSkuSource(value);
  const raw = String(source.sku ?? "").trim();
  if (raw && !isDatabaseId(raw)) {
    const canonical = canonicalCatalogSku(raw.replace(/BX$/i, "B"));
    if (OFFICIAL_CATALOG_SKU.test(canonical)) return canonical;
  }
  return deriveCatalogSku(source);
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

export function addToCartParams(
  input: PixelSkuSource & {
    sku: string;
    price?: number;
    currency: string;
    quantity: number;
  }
): Record<string, unknown> {
  const quantity = Math.max(1, Math.floor(Number(input.quantity) || 1));
  const price = Number(input.price) || 0;
  const sku = catalogContentId(input);
  const name = String(input.name || input.title || "").trim();
  return {
    content_ids: sku ? [sku] : [],
    content_type: "product",
    ...(name ? { content_name: name } : {}),
    contents: sku ? [{ id: sku, quantity, item_price: price }] : [],
    currency: input.currency || "USD",
    value: Math.round(price * quantity * 100) / 100,
  };
}

export function viewContentParams(
  input: PixelSkuSource & {
    sku?: string | null;
    price?: number;
    currency?: string;
    name?: string;
  }
): Record<string, unknown> {
  const sku = catalogContentId(input);
  const price = Number(input.price) || 0;
  const name = String(input.name || input.title || "").trim();
  return {
    content_type: "product",
    content_ids: sku ? [sku] : [],
    ...(name ? { content_name: name } : {}),
    currency: input.currency || "USD",
    value: Math.round(price * 100) / 100,
    contents: sku ? [{ id: sku, quantity: 1, item_price: price }] : [],
  };
}

export function trackViewContent(
  input: PixelSkuSource & {
    sku?: string | null;
    price?: number;
    currency?: string;
    name?: string;
  }
) {
  track("ViewContent", viewContentParams(input));
}

export function pixelItemFromCart(item: {
  sku: string;
  quantity: number;
  unitPrice: number;
  application?: string | null;
  widthInches?: string | number | null;
  gauge?: number | null;
  lengthFeet?: number | null;
  totalBoxes?: number | null;
  rollsPerBox?: number | null;
  totalRolls?: number | null;
  productName?: string | null;
}): MetaPixelItem {
  return {
    sku: item.sku,
    quantity: item.quantity,
    price: item.unitPrice,
    application: item.application,
    widthInches: item.widthInches,
    gauge: item.gauge,
    lengthFeet: item.lengthFeet,
    boxes: item.totalBoxes,
    rolls: item.rollsPerBox,
    totalRolls: item.totalRolls,
    name: item.productName,
    title: item.productName,
  };
}

export function trackAddToCart(
  input: PixelSkuSource & {
    sku: string;
    price?: number;
    currency: string;
    quantity: number;
  }
) {
  track("AddToCart", addToCartParams(input));
}

export function initiateCheckoutParams(input: {
  cartSubtotal: number;
  currency: string;
  itemsCount: number;
  items?: MetaPixelItem[];
}): Record<string, unknown> {
  const lines = (input.items || [])
    .map((item) => ({
      id: catalogContentId(item),
      quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
      item_price: Number(item.price) || 0,
    }))
    .filter((item) => item.id);
  const contentIds = [...new Set(lines.map((item) => item.id))];
  return {
    content_type: "product",
    content_ids: contentIds,
    contents: lines,
    currency: input.currency || "USD",
    value: Math.round((Number(input.cartSubtotal) || 0) * 100) / 100,
    num_items: Math.max(0, Math.floor(Number(input.itemsCount) || 0)),
  };
}

export function trackInitiateCheckout(input: {
  cartSubtotal: number;
  currency: string;
  itemsCount: number;
  items?: MetaPixelItem[];
}) {
  const params = initiateCheckoutParams(input);
  if (!Array.isArray(params.content_ids) || params.content_ids.length === 0) {
    logPixel("InitiateCheckout skipped", params);
    return;
  }
  track("InitiateCheckout", params);
}

export function purchaseParams(input: {
  orderId: string;
  total: number;
  currency: string;
  items: MetaPixelItem[];
}): Record<string, unknown> {
  const items = input.items
    .map((item) => ({ ...item, sku: catalogContentId(item) }))
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
