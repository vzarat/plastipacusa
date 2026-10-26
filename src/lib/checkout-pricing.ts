import { getCartDiscountAmount } from "@/lib/coupons";
import { catalogSkuCandidates, canonicalCatalogSku } from "@/lib/catalog-sku";
import { machineFilmPackagePriceBySku } from "@/lib/machine-film-pricing";
import { fullPalletsForPackage } from "@/lib/pallet-stock";
import { boxTierPricesFromVariants, repriceHandCartLine, roundMoney } from "@/lib/pricing";
import { calculateOrderTotal, type CheckoutTotals } from "@/lib/sales-tax";
import type { AppliedCoupon } from "@/types/coupon";
import type { CartItem } from "@/types";

export interface CatalogCheckoutRequest {
  sku: string;
  quantity: number;
}

export interface CatalogCheckoutVariant {
  sku: string | null;
  price: number | null;
  boxes_count: number | null;
  rolls_count?: number | null;
  product_id?: string | null;
  products?: {
    slug?: string | null;
    application?: string | null;
    name?: string | null;
    width_inches?: number | string | null;
    gauge?: number | string | null;
    length_feet?: number | string | null;
  } | null;
}

export interface PricedCheckoutLine {
  sku: string;
  quantity: number;
  productId: string;
  productName: string;
  productSlug: string;
  application: "hand" | "machine";
  totalBoxes: number;
  /** Catalog boxes_count times quantity. Shipping still uses boxes. */
  boxes: number;
  /** Full pallets consumed from products.stock_quantity. Loose boxes and half pallets are 0. */
  pallets: number;
  unitPrice: number;
  totalPrice: number;
  boxUnitPrice: number | null;
  widthInches: string;
  gauge: number;
}

function positiveMoney(...values: unknown[]): number | null {
  for (const value of values) {
    if (value === null || value === undefined || value === "") continue;
    const amount = typeof value === "number" ? value : parseFloat(String(value));
    if (Number.isFinite(amount) && amount > 0) return amount;
  }
  return null;
}

function textOf(...values: unknown[]): string {
  for (const value of values) {
    const text = String(value ?? "").trim();
    if (text) return text;
  }
  return "";
}

function inferredBoxes(row: Record<string, unknown>): number | null {
  const boxes = Math.floor(Number(row.boxes_count ?? row.boxesCount) || 0);
  if (boxes > 0) return boxes;
  const rolls = Math.floor(Number(row.rolls_count ?? row.rollsCount) || 0);
  if (rolls === 4) return 1;
  if (rolls === 64) return 16;
  if (rolls === 128) return 32;
  if (rolls === 256) return 64;
  const label = textOf(row.title, row.package_size, row.packageSize);
  const labeled = Math.floor(Number(label.match(/(\d+)\s*BOX/i)?.[1]) || 0);
  return labeled > 0 ? labeled : null;
}

/** Accepts the live catalog shape: price or price_usd, and product title or name. */
export function toCatalogCheckoutVariant(
  row: Record<string, unknown>,
  product: Record<string, unknown> | null
): CatalogCheckoutVariant {
  return {
    sku: textOf(row.sku),
    price: positiveMoney(row.price, row.price_usd, row.priceUsd),
    boxes_count: inferredBoxes(row),
    rolls_count: Math.floor(Number(row.rolls_count ?? row.rollsCount) || 0) || null,
    product_id: textOf(row.product_id, row.productId) || null,
    products: {
      slug: textOf(product?.slug),
      application: textOf(product?.application, product?.type) || null,
      name: textOf(product?.name, product?.title, product?.storefront_title) || null,
      width_inches: (product?.width_inches ?? product?.widthInches ?? null) as number | string | null,
      gauge: (product?.gauge ?? null) as number | string | null,
      length_feet: (product?.length_feet ?? product?.lengthFeet ?? null) as number | string | null,
    },
  };
}

function productOf(variant: CatalogCheckoutVariant) {
  const products = variant.products as CatalogCheckoutVariant["products"] | CatalogCheckoutVariant["products"][] | null;
  if (Array.isArray(products)) return products[0] || null;
  return products || null;
}

function packageRolls(variant: CatalogCheckoutVariant): number {
  const stored = Math.floor(Number(variant.rolls_count) || 0);
  if (stored > 0) return stored;
  const sku = String(variant.sku || "").trim().toUpperCase();
  if (sku.endsWith("-FLP") || sku.endsWith("40R")) return 40;
  if (sku.endsWith("-HLP") || sku.endsWith("20R")) return 20;
  return 0;
}

function catalogVariantForSku(
  sku: string,
  bySku: Map<string, CatalogCheckoutVariant>
): CatalogCheckoutVariant | undefined {
  const matches = catalogSkuCandidates(sku)
    .map((alias) => bySku.get(alias.toUpperCase()))
    .filter((row): row is CatalogCheckoutVariant => Boolean(row));
  const canonical = canonicalCatalogSku(sku);
  const official = matches.find(
    (row) => String(row.sku || "").trim().toUpperCase() === canonical && Number(row.price) > 0
  );
  if (official) return official;
  const exactKey = sku.trim().toUpperCase();
  const exact = matches.find((row) => String(row.sku || "").trim().toUpperCase() === exactKey);
  if (exact && Number(exact.price) > 0) return exact;
  return matches.find((row) => Number(row.price) > 0) || exact || matches[0];
}

/** Prices come from catalog variants. Request fields other than sku and quantity are ignored. */
export function catalogCheckoutLines(
  requested: CatalogCheckoutRequest[],
  variants: CatalogCheckoutVariant[],
  siblings: CatalogCheckoutVariant[] = variants
): PricedCheckoutLine[] {
  const bySku = new Map<string, CatalogCheckoutVariant>();
  for (const row of variants) {
    const key = String(row.sku || "").trim().toUpperCase();
    if (!key || bySku.has(key)) continue;
    bySku.set(key, row);
  }
  const siblingsByProduct = new Map<string, CatalogCheckoutVariant[]>();
  for (const row of siblings) {
    const productId = String(row.product_id || "");
    if (!productId) continue;
    const group = siblingsByProduct.get(productId) || [];
    group.push(row);
    siblingsByProduct.set(productId, group);
  }

  return requested
    .filter((line) => Number(line.quantity) > 0 && String(line.sku || "").trim())
    .map((line) => {
      const sku = String(line.sku).trim();
      const variant = catalogVariantForSku(sku, bySku);
      if (!variant) {
        throw new Error(`Catalog price missing for ${sku}.`);
      }
      const catalogSku = textOf(variant.sku) || sku;
      const product = productOf(variant);
      const application =
        String(product?.application || "").toLowerCase() === "machine" ? "machine" : "hand";
      const quantity = Math.max(1, Math.floor(Number(line.quantity) || 1));
      const presetBoxes = Math.max(0, Math.floor(Number(variant.boxes_count) || 0));
      const boxes = presetBoxes * quantity;
      const widthInches = String(product?.width_inches ?? "");
      const gauge = Math.round(Number(product?.gauge) || 0);
      const productName = String(product?.name || sku);
      const productSlug = String(product?.slug || "");
      const productId = textOf(variant.product_id);
      const pallets = fullPalletsForPackage({
        application,
        boxesPerPackage: presetBoxes,
        rollsPerPackage: packageRolls(variant),
        quantity,
        widthInches: product?.width_inches,
        gauge: product?.gauge,
        lengthFeet: product?.length_feet,
        slug: productSlug,
        name: productName,
      });

      if (application === "machine") {
        const unitPrice = roundMoney(
          machineFilmPackagePriceBySku(catalogSku) ?? (Number(variant.price) || 0)
        );
        if (!(unitPrice > 0)) throw new Error(`Catalog price missing for ${sku}.`);
        return {
          sku: catalogSku,
          quantity,
          productId,
          productName,
          productSlug,
          application,
          totalBoxes: presetBoxes,
          boxes,
          pallets,
          unitPrice,
          totalPrice: roundMoney(unitPrice * quantity),
          boxUnitPrice: null,
          widthInches,
          gauge,
        };
      }

      const tierPrices = boxTierPricesFromVariants(
        siblingsByProduct.get(String(variant.product_id || "")) || [variant]
      );
      const repriced = repriceHandCartLine(
        {
          application: "hand" as const,
          totalBoxes: presetBoxes,
          quantity,
          unitPrice: 0,
          totalPrice: 0,
          boxUnitPrice: null,
        },
        tierPrices
      );
      if (!(repriced.totalPrice > 0)) throw new Error(`Catalog price missing for ${sku}.`);
      return {
        sku: catalogSku,
        quantity,
        productId,
        productName,
        productSlug,
        application,
        totalBoxes: presetBoxes,
        boxes,
        pallets,
        unitPrice: repriced.unitPrice,
        totalPrice: repriced.totalPrice,
        boxUnitPrice: repriced.boxUnitPrice ?? null,
        widthInches,
        gauge,
      };
    });
}

function asCartItem(line: PricedCheckoutLine): CartItem {
  return {
    id: line.sku,
    productId: 0,
    productSlug: line.productSlug,
    productName: line.productName,
    productImage: "",
    totalBoxes: line.totalBoxes,
    application: line.application,
    variantId: line.sku,
    sku: line.sku,
    widthInches: line.widthInches,
    gauge: line.gauge,
    lengthFeet: 0,
    rollsPerBox: 0,
    rollsPerPallet: 0,
    weightLbs: "0",
    pricingTier: "",
    unitPrice: line.unitPrice,
    boxUnitPrice: line.boxUnitPrice ?? undefined,
    quantity: line.quantity,
    totalPrice: line.totalPrice,
  };
}

/** Shared by the cart display and the payment server. Tax covers merchandise and shipping. */
export function priceCheckoutCart(input: {
  lines: PricedCheckoutLine[];
  coupon: AppliedCoupon | null;
  shipping: number;
  taxExempt?: boolean;
}): CheckoutTotals & { lines: PricedCheckoutLine[] } {
  const subtotal = roundMoney(input.lines.reduce((sum, line) => sum + line.totalPrice, 0));
  const discount = getCartDiscountAmount(
    input.lines.map(asCartItem),
    input.coupon
  );
  const totals = calculateOrderTotal({
    subtotal,
    discount,
    shipping: input.shipping,
    taxExempt: input.taxExempt,
  });
  return { ...totals, lines: input.lines };
}

export function totalsFromCartLines(
  lines: PricedCheckoutLine[],
  coupon: AppliedCoupon | null,
  shipping: number,
  taxExempt = false
) {
  return priceCheckoutCart({ lines, coupon, shipping, taxExempt });
}

export function totalsFromCatalog(
  requested: CatalogCheckoutRequest[],
  variants: CatalogCheckoutVariant[],
  coupon: AppliedCoupon | null,
  shipping: number,
  siblings?: CatalogCheckoutVariant[],
  taxExempt = false
) {
  return priceCheckoutCart({
    lines: catalogCheckoutLines(requested, variants, siblings),
    coupon,
    shipping,
    taxExempt,
  });
}

export function couponBlockReason(
  row: {
    is_active?: boolean | null;
    expires_at?: string | null;
    max_uses?: number | null;
    used_count?: number | null;
    bound_email?: string | null;
  },
  email: string | null,
  now = Date.now(),
  reservedUses = 0
): string | null {
  if (!row.is_active) return "This promo code is inactive.";
  if (row.expires_at && new Date(row.expires_at).getTime() < now) {
    return "This promo code has expired.";
  }
  const uses = Number(row.used_count || 0) - Math.max(0, Math.floor(reservedUses));
  if (
    row.max_uses !== null &&
    row.max_uses !== undefined &&
    uses >= Number(row.max_uses)
  ) {
    return "This promo code has reached its usage limit.";
  }
  if (row.bound_email) {
    const bound = String(row.bound_email).trim().toLowerCase();
    if (!email || bound !== email.trim().toLowerCase()) {
      return "This promo code is locked to a specific customer email.";
    }
  }
  return null;
}
