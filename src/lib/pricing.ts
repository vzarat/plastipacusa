import { formatCurrency } from "@/lib/utils";

/**
 * Hand-film price = the Supabase unit box price for the volume bracket × box count.
 * Bracket columns are per-box prices, not pallet totals.
 */
export const BOX_PRICE_PRESETS = [
  { key: "box", boxes: 1, rolls: 4, minBoxes: 1, maxBoxes: 15 },
  { key: "layer", boxes: 16, rolls: 64, minBoxes: 16, maxBoxes: 31 },
  { key: "half", boxes: 32, rolls: 128, minBoxes: 32, maxBoxes: 63 },
  { key: "full", boxes: 64, rolls: 256, minBoxes: 64, maxBoxes: Number.POSITIVE_INFINITY },
] as const;

export type BoxPricePreset = (typeof BOX_PRICE_PRESETS)[number];

export interface BoxTierPrices {
  price1Box: number | null;
  price16Boxes: number | null;
  price32Boxes: number | null;
  price64Boxes: number | null;
}

export function roundMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function parsePositivePrice(candidate: unknown): number | null {
  if (candidate === null || candidate === undefined || candidate === "") return null;
  const value = typeof candidate === "number" ? candidate : parseFloat(String(candidate));
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

function firstPositive(...candidates: unknown[]): number | null {
  for (const candidate of candidates) {
    const value = parsePositivePrice(candidate);
    if (value !== null) return value;
  }
  return null;
}

export function readBoxTierPrices(raw: unknown): BoxTierPrices {
  const row =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const nested =
    row.boxPrices && typeof row.boxPrices === "object"
      ? (row.boxPrices as Record<string, unknown>)
      : null;

  return {
    price1Box: firstPositive(
      row.price_1_box,
      row.price1Box,
      nested?.price1Box,
      nested?.price_1_box
    ),
    price16Boxes: firstPositive(
      row.price_16_boxes,
      row.price16Boxes,
      nested?.price16Boxes,
      nested?.price_16_boxes
    ),
    price32Boxes: firstPositive(
      row.price_32_boxes,
      row.price32Boxes,
      nested?.price32Boxes,
      nested?.price_32_boxes
    ),
    price64Boxes: firstPositive(
      row.price_64_boxes,
      row.price64Boxes,
      nested?.price64Boxes,
      nested?.price_64_boxes
    ),
  };
}

export function hasBoxTierPrices(prices: BoxTierPrices | null | undefined): boolean {
  if (!prices) return false;
  return (
    prices.price1Box != null ||
    prices.price16Boxes != null ||
    prices.price32Boxes != null ||
    prices.price64Boxes != null
  );
}

/** Entry price shown on catalog cards: the 1-box rate, then the next configured tier. */
export function startingBoxUnitPrice(
  prices: BoxTierPrices | null | undefined
): number | null {
  if (!prices) return null;
  return (
    prices.price1Box ??
    prices.price16Boxes ??
    prices.price32Boxes ??
    prices.price64Boxes ??
    null
  );
}

export function bracketForBoxCount(boxes: number): BoxPricePreset | null {
  const count = Math.floor(Number(boxes));
  if (!Number.isFinite(count) || count < 1) return null;
  return (
    BOX_PRICE_PRESETS.find((tier) => count >= tier.minBoxes && count <= tier.maxBoxes) ??
    null
  );
}

export function unitBoxPriceForCount(
  prices: BoxTierPrices | null | undefined,
  boxes: number
): number | null {
  if (!prices) return null;
  const bracket = bracketForBoxCount(boxes);
  if (!bracket) return null;
  const value =
    bracket.key === "box"
      ? prices.price1Box
      : bracket.key === "layer"
        ? prices.price16Boxes
        : bracket.key === "half"
          ? prices.price32Boxes
          : prices.price64Boxes;
  return value != null && value > 0 ? value : null;
}

/** Total Item Price = Applicable Unit Box Price × Number of Boxes. */
export function totalForBoxes(unitBoxPrice: number, boxes: number): number {
  const count = Math.floor(Number(boxes));
  if (!Number.isFinite(unitBoxPrice) || unitBoxPrice <= 0 || count < 1) return 0;
  return roundMoney(unitBoxPrice * count);
}

export function formatBoxPriceEquation(boxes: number, unitBoxPrice: number): string {
  const count = Math.max(0, Math.floor(Number(boxes) || 0));
  const noun = count === 1 ? "Box" : "Boxes";
  const total = totalForBoxes(unitBoxPrice, count);
  return `${count} ${noun} × ${formatCurrency(unitBoxPrice)}/box = ${formatCurrency(total)} USD`;
}

export function handCartQuote(item: {
  application?: string | null;
  totalBoxes?: number | null;
  quantity?: number | null;
  unitPrice?: number | null;
  boxUnitPrice?: number | null;
}): { boxes: number; unitBoxPrice: number; total: number } | null {
  if (String(item.application || "").toLowerCase() === "machine") return null;
  const perPackage = Math.floor(Number(item.totalBoxes) || 0);
  const packages = Math.max(1, Math.floor(Number(item.quantity) || 1));
  if (perPackage < 1) return null;

  const boxes = perPackage * packages;
  const stored = Number(item.boxUnitPrice);
  const packageUnit = Number(item.unitPrice);
  const derived =
    packageUnit > 0 ? roundMoney(packageUnit / perPackage) : 0;
  const unitBoxPrice = stored > 0 ? stored : derived;
  if (!(unitBoxPrice > 0)) return null;

  return {
    boxes,
    unitBoxPrice,
    total: totalForBoxes(unitBoxPrice, boxes),
  };
}

/** Recompute a hand-film cart line from live bracket prices. Machine lines are unchanged. */
export function repriceHandCartLine<
  T extends {
    application?: string | null;
    totalBoxes?: number | null;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    boxUnitPrice?: number | null;
  },
>(item: T, prices: BoxTierPrices | null | undefined): T {
  if (String(item.application || "").toLowerCase() === "machine") return item;
  if (!hasBoxTierPrices(prices)) return item;

  const perPackage = Math.floor(Number(item.totalBoxes) || 0);
  const packages = Math.max(1, Math.floor(Number(item.quantity) || 1));
  if (perPackage < 1) return item;

  const unit = unitBoxPriceForCount(prices, perPackage * packages);
  if (unit == null) return item;

  const packageUnit = totalForBoxes(unit, perPackage);
  const totalPrice = totalForBoxes(unit, perPackage * packages);
  if (
    item.unitPrice === packageUnit &&
    item.boxUnitPrice === unit &&
    item.totalPrice === totalPrice
  ) {
    return item;
  }

  return {
    ...item,
    unitPrice: packageUnit,
    boxUnitPrice: unit,
    totalPrice,
  };
}
