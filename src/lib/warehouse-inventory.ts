/** Multi-warehouse inventory helpers (USA ecommerce stock guard). */

export const USA_WAREHOUSE_CODE = "usa";
export const MEXICO_WAREHOUSE_CODE = "mexico";

export type InventoryAdjustReason =
  | "received"
  | "dispatched"
  | "damaged"
  | "recount"
  | "transfer"
  | "other";

export type UsStockAvailability =
  | "in_stock"
  | "low"
  | "backorder"
  | "untracked";

export const US_BACKORDER_LEAD_DAYS = 7;

export interface WarehouseRecord {
  id: string;
  code: string;
  name: string;
  country: string;
  isActive: boolean;
}

export interface WarehouseInventoryRow {
  id: string;
  warehouseId: string;
  productId: string;
  stockBoxes: number;
  stockPallets: number;
  reorderPoint: number;
  updatedAt: string;
  productName?: string;
  productSlug?: string;
  application?: "hand" | "machine" | string;
  boxesPerPallet?: number | null;
  skuHint?: string;
  isActive?: boolean;
  /** Stretch film width in inches (e.g. 18). */
  widthInches?: number | null;
  /** Film gauge / calibre (e.g. 80). */
  gauge?: number | null;
  /** Roll length in feet when available. */
  lengthFeet?: number | null;
  partNumber?: string | null;
}

/** Human-readable stretch film spec for warehouse floor cards. */
export function formatStretchSpec(row: {
  widthInches?: number | null;
  gauge?: number | null;
  lengthFeet?: number | null;
  application?: string | null;
}): string {
  const parts: string[] = [];
  const width = Number(row.widthInches);
  const gauge = Number(row.gauge);
  const length = Number(row.lengthFeet);
  if (Number.isFinite(width) && width > 0) parts.push(`${width}"`);
  if (Number.isFinite(gauge) && gauge > 0) parts.push(`${gauge} GA`);
  if (Number.isFinite(length) && length > 0) parts.push(`${length} ft`);
  const kind =
    String(row.application || "").toLowerCase() === "machine" ? "Machine" : "Hand";
  parts.push(`${kind} stretch`);
  return parts.join(" · ");
}

/** Catalog row used to assign a SKU from width / gauge / length. */
export interface StretchCatalogItem {
  productId: string;
  productName: string;
  partNumber: string | null;
  application: "hand" | "machine";
  widthInches: number | null;
  gauge: number | null;
  lengthFeet: number | null;
  boxesPerPallet: number | null;
}

export type StretchMeasureInput = {
  application: "hand" | "machine";
  widthInches: number;
  gauge: number;
  lengthFeet: number;
};

function sameMeasure(a: number | null | undefined, b: number): boolean {
  if (a == null) return false;
  return Math.round(Number(a)) === Math.round(Number(b));
}

/** Prefer full-pallet catalog rows (48 boxes / 40 rolls / FLP / 64B). */
export function scoreStretchReceiveCandidate(item: StretchCatalogItem): number {
  const pn = String(item.partNumber || "").toUpperCase();
  const bpp = Math.floor(Number(item.boxesPerPallet) || 0);
  let score = 0;
  if (item.application === "machine") {
    if (pn.endsWith("-FLP") || bpp === 40) score += 100;
    if (pn.endsWith("-HLP") || bpp === 20) score += 20;
  } else {
    if (pn.endsWith("-64B") || bpp === 48 || bpp === 64) score += 100;
    if (pn.endsWith("-32B") || bpp === 32) score += 40;
    if (pn.endsWith("-16B") || bpp === 16) score += 20;
  }
  if (pn) score += 5;
  return score;
}

export function matchStretchCatalog(
  catalog: StretchCatalogItem[],
  input: StretchMeasureInput
): StretchCatalogItem[] {
  const app = input.application;
  return catalog
    .filter((item) => {
      if (item.application !== app) return false;
      if (!sameMeasure(item.widthInches, input.widthInches)) return false;
      if (!sameMeasure(item.gauge, input.gauge)) return false;
      if (!sameMeasure(item.lengthFeet, input.lengthFeet)) return false;
      return true;
    })
    .sort((a, b) => scoreStretchReceiveCandidate(b) - scoreStretchReceiveCandidate(a));
}

/** Best single SKU for inbound full pallets, or null if none match. */
export function assignStretchSkuForReceive(
  catalog: StretchCatalogItem[],
  input: StretchMeasureInput
): StretchCatalogItem | null {
  const matches = matchStretchCatalog(catalog, input);
  return matches[0] || null;
}

export function uniqueSortedNumbers(
  values: Array<number | null | undefined>
): number[] {
  const set = new Set<number>();
  for (const value of values) {
    const n = Math.round(Number(value));
    if (Number.isFinite(n) && n > 0) set.add(n);
  }
  return [...set].sort((a, b) => a - b);
}

export function mapWarehouseRow(row: Record<string, unknown>): WarehouseRecord {
  return {
    id: String(row.id),
    code: String(row.code || ""),
    name: String(row.name || ""),
    country: String(row.country || ""),
    isActive: row.is_active !== false,
  };
}

function readPositiveNumber(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return null;
  return n;
}

/** Infer hand vs machine from product fields / slug / name. */
export function inferStretchApplication(
  raw: Record<string, unknown>
): "hand" | "machine" | null {
  const hay = [
    raw.application,
    raw.type,
    raw.film_type,
    raw.filmType,
    raw.slug,
    raw.name,
    raw.title,
    raw.storefront_title,
    raw.part_number,
    raw.partNumber,
  ]
    .map((part) => String(part || "").toLowerCase())
    .join(" ");
  if (!hay.trim()) return null;
  if (
    hay.includes("machine") ||
    hay.includes("automatic") ||
    hay.includes("genesis") ||
    /-hlp\b|-flp\b/.test(hay)
  ) {
    return "machine";
  }
  if (hay.includes("hand") || hay.includes("manual") || hay.includes("stretch")) {
    return "hand";
  }
  return null;
}

/**
 * Parse width / gauge / length from slug, title, or SKU codes.
 * Examples: stretch-film-18-x-80-ga-x-1500ft · STD-SF188015 · 18" x 80 GA x 1500
 */
export function parseStretchMeasuresFromText(text: string): {
  widthInches: number | null;
  gauge: number | null;
  lengthFeet: number | null;
} {
  const raw = String(text || "");
  const lower = raw.toLowerCase();

  let widthInches: number | null = null;
  let gauge: number | null = null;
  let lengthFeet: number | null = null;

  const slugMatch = lower.match(
    /(\d{2})\s*[x×-]\s*(\d{2,3})\s*(?:ga|gauge)?\s*[x×-]\s*(\d{3,5})\s*(?:ft|feet)?/
  );
  if (slugMatch) {
    widthInches = Number(slugMatch[1]);
    gauge = Number(slugMatch[2]);
    lengthFeet = Number(slugMatch[3]);
  }

  const prettyMatch = raw.match(
    /(\d{2})\s*"?\s*[x×]\s*(\d{2,3})\s*ga(?:uge)?\s*[x×]\s*([\d,]+)\s*(?:ft|feet)?/i
  );
  if (prettyMatch) {
    widthInches = Number(prettyMatch[1]);
    gauge = Number(prettyMatch[2]);
    lengthFeet = Number(String(prettyMatch[3]).replace(/,/g, ""));
  }

  // SKU measurement block: SF188015 → 18 / 80 / 1500
  const skuMatch = raw.toUpperCase().match(/SF(\d{2})(\d{2})(\d{2})/);
  if (skuMatch) {
    widthInches = widthInches || Number(skuMatch[1]);
    gauge = gauge || Number(skuMatch[2]);
    lengthFeet = lengthFeet || Number(skuMatch[3]) * 100;
  }

  // Machine SKU: SF205170 → 20 / 51 / 7000
  const machineSku = raw.toUpperCase().match(/SF(20)(\d{2})(\d{2})/);
  if (machineSku && Number(machineSku[3]) >= 50) {
    widthInches = widthInches || 20;
    gauge = gauge || Number(machineSku[2]);
    lengthFeet = lengthFeet || Number(machineSku[3]) * 100;
  }

  return {
    widthInches: readPositiveNumber(widthInches),
    gauge: readPositiveNumber(gauge),
    lengthFeet: readPositiveNumber(lengthFeet),
  };
}

export function resolveProductStretchFields(product: Record<string, unknown>): {
  application: "hand" | "machine" | null;
  widthInches: number | null;
  gauge: number | null;
  lengthFeet: number | null;
  partNumber: string | null;
  productName: string;
  productSlug: string;
} {
  const parsed = parseStretchMeasuresFromText(
    [
      product.slug,
      product.name,
      product.title,
      product.storefront_title,
      product.part_number,
      product.partNumber,
    ]
      .map((part) => String(part || ""))
      .join(" ")
  );

  return {
    application: inferStretchApplication(product),
    widthInches:
      readPositiveNumber(product.width_inches ?? product.widthInches) ||
      parsed.widthInches,
    gauge: readPositiveNumber(product.gauge) || parsed.gauge,
    lengthFeet:
      readPositiveNumber(product.length_feet ?? product.lengthFeet) ||
      parsed.lengthFeet,
    partNumber:
      String(product.part_number || product.partNumber || "").trim() || null,
    productName: String(
      product.name || product.storefront_title || product.title || ""
    ),
    productSlug: String(product.slug || ""),
  };
}

export function mapWarehouseInventoryRow(
  row: Record<string, unknown>
): WarehouseInventoryRow {
  const product = (row.products || row.product || null) as Record<string, unknown> | null;
  const resolved = product ? resolveProductStretchFields(product) : null;
  const application =
    resolved?.application ||
    (product
      ? (String(product.application || "hand").toLowerCase() as "hand" | "machine")
      : undefined);
  const stockBoxes = Math.max(
    0,
    Math.floor(Number(row.stock_boxes ?? row.stockBoxes) || 0)
  );
  const boxesPerPallet = product
    ? unitsPerTarima(
        application,
        Math.floor(Number(product.boxes_per_pallet) || 0) || null
      )
    : null;
  const breakdown = tarimaBreakdown(stockBoxes, application, boxesPerPallet);

  return {
    id: String(row.id),
    warehouseId: String(row.warehouse_id || row.warehouseId || ""),
    productId: String(row.product_id || row.productId || ""),
    stockBoxes,
    stockPallets: Math.max(
      breakdown.tarimas,
      Number(row.stock_pallets ?? row.stockPallets) || 0
    ),
    reorderPoint: Math.max(0, Math.floor(Number(row.reorder_point ?? row.reorderPoint) || 0)),
    updatedAt: String(row.updated_at || row.updatedAt || ""),
    productName: resolved?.productName || undefined,
    productSlug: resolved?.productSlug || undefined,
    application: application || undefined,
    boxesPerPallet,
    isActive: product ? product.is_active !== false : undefined,
    widthInches: resolved?.widthInches ?? null,
    gauge: resolved?.gauge ?? null,
    lengthFeet: resolved?.lengthFeet ?? null,
    partNumber: resolved?.partNumber ?? null,
  };
}

export function usStockAvailability(input: {
  stockBoxes: number | null | undefined;
  reorderPoint?: number | null;
  tracked?: boolean;
}): UsStockAvailability {
  if (input.tracked === false || input.stockBoxes == null) return "untracked";
  const stock = Math.max(0, Math.floor(Number(input.stockBoxes) || 0));
  if (stock <= 0) return "backorder";
  const reorder = Math.max(0, Math.floor(Number(input.reorderPoint) || 0));
  if (reorder > 0 && stock <= reorder) return "low";
  return "in_stock";
}

export function usStockStatusLabel(
  status: UsStockAvailability,
  leadDays = US_BACKORDER_LEAD_DAYS
): string {
  switch (status) {
    case "in_stock":
      return "In Stock at US Warehouse";
    case "low":
      return "Low stock at US Warehouse — order soon";
    case "backorder":
      return `Backorder — typically ${leadDays} business days`;
    default:
      return "Availability on request";
  }
}

export function unitLabelForApplication(application?: string | null): "boxes" | "rolls" {
  return String(application || "").toLowerCase() === "machine" ? "rolls" : "boxes";
}

/** Units that make one stretch-film tarima (pallet) for this SKU. */
export function unitsPerTarima(
  application?: string | null,
  boxesPerPallet?: number | null
): number {
  const bpp = Math.floor(Number(boxesPerPallet) || 0);
  if (bpp > 0) return bpp;
  // Hand stretch: 48 boxes / tarima. Machine: 40 rolls / tarima.
  return String(application || "").toLowerCase() === "machine" ? 40 : 48;
}

export function tarimaBreakdown(
  stockUnits: number,
  application?: string | null,
  boxesPerPallet?: number | null
): { tarimas: number; loose: number; perTarima: number; unitLabel: "boxes" | "rolls" } {
  const perTarima = unitsPerTarima(application, boxesPerPallet);
  const units = Math.max(0, Math.floor(Number(stockUnits) || 0));
  return {
    tarimas: Math.floor(units / perTarima),
    loose: units % perTarima,
    perTarima,
    unitLabel: unitLabelForApplication(application),
  };
}

export function formatPalletDisplay(stockBoxes: number, boxesPerPallet?: number | null): string {
  const { tarimas, loose, unitLabel } = tarimaBreakdown(stockBoxes, null, boxesPerPallet);
  if (loose === 0) return `${tarimas} pallet${tarimas === 1 ? "" : "s"}`;
  return `${tarimas} pallet${tarimas === 1 ? "" : "s"} + ${loose} ${unitLabel}`;
}

/** Convert tarima count → inventory units (boxes/rolls) for RPC adjust. */
export function tarimasToUnits(
  tarimas: number,
  application?: string | null,
  boxesPerPallet?: number | null
): number {
  const count = Math.floor(Number(tarimas) || 0);
  if (count === 0) return 0;
  return count * unitsPerTarima(application, boxesPerPallet);
}
