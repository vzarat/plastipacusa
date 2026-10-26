import { catalogSkusMatch, canonicalCatalogSku } from "@/lib/catalog-sku";
import { isCatalogInStock } from "@/lib/products";
import type { CartItem } from "@/types";

export interface MetaCheckoutRequestLine {
  sku: string;
  quantity: number;
}

export type MetaCartLine = Omit<CartItem, "id" | "totalPrice">;

export interface MetaCatalogOption {
  sku: string;
  price: number;
  label: string;
  boxes?: number;
  rolls: number;
  boxUnitPrice?: number;
}

export interface MetaCatalogVariant {
  id?: string | number;
  sku?: string;
  weightLbs?: number | string | null;
  rollsPerBox?: number;
}

/** Enough of a formatted catalog row to turn a Meta SKU into a cart line. */
export interface MetaCatalogProduct {
  id: string | number;
  slug: string;
  title?: string;
  name?: string;
  imageUrl?: string;
  application?: string | null;
  widthInches?: number | string | null;
  width_inches?: string | number | null;
  gauge?: number | null;
  length_feet?: number | null;
  lengthFeet?: number | null;
  fullPalletRolls?: number | null;
  isSoldOut?: boolean;
  isAvailable?: boolean | null;
  stockQuantity?: number | null;
  packageOptions?: MetaCatalogOption[];
  variants?: MetaCatalogVariant[];
}

/**
 * Meta Commerce sends `products=SKU:qty,SKU:qty`.
 * Returns null when the parameter is missing or any entry is not `id:positiveInteger`.
 */
export function parseMetaProducts(raw: string | null | undefined): MetaCheckoutRequestLine[] | null {
  const text = String(raw || "").trim();
  if (!text) return null;

  const merged = new Map<string, MetaCheckoutRequestLine>();
  for (const entry of text.split(",")) {
    const piece = entry.trim();
    if (!piece) return null;
    const colon = piece.lastIndexOf(":");
    if (colon <= 0 || colon === piece.length - 1) return null;
    const sku = piece.slice(0, colon).trim();
    const quantityText = piece.slice(colon + 1).trim();
    if (!sku || !/^\d+$/.test(quantityText)) return null;
    const quantity = Number(quantityText);
    if (!Number.isInteger(quantity) || quantity < 1) return null;
    const key = canonicalCatalogSku(sku) || sku.toUpperCase();
    const existing = merged.get(key);
    if (existing) existing.quantity += quantity;
    else merged.set(key, { sku, quantity });
  }

  return merged.size > 0 ? [...merged.values()] : null;
}

function optionForSku(product: MetaCatalogProduct, sku: string): MetaCatalogOption | null {
  for (const option of product.packageOptions || []) {
    if (!option.sku || !(Number(option.price) > 0)) continue;
    if (catalogSkusMatch(sku, option.sku) || catalogSkusMatch(option.sku, sku)) return option;
  }
  return null;
}

function variantForSku(product: MetaCatalogProduct, sku: string): MetaCatalogVariant | null {
  for (const variant of product.variants || []) {
    const code = String(variant.sku || "");
    if (!code) continue;
    if (catalogSkusMatch(sku, code) || catalogSkusMatch(code, sku)) return variant;
  }
  return null;
}

function tierTypeFor(application: "hand" | "machine", boxes: number, rolls: number): CartItem["tierType"] {
  if (application === "machine") {
    if (rolls === 20) return "half_pallet";
    if (rolls === 40) return "full_pallet";
    return undefined;
  }
  if (boxes === 1) return "box";
  if (boxes === 16 || boxes === 32) return "layer";
  if (boxes === 64) return "full_pallet";
  return undefined;
}

function lineFromProduct(
  product: MetaCatalogProduct,
  requestedSku: string,
  quantity: number
): MetaCartLine | null {
  if (
    !isCatalogInStock({
      isSoldOut: product.isSoldOut,
      isAvailable: product.isAvailable,
      stockQuantity: product.stockQuantity,
    })
  ) {
    return null;
  }
  const option = optionForSku(product, requestedSku);
  if (!option) return null;
  const variant = variantForSku(product, option.sku) || variantForSku(product, requestedSku);
  const application = product.application === "machine" ? "machine" : "hand";
  const boxes = Math.max(0, Math.floor(Number(option.boxes) || 0));
  const rolls = Math.max(0, Math.floor(Number(option.rolls) || 0));
  const width = product.widthInches ?? product.width_inches;
  const gauge = Number(product.gauge);
  const lengthFeet = Number(product.lengthFeet ?? product.length_feet);
  const unitPrice = Number(option.price);
  if (!(unitPrice > 0) || !product.slug) return null;

  const boxUnit = Number(option.boxUnitPrice);
  const weight = variant?.weightLbs;

  return {
    productId: product.id as CartItem["productId"],
    productSlug: String(product.slug),
    productName: String(product.title || product.name || "Stretch Film"),
    productImage: String(product.imageUrl || ""),
    packageSize: option.label,
    totalRolls: rolls,
    totalBoxes: application === "machine" ? 0 : boxes,
    application,
    variantId: variant?.id ?? option.sku,
    sku: canonicalCatalogSku(option.sku) || option.sku,
    widthInches: width == null || width === "" ? "" : String(width),
    gauge: Number.isFinite(gauge) && gauge > 0 ? gauge : 0,
    lengthFeet: Number.isFinite(lengthFeet) && lengthFeet > 0 ? lengthFeet : 0,
    rollsPerBox: Number(variant?.rollsPerBox) || (application === "machine" ? rolls : rolls > 0 && boxes > 0 ? Math.round(rolls / boxes) : 4),
    rollsPerPallet: Number(product.fullPalletRolls) || (application === "machine" ? 40 : 256),
    weightLbs: weight == null || weight === "" ? "" : String(weight),
    pricingTier: option.label,
    tierType: tierTypeFor(application, boxes, rolls),
    unitPrice,
    boxUnitPrice: application === "hand" && boxUnit > 0 ? boxUnit : undefined,
    quantity,
  };
}

/** Every requested SKU must match an in-stock catalog package. */
export function buildMetaCartLines(
  requested: MetaCheckoutRequestLine[],
  products: MetaCatalogProduct[]
): MetaCartLine[] | null {
  if (!requested.length) return null;
  const lines: MetaCartLine[] = [];
  for (const entry of requested) {
    let match: MetaCartLine | null = null;
    for (const product of products) {
      match = lineFromProduct(product, entry.sku, entry.quantity);
      if (match) break;
    }
    if (!match) return null;
    lines.push(match);
  }
  return lines;
}
