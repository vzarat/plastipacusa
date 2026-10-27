import { catalogSkusMatch, canonicalCatalogSku } from "@/lib/catalog-sku";
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
  partNumber?: string | null;
  part_number?: string | null;
  sourceId?: string | null;
  storefrontTitle?: string | null;
  isSoldOut?: boolean;
  isAvailable?: boolean | null;
  stockQuantity?: number | null;
  packageOptions?: MetaCatalogOption[];
  variants?: MetaCatalogVariant[];
}

/** Meta escapes commas and colons, and sometimes leaves a second encoding layer. */
export function decodeMetaProductsParam(raw: string | null | undefined): string {
  let text = String(raw || "").trim().replace(/\+/g, " ");
  for (let pass = 0; pass < 2; pass += 1) {
    if (!/%[0-9A-Fa-f]{2}/.test(text)) break;
    try {
      const decoded = decodeURIComponent(text);
      if (decoded === text) break;
      text = decoded;
    } catch {
      break;
    }
  }
  return text.trim();
}

/**
 * Meta Commerce sends `products=SKU:qty,SKU:qty`.
 * Returns null when the parameter is missing or any entry is not `id:positiveInteger`.
 */
export function parseMetaProducts(raw: string | null | undefined): MetaCheckoutRequestLine[] | null {
  const text = decodeMetaProductsParam(raw);
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

function defaultOption(product: MetaCatalogProduct): MetaCatalogOption | null {
  const options = (product.packageOptions || []).filter(
    (option) => option.sku && Number(option.price) > 0
  );
  return (
    options.find((option) => option.boxes === 1) ||
    options.find((option) => option.rolls === 20) ||
    options[0] ||
    null
  );
}

function normalizeCommerceLabel(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** SKU, catalog id, part number, or product title such as MASTERPLAT ROBOPAC. */
function productMatchesCommerceId(product: MetaCatalogProduct, token: string): boolean {
  const raw = token.trim();
  const wanted = normalizeCommerceLabel(raw);
  if (!wanted) return false;
  const ids = [product.id, product.sourceId];
  if (ids.some((id) => id != null && String(id).trim().toLowerCase() === raw.toLowerCase())) return true;

  const labels = [
    product.title,
    product.name,
    product.slug,
    product.partNumber,
    product.part_number,
    product.storefrontTitle,
  ];
  for (const label of labels) {
    const norm = normalizeCommerceLabel(String(label || ""));
    if (!norm) continue;
    if (norm === wanted) return true;
    if (wanted.length >= 6 && (norm.includes(wanted) || wanted.includes(norm))) return true;
  }

  for (const variant of product.variants || []) {
    if (variant.id != null && String(variant.id).trim().toLowerCase() === raw.toLowerCase()) return true;
    const code = String(variant.sku || "");
    if (code && (catalogSkusMatch(raw, code) || catalogSkusMatch(code, raw))) return true;
  }
  return false;
}

function optionForSku(product: MetaCatalogProduct, sku: string): MetaCatalogOption | null {
  const aliases = [sku, sku.replace(/BX$/i, "B")];
  for (const option of product.packageOptions || []) {
    if (!option.sku || !(Number(option.price) > 0)) continue;
    if (aliases.some((alias) => catalogSkusMatch(alias, option.sku) || catalogSkusMatch(option.sku, alias))) {
      return option;
    }
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
  const direct = optionForSku(product, requestedSku);
  const option =
    direct ||
    (productMatchesCommerceId(product, requestedSku)
      ? optionForSku(product, variantForSku(product, requestedSku)?.sku || "") || defaultOption(product)
      : null);
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

/** Matched catalog lines. Unknown ids are skipped. Null only when nothing matches. */
export function buildMetaCartLines(
  requested: MetaCheckoutRequestLine[],
  products: MetaCatalogProduct[]
): MetaCartLine[] | null {
  if (!requested.length) return null;
  const lines: MetaCartLine[] = [];
  for (const entry of requested) {
    for (const product of products) {
      const match = lineFromProduct(product, entry.sku, entry.quantity);
      if (!match) continue;
      lines.push(match);
      break;
    }
  }
  return lines.length > 0 ? lines : null;
}
