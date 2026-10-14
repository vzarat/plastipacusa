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

export type CatalogCardPriceSource = "variant" | "price_64_boxes" | "price_1_box";

/**
 * Catalog "Starting at" price.
 * A positive product_variants price wins. Otherwise use the product row:
 * price_64_boxes, then price_1_box.
 */
const CARD_BOX_COUNTS = [1, 16, 32, 64] as const;

function variantRecords(product: Record<string, unknown>): Record<string, unknown>[] {
  const groups = [product.product_variants, product.variants, product.packageTiers];
  return groups.flatMap((group) =>
    Array.isArray(group)
      ? group.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
      : []
  );
}

function variantBoxCount(record: Record<string, unknown>): number | null {
  const boxes = Math.floor(Number(record.boxes_count ?? record.boxesCount ?? record.boxes) || 0);
  if ((CARD_BOX_COUNTS as readonly number[]).includes(boxes)) return boxes;

  const rolls = Math.floor(Number(record.rolls_count ?? record.rollsCount ?? record.rolls) || 0);
  if (rolls === 4) return 1;
  if (rolls === 64) return 16;
  if (rolls === 128) return 32;
  if (rolls === 256) return 64;

  const label = String(record.title || record.package_size || record.packageSize || record.label || "");
  const boxMatch = label.match(/(\d+)\s*BOX/i);
  const labeledBoxes = Math.floor(Number(boxMatch?.[1]) || 0);
  if ((CARD_BOX_COUNTS as readonly number[]).includes(labeledBoxes)) return labeledBoxes;

  return null;
}

function moneyAmount(value: unknown): number | null {
  return parsePositivePrice(value);
}

/**
 * Per-box rate stored on a variant.
 * `price` is the unit rate for that tier. A sibling column that already equals
 * unit × boxes is a package total and is not used as the rate.
 */
export function perBoxPriceFromVariant(variant: unknown, boxes?: number): number | null {
  if (!variant || typeof variant !== "object") return null;
  const record = variant as Record<string, unknown>;
  const count = Math.floor(
    Number(boxes ?? record.boxes_count ?? record.boxesCount ?? record.boxes) || 0
  );
  const explicitUnit = moneyAmount(record.boxUnitPrice);
  const price = moneyAmount(record.price);
  const priceUsd = moneyAmount(record.price_usd ?? record.priceUsd);
  const alreadyTotal = (candidate: number, unit: number) =>
    count > 1 && Math.abs(candidate - roundMoney(unit * count)) < 0.02;

  if (explicitUnit != null) {
    if (price != null && alreadyTotal(price, explicitUnit)) return explicitUnit;
    if (priceUsd != null && alreadyTotal(priceUsd, explicitUnit)) return explicitUnit;
  }
  if (price != null && priceUsd != null && count > 1) {
    if (alreadyTotal(price, priceUsd)) return priceUsd;
    if (alreadyTotal(priceUsd, price)) return price;
  }
  return price ?? explicitUnit ?? priceUsd;
}

function variantUnitPrice(record: Record<string, unknown>, boxes?: number): number | null {
  return perBoxPriceFromVariant(record, boxes);
}

/**
 * Price shown on catalog cards and the admin product form.
 * A 1-box variant wins, then a 64-box variant, then the product columns.
 * Zero is treated as missing.
 */
export function getDisplayPrice(product: unknown): number | null {
  const row = product && typeof product === "object" ? (product as Record<string, unknown>) : {};
  const variants = variantRecords(row);

  const variant1 = variants.find((variant) => variantBoxCount(variant) === 1);
  const fromOneBox = variant1 ? variantUnitPrice(variant1, 1) : null;
  if (fromOneBox != null) return fromOneBox;

  const variant64 = variants.find((variant) => variantBoxCount(variant) === 64);
  const fromPallet = variant64 ? variantUnitPrice(variant64, 64) : null;
  if (fromPallet != null) return fromPallet;

  const prices = readBoxTierPrices(product);
  if (prices.price1Box != null) return prices.price1Box;
  if (prices.price64Boxes != null) return prices.price64Boxes;

  const variant16 = variants.find((variant) => variantBoxCount(variant) === 16);
  const fromLayer = variant16 ? variantUnitPrice(variant16, 16) : null;
  if (fromLayer != null) return fromLayer;

  const variant32 = variants.find((variant) => variantBoxCount(variant) === 32);
  const fromHalf = variant32 ? variantUnitPrice(variant32, 32) : null;
  if (fromHalf != null) return fromHalf;

  if (prices.price16Boxes != null) return prices.price16Boxes;
  if (prices.price32Boxes != null) return prices.price32Boxes;

  return null;
}

/**
 * Starting catalog package: the smallest priced box tier.
 * Variant `price` is the per-box rate. Total = that rate × boxes.
 */
export function catalogPackageQuote(product: unknown): {
  total: number;
  unitBoxPrice: number;
  boxes: number;
} | null {
  const row =
    product && typeof product === "object" ? (product as Record<string, unknown>) : {};
  const variants = variantRecords(row);

  const fromVariants = CARD_BOX_COUNTS.flatMap((boxes) => {
    const match = variants.find((variant) => variantBoxCount(variant) === boxes);
    const unit = match ? variantUnitPrice(match, boxes) : null;
    if (unit == null) return [];
    return [{ boxes, unitBoxPrice: unit, total: totalForBoxes(unit, boxes) }];
  });
  if (fromVariants.length > 0) return fromVariants[0];

  const prices = readBoxTierPrices(product);
  if (prices.price1Box != null) {
    return { boxes: 1, unitBoxPrice: prices.price1Box, total: prices.price1Box };
  }
  if (prices.price16Boxes != null) {
    return {
      boxes: 16,
      unitBoxPrice: prices.price16Boxes,
      total: totalForBoxes(prices.price16Boxes, 16),
    };
  }
  if (prices.price32Boxes != null) {
    return {
      boxes: 32,
      unitBoxPrice: prices.price32Boxes,
      total: totalForBoxes(prices.price32Boxes, 32),
    };
  }
  if (prices.price64Boxes != null) {
    return {
      boxes: 64,
      unitBoxPrice: prices.price64Boxes,
      total: totalForBoxes(prices.price64Boxes, 64),
    };
  }
  return null;
}

export function catalogCardStartingPrice(product: unknown): {
  amount: number | null;
  source: CatalogCardPriceSource | null;
} {
  const row =
    product && typeof product === "object" ? (product as Record<string, unknown>) : {};
  const variants = Array.isArray(row.variants)
    ? row.variants
    : Array.isArray(row.product_variants)
      ? row.product_variants
      : [];
  const variantPrices = variants
    .map((variant) => {
      if (!variant || typeof variant !== "object") return null;
      const record = variant as Record<string, unknown>;
      return firstPositive(record.priceUsd, record.price_usd, record.price);
    })
    .filter((price): price is number => price != null);

  if (variantPrices.length > 0) {
    return { amount: Math.min(...variantPrices), source: "variant" };
  }

  const prices = readBoxTierPrices(product);
  if (prices.price64Boxes != null) {
    return { amount: prices.price64Boxes, source: "price_64_boxes" };
  }
  if (prices.price1Box != null) {
    return { amount: prices.price1Box, source: "price_1_box" };
  }
  return { amount: null, source: null };
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
  const derived = packageUnit > 0 ? roundMoney(packageUnit / perPackage) : 0;
  const storedIsPackageTotal =
    perPackage > 1 && stored > 0 && packageUnit > 0 && Math.abs(stored - packageUnit) < 0.02;
  const unitBoxPrice = storedIsPackageTotal ? derived : stored > 0 ? stored : derived;
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
