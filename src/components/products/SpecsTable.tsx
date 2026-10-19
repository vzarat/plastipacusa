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
import { packageTotalWeightLbs } from "@/lib/package-weight";
import {
  formatFreightDimensions,
  formatFreightWeightLabel,
  formatHandMatrixDimensions,
  formatHandMatrixWeight,
  handHandlingUnit,
  handMatrixDimensions,
  handMatrixWeightLbs,
  machineHandlingUnit,
} from "@/lib/shipping/hand-freight";
import { buildMachineFilmSelectorTiers, formatBoxRollLabel, isMachineFilm } from "@/lib/products";
import {
  BOX_PRICE_PRESETS,
  readBoxTierPrices,
  totalForBoxes,
  perBoxPriceFromVariant,
  unitBoxPriceForCount,
} from "@/lib/pricing";

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
    palletDimensions?: string | null;
    pallet_dimensions?: string | null;
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

function handMatrixRows(
  variants: ProductVariant[],
  product: SpecsTableProps["product"]
): ProductVariant[] {
  const rollWeight = firstPositive(variants.map((variant) => variant.rollWeightLbs));
  const boxAmounts = variants
    .map((variant) => Number(variant.boxWeightLbs))
    .filter((amount) => Number.isFinite(amount) && amount > 0);
  const boxWeight = boxAmounts.length > 0 ? Math.min(...boxAmounts) : 0;
  const palletWeight = firstPositive(variants.map((variant) => variant.palletWeightLbs));
  const sample = variants[0];
  const prices = readBoxTierPrices(product);
  const boxVariant =
    variants.find(
      (variant) =>
        variantRollCount(variant) === 4 || Number(variant.boxes_count ?? variant.boxesCount) === 1
    ) || null;

  return BOX_PRICE_PRESETS.map((tier) => {
    const match =
      variants.find((variant) => variantRollCount(variant) === tier.rolls) || null;
    const unit =
      perBoxPriceFromVariant(match, tier.boxes) ?? unitBoxPriceForCount(prices, tier.boxes);
    const price = unit != null ? totalForBoxes(unit, tier.boxes) : 0;
    return {
      ...(match || boxVariant || sample),
      id: match?.id || `hand-${tier.rolls}`,
      sku: match?.sku || boxVariant?.sku || "",
      title: formatBoxRollLabel(tier.boxes, tier.rolls),
      packageSize: formatBoxRollLabel(tier.boxes, tier.rolls),
      boxUnitPrice: unit,
      rolls_count: tier.rolls,
      rollsCount: tier.rolls,
      rollsPerBox: tier.rolls,
      boxes_count: tier.boxes,
      boxesCount: tier.boxes,
      rollsPerPallet: 256,
      rollWeightLbs: match?.rollWeightLbs || boxVariant?.rollWeightLbs || rollWeight,
      boxWeightLbs: boxWeight || match?.boxWeightLbs || boxVariant?.boxWeightLbs,
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

function boxesForRolls(rolls: number): number {
  if (rolls >= 256) return 64;
  if (rolls >= 128) return 32;
  if (rolls >= 64) return 16;
  if (rolls >= 4) return Math.round(rolls / 4);
  return 0;
}

const HAND_PALLET_WEIGHT_NOTE =
  "Includes wooden pallet weight (~29.2 lbs) for LTL freight accuracy.";

function packageTierLabel(variant: ProductVariant): string {
  const explicit = Number(variant.rolls_count ?? variant.rollsCount);
  const rolls = Number.isFinite(explicit) && explicit > 0 ? explicit : 0;
  const boxes = Number(variant.boxes_count ?? variant.boxesCount) || 0;
  if (rolls === 256 || boxes === 64) return "Full Pallet (Includes pallet & packaging)";
  if (boxes > 0 && rolls > 0) return formatBoxRollLabel(boxes, rolls);
  if (rolls === 128 || boxes === 32) return formatBoxRollLabel(32, 128);
  if (rolls === 64 || boxes === 16) return formatBoxRollLabel(16, 64);
  if (rolls === 4 || boxes === 1) return formatBoxRollLabel(1, 4);
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
    ? (buildMachineFilmSelectorTiers(product, source) as unknown as ProductVariant[])
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
                <TableHead>Dimensions</TableHead>
                <TableHead>Total Weight</TableHead>
                <TableHead>Total Rolls</TableHead>
                <TableHead className="text-right">Price (USD)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((v, index) => {
                const rolls =
                  (v as any)?.rolls_count ||
                  (v as any)?.rollsCount ||
                  v?.rollsPerBox;
                const boxes = Number(v?.boxes_count ?? v?.boxesCount) || boxesForRolls(Number(rolls) || 0);
                const machine = isMachineFilm(product);
                const gross = packageTotalWeightLbs({
                  rolls: Number(rolls) || 0,
                  boxes,
                  rollWeightLbs: v?.rollWeightLbs,
                  boxWeightLbs: v?.boxWeightLbs,
                  palletWeightLbs: v?.palletWeightLbs,
                  weightLbs: v?.weightLbs,
                  machine,
                  widthInches: v?.widthInches,
                  gauge: v?.gauge,
                  lengthFeet: v?.lengthFeet,
                });
                const matrixWeight = machine
                  ? null
                  : handMatrixWeightLbs(boxes, v?.boxWeightLbs ?? null, v?.palletWeightLbs ?? null);
                const unit = machine
                  ? machineHandlingUnit(Number(rolls) || 0, Number(v?.widthInches) || 0)
                  : handHandlingUnit(boxes);
                const matrixDimensions = machine
                  ? null
                  : handMatrixDimensions(
                      boxes,
                      product?.palletDimensions || product?.pallet_dimensions
                    );
                const weightLabel = machine
                  ? gross == null
                    ? "—"
                    : formatFreightWeightLabel(gross, unit)
                  : formatHandMatrixWeight(matrixWeight);
                return (
                  <TableRow
                    key={v?.id || v?.sku || index}
                    className="hover:bg-sky-50/50 font-mono text-xs"
                  >
                    <TableCell className="font-bold text-slate-900 font-sans">
                      <span className="block">{packageTierLabel(v)}</span>
                      {!machine && boxes >= 16 ? (
                        <span className="mt-1 block whitespace-normal text-[11px] font-medium text-slate-500">
                          {HAND_PALLET_WEIGHT_NOTE}
                        </span>
                      ) : null}
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
                    <TableCell className="text-slate-700 font-sans">
                      {matrixDimensions ? formatHandMatrixDimensions(matrixDimensions) : formatFreightDimensions(unit)}
                    </TableCell>
                    <TableCell className="text-slate-600 font-sans">
                      {weightLabel}
                    </TableCell>
                    <TableCell className="text-slate-600 font-sans font-medium">
                      {rolls != null ? `${rolls} rolls` : "—"}
                    </TableCell>
                    <TableCell className="text-right font-sans font-black text-slate-900 text-sm">
                      {machine ? (
                        Number(v?.priceUsd ?? (v as { price?: number }).price) > 0 ? (
                          formatCurrency(v?.priceUsd ?? (v as { price?: number }).price ?? 0)
                        ) : (
                          "—"
                        )
                      ) : Number((v as { boxUnitPrice?: number }).boxUnitPrice) > 0 && boxes > 0 ? (
                        <span className="block whitespace-normal text-right">
                          <span className="block">
                            {formatCurrency(
                              Number((v as { boxUnitPrice?: number }).boxUnitPrice) * boxes
                            )}{" "}
                            USD
                          </span>
                          <span className="block text-xs font-semibold text-slate-500">
                            {formatCurrency((v as { boxUnitPrice?: number }).boxUnitPrice)} USD / box
                          </span>
                        </span>
                      ) : (
                        "—"
                      )}
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
