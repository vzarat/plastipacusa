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
  formatHandMatrixDimensions,
  formatHandMatrixWeight,
  handHandlingUnit,
  handMatrixDimensions,
  storedOneBoxDimensions,
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
      dimensions:
        tier.boxes === 1
          ? match?.dimensions || boxVariant?.dimensions || null
          : null,
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

interface MatrixRowView {
  key: string;
  label: string;
  sku: string;
  width: string;
  gauge: string;
  length: string;
  dimensions: string;
  weight: string;
  rolls: string;
  price: React.ReactNode;
  note: string | null;
}

function matrixRowView(
  variant: ProductVariant,
  index: number,
  product: SpecsTableProps["product"],
  machine: boolean
): MatrixRowView {
  const rolls =
    (variant as { rolls_count?: number }).rolls_count ||
    (variant as { rollsCount?: number }).rollsCount ||
    variant.rollsPerBox;
  const rollCount = Number(rolls) || 0;
  const boxes = Number(variant.boxes_count ?? variant.boxesCount) || boxesForRolls(rollCount);
  const gross = packageTotalWeightLbs({
    rolls: rollCount,
    boxes,
    rollWeightLbs: variant.rollWeightLbs,
    boxWeightLbs: variant.boxWeightLbs,
    palletWeightLbs: variant.palletWeightLbs,
    weightLbs: variant.weightLbs,
    machine,
    widthInches: variant.widthInches,
    gauge: variant.gauge,
    lengthFeet: variant.lengthFeet,
  });
  const matrixWeight = machine
    ? null
    : handMatrixWeightLbs(boxes, variant.boxWeightLbs ?? null, variant.palletWeightLbs ?? null);
  const unit = machine
    ? machineHandlingUnit(rollCount, Number(variant.widthInches) || 0)
    : handHandlingUnit(boxes);
  const storedDimensions = machine
    ? null
    : storedOneBoxDimensions(boxes, (variant as { dimensions?: string | null }).dimensions);
  const matrixDimensions = machine
    ? null
    : handMatrixDimensions(
        boxes,
        product?.palletDimensions || product?.pallet_dimensions,
        Number(variant.widthInches) || Number(product?.widthInches ?? product?.width_inches) || null
      );
  const weightLabel = machine
    ? gross == null
      ? "—"
      : `${gross.toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} lbs`
    : formatHandMatrixWeight(matrixWeight);
  const priceNode = machine ? (
    Number(variant.priceUsd ?? (variant as { price?: number }).price) > 0 ? (
      formatCurrency(variant.priceUsd ?? (variant as { price?: number }).price ?? 0)
    ) : (
      "—"
    )
  ) : Number((variant as { boxUnitPrice?: number }).boxUnitPrice) > 0 && boxes > 0 ? (
    <span className="block whitespace-normal text-right">
      <span className="block">
        {formatCurrency(Number((variant as { boxUnitPrice?: number }).boxUnitPrice) * boxes)} USD
      </span>
      <span className="block text-xs font-semibold text-slate-500">
        {formatCurrency((variant as { boxUnitPrice?: number }).boxUnitPrice)} USD / box
      </span>
    </span>
  ) : (
    "—"
  );

  return {
    key: String(variant.id || variant.sku || index),
    label: packageTierLabel(variant),
    sku: variant.sku || "—",
    width: safeNumberDisplay(variant.widthInches, '"'),
    gauge: variant.gauge != null ? `${variant.gauge} Ga` : "—",
    length: safeLocaleNumber(variant.lengthFeet, " ft"),
    dimensions:
      storedDimensions ||
      (matrixDimensions ? formatHandMatrixDimensions(matrixDimensions) : formatFreightDimensions(unit)),
    weight: weightLabel,
    rolls: rollCount > 0 ? `${rollCount} rolls` : "—",
    price: priceNode,
    note: !machine && boxes >= 16 ? HAND_PALLET_WEIGHT_NOTE : null,
  };
}

function MachineMatrixCards({ rows }: { rows: MatrixRowView[] }) {
  return (
    <div className="space-y-3 md:hidden">
      {rows.map((row) => (
        <article
          key={row.key}
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <h4 className="text-sm font-bold text-slate-900">{row.label}</h4>
            <p className="shrink-0 text-sm font-black text-slate-900">{row.price}</p>
          </div>
          <p className="mt-1 break-all font-mono text-[11px] font-bold leading-snug text-sky-700">
            {row.sku}
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
            {[
              ["Width", row.width],
              ["Gauge", row.gauge],
              ["Length", row.length],
              ["Rolls", row.rolls],
              ["Weight", row.weight],
              ["Dimensions", row.dimensions],
            ].map(([label, value]) => (
              <div key={label} className={label === "Dimensions" ? "col-span-2" : undefined}>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {label}
                </dt>
                <dd className="mt-0.5 font-medium text-slate-800">{value}</dd>
              </div>
            ))}
          </dl>
        </article>
      ))}
    </div>
  );
}

export function SpecsTable({ variants, product }: SpecsTableProps) {
  const source = Array.isArray(variants) ? variants.filter(Boolean) : [];
  const machine = isMachineFilm(product);
  const rows = machine
    ? (buildMachineFilmSelectorTiers(product, source) as unknown as ProductVariant[])
    : source.length > 0
      ? handMatrixRows(source, product)
      : source;
  const views = rows.map((variant, index) => matrixRowView(variant, index, product, machine));

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

      {views.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
          Package options are temporarily unavailable for this product.
        </div>
      ) : machine ? (
        <>
          <MachineMatrixCards rows={views} />
          <div className="hidden md:block">
            <Table
              containerClassName="overflow-hidden"
              className="table-fixed"
            >
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[16%] whitespace-normal px-3">Package</TableHead>
                  <TableHead className="w-[22%] whitespace-normal px-3">SKU</TableHead>
                  <TableHead className="w-[7%] whitespace-normal px-2">Width</TableHead>
                  <TableHead className="w-[8%] whitespace-normal px-2">Gauge</TableHead>
                  <TableHead className="w-[9%] whitespace-normal px-2">Length</TableHead>
                  <TableHead className="w-[16%] whitespace-normal px-2">Dimensions</TableHead>
                  <TableHead className="w-[10%] whitespace-normal px-2">Weight</TableHead>
                  <TableHead className="w-[7%] whitespace-normal px-2">Rolls</TableHead>
                  <TableHead className="w-[9%] whitespace-normal px-3 text-right">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {views.map((row) => (
                  <TableRow key={row.key} className="font-mono text-xs">
                    <TableCell className="whitespace-normal px-3 py-3 font-sans font-bold text-slate-900">
                      {row.label}
                    </TableCell>
                    <TableCell className="whitespace-normal break-all px-3 py-3 font-bold text-sky-700">
                      {row.sku}
                    </TableCell>
                    <TableCell className="whitespace-normal px-2 py-3 text-slate-800">{row.width}</TableCell>
                    <TableCell className="whitespace-normal px-2 py-3 text-slate-800">{row.gauge}</TableCell>
                    <TableCell className="whitespace-normal px-2 py-3 text-slate-600">{row.length}</TableCell>
                    <TableCell className="whitespace-normal px-2 py-3 font-sans text-slate-700">
                      {row.dimensions}
                    </TableCell>
                    <TableCell className="whitespace-normal px-2 py-3 font-sans text-slate-600">
                      {row.weight}
                    </TableCell>
                    <TableCell className="whitespace-normal px-2 py-3 font-sans text-slate-600">
                      {row.rolls}
                    </TableCell>
                    <TableCell className="whitespace-normal px-3 py-3 text-right font-sans text-sm font-black text-slate-900">
                      {row.price}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
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
              {views.map((row) => (
                <TableRow key={row.key} className="font-mono text-xs hover:bg-sky-50/50">
                  <TableCell className="font-sans font-bold text-slate-900">
                    <span className="block">{row.label}</span>
                    {row.note ? (
                      <span className="mt-1 block whitespace-normal text-[11px] font-medium text-slate-500">
                        {row.note}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="font-bold text-sky-700">{row.sku}</TableCell>
                  <TableCell className="text-slate-800">{row.width}</TableCell>
                  <TableCell className="text-slate-800">{row.gauge}</TableCell>
                  <TableCell className="text-slate-600">{row.length}</TableCell>
                  <TableCell className="font-sans text-slate-700">{row.dimensions}</TableCell>
                  <TableCell className="font-sans text-slate-600">{row.weight}</TableCell>
                  <TableCell className="font-sans font-medium text-slate-600">{row.rolls}</TableCell>
                  <TableCell className="text-right font-sans text-sm font-black text-slate-900">
                    {row.price}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
