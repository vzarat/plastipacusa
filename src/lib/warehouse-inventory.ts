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

export function mapWarehouseInventoryRow(
  row: Record<string, unknown>
): WarehouseInventoryRow {
  const product = (row.products || row.product || null) as Record<string, unknown> | null;
  return {
    id: String(row.id),
    warehouseId: String(row.warehouse_id || row.warehouseId || ""),
    productId: String(row.product_id || row.productId || ""),
    stockBoxes: Math.max(0, Math.floor(Number(row.stock_boxes ?? row.stockBoxes) || 0)),
    stockPallets: Math.max(0, Number(row.stock_pallets ?? row.stockPallets) || 0),
    reorderPoint: Math.max(0, Math.floor(Number(row.reorder_point ?? row.reorderPoint) || 0)),
    updatedAt: String(row.updated_at || row.updatedAt || ""),
    productName: product
      ? String(product.name || product.storefront_title || product.title || "")
      : undefined,
    productSlug: product ? String(product.slug || "") : undefined,
    application: product
      ? (String(product.application || "hand").toLowerCase() as "hand" | "machine")
      : undefined,
    boxesPerPallet: product
      ? unitsPerTarima(
          String(product.application || "hand"),
          Math.floor(Number(product.boxes_per_pallet) || 0) || null
        )
      : null,
    isActive: product ? product.is_active !== false : undefined,
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
