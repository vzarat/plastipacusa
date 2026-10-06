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
import { buildMachineFilmSelectorTiers, isMachineFilm } from "@/lib/products";

const HAND_MATRIX_TIERS = [
  { rolls: 4, boxes: 1, label: "1 Box (4 Rolls)", discountRate: 0 },
  { rolls: 64, boxes: 16, label: "1 Layer (64 Rolls / 16 Boxes)", discountRate: 0.05 },
  { rolls: 128, boxes: 32, label: "Half Pallet (128 Rolls / 32 Boxes)", discountRate: 0.0625 },
  { rolls: 256, boxes: 64, label: "Full Pallet (256 Rolls / 64 Boxes)", discountRate: 0.10625 },
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

function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function handMatrixRows(
  variants: ProductVariant[],
  product: SpecsTableProps["product"]
): ProductVariant[] {
  const rollWeight = firstPositive(variants.map((variant) => variant.rollWeightLbs));
  const boxWeight = firstPositive(variants.map((variant) => variant.boxWeightLbs));
  const palletWeight = firstPositive(variants.map((variant) => variant.palletWeightLbs));
  const sample = variants[0];
  const boxVariant =
    variants.find(
      (variant) =>
        (variantRollCount(variant) === 4 || Number(variant.boxes_count ?? variant.boxesCount) === 1) &&
        Number(variant.priceUsd) > 0
    ) || null;
  const boxPrice = Number(boxVariant?.priceUsd) > 0 ? Number(boxVariant?.priceUsd) : 0;

  return HAND_MATRIX_TIERS.map((tier) => {
    const match =
      variants.find(
        (variant) =>
          variantRollCount(variant) === tier.rolls && Number(variant.priceUsd) > 0
      ) || null;
    const price =
      boxPrice > 0
        ? roundMoney(boxPrice * tier.boxes * (1 - tier.discountRate))
        : Number(match?.priceUsd) > 0
          ? Number(match?.priceUsd)
          : 0;
    return {
      ...(match || boxVariant || sample),
      id: match?.id || `hand-${tier.rolls}`,
      sku: match?.sku || boxVariant?.sku || "",
      title: tier.label,
      packageSize: tier.label,
      rolls_count: tier.rolls,
      rollsCount: tier.rolls,
      rollsPerBox: tier.rolls,
      boxes_count: tier.boxes,
      boxesCount: tier.boxes,
      rollsPerPallet: 256,
      rollWeightLbs: match?.rollWeightLbs || boxVariant?.rollWeightLbs || rollWeight,
      boxWeightLbs: match?.boxWeightLbs || boxVariant?.boxWeightLbs || boxWeight,
      palletWeightLbs: match?.palletWeightLbs || boxVariant?.palletWeightLbs || palletWeight,
      widthInches: String(
        match?.widthInches ||
          product?.widthInches ||
          product?.width_inches ||
          sample?.widthInches ||
          ""
      ),
      gauge: Number(match?.gauge ?? product?.gauge ?? sample?.gauge ?? 0),
      lengthFeet: Number(
        match?.lengthFeet ?? product?.lengthFeet ?? product?.length_feet ?? sample?.lengthFeet ?? 0
      ),
      priceUsd: price > 0 ? price.toFixed(2) : "",
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
  const rows = isMachineFilm(product)
    ? (buildMachineFilmSelectorTiers(product, source) as ProductVariant[])
    : source.length > 0
      ? handMatrixRows(source, product)
      : source;

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
