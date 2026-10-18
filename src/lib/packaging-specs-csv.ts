import { WOODEN_PALLET_LBS, packageTotalWeightLbs } from "@/lib/package-weight";
import { quoteTierPrice, roundMoney } from "@/lib/pricing";
import { handHandlingUnit } from "@/lib/shipping/hand-freight";
import type { AdminPackageTier, AdminProduct } from "@/types/product";

const HAND_TIERS = [
  { boxes: 1, rolls: 4, key: "box" },
  { boxes: 16, rolls: 64, key: "layer" },
  { boxes: 32, rolls: 128, key: "half" },
  { boxes: 64, rolls: 256, key: "full" },
] as const;

export const PACKAGING_SPECS_CSV_HEADERS = [
  "Product SKU",
  "Product Title",
  "Application",
  "Width (in)",
  "Gauge",
  "Length (ft)",
  "Rolls per Box",
  "Box SKU",
  "Box Dimensions (L x W x H in)",
  "Box Weight (lbs)",
  "Box Rolls",
  "Box Price per Box (USD)",
  "Box Package Total (USD)",
  "16-Box SKU",
  "16-Box Weight (lbs)",
  "16-Box Dimensions (L x W x H in)",
  "16-Box Price per Box (USD)",
  "16-Box Package Total (USD)",
  "16-Box Discount vs Standard (USD)",
  "32-Box SKU",
  "32-Box Weight (lbs)",
  "32-Box Pallet Tare (lbs)",
  "32-Box Dimensions (L x W x H in)",
  "32-Box Price per Box (USD)",
  "32-Box Package Total (USD)",
  "32-Box Discount vs Standard (USD)",
  "64-Box SKU",
  "64-Box Weight (lbs)",
  "64-Box Pallet Tare (lbs)",
  "64-Box Dimensions (L x W x H in)",
  "64-Box Price per Box (USD)",
  "64-Box Package Total (USD)",
  "64-Box Discount vs Standard (USD)",
  "Standard Price per Box (USD)",
  "Package Volume",
] as const;

function positive(value: unknown): number | null {
  const amount = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return amount;
}

function firstPositive(values: unknown[]): number | null {
  for (const value of values) {
    const amount = positive(value);
    if (amount != null) return amount;
  }
  return null;
}

function csvCell(value: string | number | null | undefined): string {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function money(value: number | null): string {
  if (value == null) return "";
  return roundMoney(value).toFixed(2);
}

function weightCell(value: number | null): string {
  if (value == null) return "";
  const digits = value >= 100 ? 1 : 2;
  return value.toFixed(digits);
}

function inches(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

function dimensionLabel(unit: { lengthIn: number; widthIn: number; heightIn: number }): string {
  return `${inches(unit.lengthIn)} x ${inches(unit.widthIn)} x ${inches(unit.heightIn)}`;
}

function tierFor(product: AdminProduct, boxes: number): AdminPackageTier | undefined {
  return (product.packageTiers || []).find((tier) => Math.floor(Number(tier.boxesCount) || 0) === boxes);
}

function rateFor(product: AdminProduct, boxes: number): number | null {
  const fromTier = positive(tierFor(product, boxes)?.price);
  if (fromTier != null) return fromTier;
  if (boxes === 1) return positive(product.price1Box);
  if (boxes === 16) return positive(product.price16Boxes);
  if (boxes === 32) return positive(product.price32Boxes);
  if (boxes === 64) return positive(product.price64Boxes);
  return null;
}

function sharedWeights(product: AdminProduct) {
  const tiers = product.packageTiers || [];
  return {
    roll: firstPositive([product.rollWeightLbs, ...tiers.map((tier) => tier.rollWeightLbs)]),
    box: firstPositive(tiers.map((tier) => tier.boxWeightLbs)),
    pallet: firstPositive([product.palletWeightLbs, ...tiers.map((tier) => tier.palletWeightLbs)]),
  };
}

function tierWeight(product: AdminProduct, boxes: number, rolls: number): number | null {
  const weights = sharedWeights(product);
  const machine = product.application === "machine";
  return packageTotalWeightLbs({
    boxes,
    rolls,
    rollWeightLbs: weights.roll,
    boxWeightLbs: weights.box,
    palletWeightLbs: weights.pallet,
    machine,
    widthInches: product.widthInches,
    gauge: product.gauge,
    lengthFeet: product.lengthFeet,
  });
}

function packageVolume(product: AdminProduct): string {
  if (product.application === "machine") return "6 / 12 / 20 / 40 rolls";
  return "1 / 16 / 32 / 64 boxes";
}

function productSku(product: AdminProduct): string {
  return (
    tierFor(product, 64)?.sku ||
    tierFor(product, 1)?.sku ||
    product.partNumber ||
    product.slug
  );
}

export function packagingSpecsCsv(products: AdminProduct[]): string {
  const rows = products.filter((product) => product.isActive).map((product) => {
    const machine = product.application === "machine";
    const standard = rateFor(product, 1) ?? positive(product.priceUsd);
    const cells: Array<string | number | null> = [
      productSku(product),
      product.storefrontTitle || product.name,
      product.application,
      product.widthInches ?? "",
      product.gauge ?? "",
      product.lengthFeet ?? "",
      product.rollsPerBox ?? (machine ? "" : 4),
    ];

    for (const tier of HAND_TIERS) {
      const rate = machine ? null : rateFor(product, tier.boxes);
      const gross = machine ? null : tierWeight(product, tier.boxes, tier.rolls);
      const unit = machine ? null : handHandlingUnit(tier.boxes);
      const total = rate != null ? quoteTierPrice(rate, tier.boxes).total : null;
      const discount =
        standard != null && rate != null ? roundMoney(standard - rate) : null;
      cells.push(tierFor(product, tier.boxes)?.sku || "");
      if (tier.key === "box") {
        cells.push(unit ? dimensionLabel(unit) : "", weightCell(gross), tier.rolls, money(rate), money(total));
      } else if (tier.key === "layer") {
        cells.push(weightCell(gross), unit ? dimensionLabel(unit) : "", money(rate), money(total), money(discount));
      } else {
        cells.push(
          weightCell(gross),
          gross != null ? weightCell(WOODEN_PALLET_LBS) : "",
          unit ? dimensionLabel(unit) : "",
          money(rate),
          money(total),
          money(discount)
        );
      }
    }

    cells.push(money(standard), packageVolume(product));
    return cells;
  });

  return [PACKAGING_SPECS_CSV_HEADERS, ...rows]
    .map((row) => row.map((cell) => csvCell(cell)).join(","))
    .join("\r\n");
}
