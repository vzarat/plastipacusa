import React from "react";
import { ProductVariant } from "@/types";
import { formatCurrency } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  formatPackageWeightLbs,
  packageTotalWeightLbs,
} from "@/lib/package-weight";
import { isMachineFilm } from "@/lib/products";

const MACHINE_MATRIX_TIERS = [
  { rolls: 1, label: "1 Roll (1 Roll)" },
  { rolls: 20, label: "Half Pallet (20 Rolls / 1 Layer)" },
  { rolls: 40, label: "Full Pallet (40 Rolls / 2 Layers)" },
] as const;

interface SpecsTableProps {
  variants?: ProductVariant[] | null;
  product?: {
    application?: string | null;
    type?: string | null;
    categorySlug?: string | null;
    slug?: string | null;
    name?: string | null;
    title?: string | null;
    brand?: string | null;
    widthInches?: number | string | null;
    width_inches?: number | string | null;
    gauge?: number | null;
    length_feet?: number | null;
    lengthFeet?: number | null;
    filmType?: string | null;
    packageOptions?: Array<{
      rolls: number;
      sku: string;
      price: number;
    }> | null;
  } | null;
}

function safeNumberDisplay(value: unknown, suffix = ""): string {
  if (value === null || value === undefined || value === "") return "—";
  const n =
    typeof value === "number" ? value : parseFloat(String(value).replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(n)) return "—";
  return `${n}${suffix}`;
}

function variantRollCount(variant: ProductVariant): number {
  const explicit = Number(variant.rolls_count ?? variant.rollsCount ?? variant.rollsPerBox);
  return Number.isFinite(explicit) && explicit > 0 ? explicit : 0;
}

function firstPositive(values: Array<number | null | undefined>): number {
  for (const value of values) {
    const amount = Number(value);
    if (Number.isFinite(amount) && amount > 0) return amount;
  }
  return 0;
}

function machineMatrixRows(
  variants: ProductVariant[],
  product: SpecsTableProps["product"]
): ProductVariant[] {
  const rollWeight = firstPositive(variants.map((variant) => variant.rollWeightLbs));
  const palletWeight = firstPositive(variants.map((variant) => variant.palletWeightLbs));
  const sample = variants[0];

  return MACHINE_MATRIX_TIERS.map((tier) => {
    const match =
      variants.find(
        (variant) =>
          variantRollCount(variant) === tier.rolls && Number(variant.priceUsd) > 0
      ) ||
      variants.find((variant) => variantRollCount(variant) === tier.rolls) ||
      null;
    const option = product?.packageOptions?.find((entry) => entry.rolls === tier.rolls);
    const price = Number(match?.priceUsd) > 0 ? match?.priceUsd : option?.price;
    return {
      ...(match || sample),
      id: match?.id || option?.sku || `machine-${tier.rolls}`,
      sku: match?.sku || option?.sku || "",
      title: tier.label,
      packageSize: tier.label,
      rolls_count: tier.rolls,
      rollsCount: tier.rolls,
      rollsPerBox: tier.rolls,
      boxes_count: 0,
      boxesCount: 0,
      rollsPerPallet: 40,
      rollWeightLbs: match?.rollWeightLbs || rollWeight,
      boxWeightLbs: match?.rollWeightLbs || rollWeight,
      palletWeightLbs: match?.palletWeightLbs || palletWeight,
      widthInches: String(
        match?.widthInches || product?.widthInches || product?.width_inches || sample?.widthInches || ""
      ),
      gauge: Number(match?.gauge ?? product?.gauge ?? sample?.gauge ?? 0),
      lengthFeet: Number(
        match?.lengthFeet ?? product?.lengthFeet ?? product?.length_feet ?? sample?.lengthFeet ?? 0
      ),
      priceUsd: price != null && Number(price) > 0 ? String(price) : "",
    } as ProductVariant;
  });
}

function packageTierLabel(variant: ProductVariant): string {
  const explicit = Number(variant.rolls_count ?? variant.rollsCount);
  const rolls = Number.isFinite(explicit) && explicit > 0 ? explicit : 0;
  const boxes = Number(variant.boxes_count ?? variant.boxesCount) || 0;
  const stored = `${variant.title || ""} ${variant.packageSize || ""}`.toUpperCase();

  if (rolls === 256 || boxes === 64 || stored.includes("256 ROLLS")) {
    return "Full Pallet (256 Rolls / 64 Boxes)";
  }
  if (rolls === 128 || boxes === 32 || stored.includes("128 ROLLS")) {
    return "Half Pallet (128 Rolls / 32 Boxes)";
  }
  if (rolls === 64 || boxes === 16 || stored.includes("64 ROLLS") || stored.includes("16 BOX")) {
    return "1 Layer (64 Rolls / 16 Boxes)";
  }
  if (rolls === 4 || boxes === 1 || stored.includes("1 BOX")) {
    return "1 Box (4 Rolls)";
  }
  return variant.title || variant.packageSize || variant.sku || "—";
}

function safeLocaleNumber(value: unknown, suffix = ""): string {
  if (value === null || value === undefined || value === "") return "—";
  const n =
    typeof value === "number" ? value : parseFloat(String(value).replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(n)) return "—";
  return `${n.toLocaleString()}${suffix}`;
}

export function SpecsTable({ variants, product }: SpecsTableProps) {
  const source = Array.isArray(variants) ? variants.filter(Boolean) : [];
  const rows = isMachineFilm(product) ? machineMatrixRows(source, product) : source;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900">
            Package Dimensions & Volume Price Matrix
          </h3>
          <p className="text-xs text-slate-500">
            Official production packaging sizes, roll count, and tier pricing.
          </p>
        </div>
        <Badge variant="default" className="font-mono text-xs font-bold self-start">
          {rows.length} Package Options
        </Badge>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Package options are temporarily unavailable for this product.
        </div>
      ) : (
        <div className="w-full overflow-x-auto whitespace-nowrap -mx-4 px-4 sm:mx-0 sm:px-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Package Size Option</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Width</TableHead>
                <TableHead>Gauge</TableHead>
                <TableHead>Length</TableHead>
                <TableHead>Total Weight</TableHead>
                <TableHead>Total Rolls</TableHead>
                <TableHead>Full Pallet</TableHead>
                <TableHead className="text-right">Price (USD)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((v, index) => {
                const rolls =
                  (v as any)?.rolls_count ||
                  (v as any)?.rollsCount ||
                  v?.rollsPerBox;
                return (
                  <TableRow
                    key={v?.id || v?.sku || index}
                    className="hover:bg-sky-50/50 font-mono text-xs"
                  >
                    <TableCell className="font-bold text-slate-900 font-sans">
                      {packageTierLabel(v)}
                    </TableCell>
                    <TableCell className="text-sky-700 font-bold">
                      {v?.sku || "—"}
                    </TableCell>
                    <TableCell className="text-slate-800">
                      {safeNumberDisplay(v?.widthInches, '"')}
                    </TableCell>
                    <TableCell className="text-slate-800">
                      {v?.gauge != null ? `${v.gauge} Ga` : "—"}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {safeLocaleNumber(v?.lengthFeet, " ft")}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {formatPackageWeightLbs(
                        packageTotalWeightLbs({
                          rolls: Number(rolls) || 0,
                          boxes: Number(v?.boxes_count ?? v?.boxesCount) || 0,
                          rollWeightLbs: v?.rollWeightLbs,
                          boxWeightLbs: v?.boxWeightLbs,
                          palletWeightLbs: v?.palletWeightLbs,
                          weightLbs: v?.weightLbs,
                          machine: isMachineFilm(product),
                          widthInches: v?.widthInches,
                          gauge: v?.gauge,
                          lengthFeet: v?.lengthFeet,
                        })
                      )}
                    </TableCell>
                    <TableCell className="text-slate-600 font-sans font-medium">
                      {rolls != null ? `${rolls} rolls` : "—"}
                    </TableCell>
                    <TableCell className="text-slate-600 font-sans font-medium">
                      {v?.rollsPerPallet != null
                        ? `${v.rollsPerPallet} rolls`
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right font-sans font-black text-slate-900 text-sm">
                      {Number(v?.priceUsd ?? (v as { price?: number }).price) > 0
                        ? formatCurrency(v?.priceUsd ?? (v as { price?: number }).price ?? 0)
                        : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
