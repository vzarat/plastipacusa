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
      ? Math.floor(Number(product.boxes_per_pallet) || 0) || null
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

export function formatPalletDisplay(stockBoxes: number, boxesPerPallet?: number | null): string {
  const bpp = Math.floor(Number(boxesPerPallet) || 0);
  if (bpp < 1) return "—";
  const full = Math.floor(stockBoxes / bpp);
  const loose = stockBoxes % bpp;
  if (loose === 0) return `${full} pal`;
  return `${full} pal + ${loose}`;
}
