import type { ProductWithVariants } from "@/types";
import {
  usStockAvailability,
  usStockStatusLabel,
  type UsStockAvailability,
} from "@/lib/warehouse-inventory";

export function UsWarehouseStockBadge({
  product,
  className = "",
}: {
  product: Pick<
    ProductWithVariants,
    | "usStockStatus"
    | "usStockLabel"
    | "usWarehouseStock"
    | "usWarehouseReorderPoint"
    | "stockBoxes"
    | "isSoldOut"
  >;
  className?: string;
}) {
  const status: UsStockAvailability =
    product.usStockStatus ||
    usStockAvailability({
      stockBoxes: product.usWarehouseStock ?? product.stockBoxes,
      reorderPoint: product.usWarehouseReorderPoint,
      tracked:
        product.usWarehouseStock != null ||
        product.stockBoxes != null ||
        product.usStockStatus != null,
    });

  if (product.isSoldOut && status !== "backorder") {
    return null;
  }

  const label = product.usStockLabel || usStockStatusLabel(status);
  const tone =
    status === "in_stock"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : status === "low"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : status === "backorder"
          ? "border-rose-200 bg-rose-50 text-rose-800"
          : "border-slate-200 bg-slate-50 text-slate-600";

  return (
    <span
      className={`inline-flex items-center rounded-lg border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${tone} ${className}`}
    >
      {label}
    </span>
  );
}
