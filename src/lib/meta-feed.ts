import { timingSafeEqual } from "node:crypto";
import { roundMoney, totalForBoxes } from "@/lib/pricing";

export const META_FEED_ORIGIN = "https://www.plastipacusa.com";

export const META_FEED_COLUMNS = [
  "id",
  "title",
  "description",
  "availability",
  "condition",
  "price",
  "link",
  "image_link",
  "brand",
  "item_group_id",
] as const;

export interface MetaFeedVariant {
  sku: string;
  title?: string | null;
  price?: number | string | null;
  boxes_count?: number | null;
  rolls_count?: number | null;
}

export interface MetaFeedProduct {
  id: string;
  title?: string | null;
  slug?: string | null;
  description?: string | null;
  images?: string[] | null;
  image_url?: string | null;
  type?: string | null;
  application?: string | null;
  width_inches?: number | string | null;
  product_variants?: MetaFeedVariant[] | null;
}

function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function isMachineProduct(product: MetaFeedProduct, variant: MetaFeedVariant): boolean {
  const application = String(product.application || product.type || "").toLowerCase();
  if (application.includes("machine")) return true;
  if (Math.round(Number(product.width_inches) || 0) === 20) return true;
  const rolls = Math.floor(Number(variant.rolls_count) || 0);
  return rolls === 20 || rolls === 40;
}

/** Page total. Hand film stores a per-box rate; the storefront multiplies it by the box count. */
export function metaFeedPrice(product: MetaFeedProduct, variant: MetaFeedVariant): string | null {
  const unit = Number(variant.price);
  if (!Number.isFinite(unit) || unit <= 0) return null;
  const boxes = Math.floor(Number(variant.boxes_count) || 0);
  const total = !isMachineProduct(product, variant) && boxes > 0 ? totalForBoxes(unit, boxes) : roundMoney(unit);
  if (!(total > 0)) return null;
  return `${total.toFixed(2)} USD`;
}

export function metaFeedOptionName(variant: MetaFeedVariant): string {
  const boxes = Math.floor(Number(variant.boxes_count) || 0);
  if (boxes > 0) return `${boxes} ${boxes === 1 ? "Box" : "Boxes"}`;
  const rolls = Math.floor(Number(variant.rolls_count) || 0);
  if (rolls > 0) return `${rolls} ${rolls === 1 ? "Roll" : "Rolls"}`;
  return String(variant.title || "").trim() || "Package";
}

function absoluteUrl(value: string): string {
  const text = value.trim();
  if (!text) return "";
  if (/^https?:\/\//i.test(text)) return text;
  return `${META_FEED_ORIGIN}${text.startsWith("/") ? "" : "/"}${text}`;
}

function imageLink(product: MetaFeedProduct): string {
  const listed = Array.isArray(product.images) ? product.images.find((item) => String(item || "").trim()) : "";
  return absoluteUrl(String(listed || product.image_url || ""));
}

export function metaFeedTokenMatches(provided: string | null, expected: string | null): boolean {
  const left = String(provided || "");
  const right = String(expected || "");
  if (!right || left.length !== right.length) return false;
  return timingSafeEqual(Buffer.from(left), Buffer.from(right));
}

export function buildMetaFeedCsv(products: MetaFeedProduct[], origin = META_FEED_ORIGIN): string {
  const rows: string[] = [META_FEED_COLUMNS.join(",")];
  const seen = new Set<string>();

  for (const product of products) {
    const groupId = String(product.id || product.slug || "").trim();
    const productTitle = String(product.title || "").trim() || "Stretch Film";
    const description = String(product.description || productTitle).trim();
    const slug = String(product.slug || "").trim();
    const image = imageLink(product);
    if (!groupId || !slug) continue;

    for (const variant of product.product_variants || []) {
      const id = String(variant?.sku ?? "");
      if (!id || seen.has(id)) continue;
      const price = metaFeedPrice(product, variant);
      if (!price) continue;
      seen.add(id);
      const title = `${productTitle} | ${metaFeedOptionName(variant)}`;
      const link = `${origin}/products/${encodeURIComponent(slug)}?variant=${encodeURIComponent(id)}`;
      const record = [
        id,
        title,
        description,
        "in stock",
        "new",
        price,
        link,
        image,
        "Plastipac",
        groupId,
      ];
      rows.push(record.map(csvCell).join(","));
    }
  }

  return `${rows.join("\n")}\n`;
}
