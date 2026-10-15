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

const handBoxPreset = BOX_PRICE_PRESETS.find((tier) => tier.key === "box");
const handFullPreset = BOX_PRICE_PRESETS.find((tier) => tier.key === "full");

/** Hand film: 4 rolls in a box, 64 boxes / 256 rolls on a full pallet. */
export const HAND_ROLLS_PER_BOX = handBoxPreset?.rolls ?? 4;
export const HAND_FULL_PALLET_BOXES = handFullPreset?.boxes ?? 64;
export const HAND_FULL_PALLET_ROLLS = handFullPreset?.rolls ?? 256;
export const HAND_CATALOG_PALLET_LABEL = "Full pallet · 64 boxes · 256 rolls";

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
  const fromVariants = boxTierPricesFromVariants(variantRecords(row));
  if (hasBoxTierPrices(fromVariants)) return fromVariants;

  const nested =
    row.boxPrices && typeof row.boxPrices === "object"
      ? (row.boxPrices as Record<string, unknown>)
      : null;
  if (!nested) {
    return { price1Box: null, price16Boxes: null, price32Boxes: null, price64Boxes: null };
  }

  return {
    price1Box: firstPositive(nested.price1Box),
    price16Boxes: firstPositive(nested.price16Boxes),
    price32Boxes: firstPositive(nested.price32Boxes),
    price64Boxes: firstPositive(nested.price64Boxes),
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
 * Per-box rate stored on product_variants.price.
 * The column is the unit rate for that tier and is not multiplied here.
 */
export function perBoxPriceFromVariant(variant: unknown, _boxes?: number): number | null {
  if (!variant || typeof variant !== "object") return null;
  const record = variant as Record<string, unknown>;
  return moneyAmount(record.price);
}

/** pricePerBox is unchanged. total = pricePerBox × boxes × palletCount. */
export function quoteTierPrice(
  pricePerBox: number,
  boxes: number,
  palletCount = 1
): { pricePerBox: number; total: number } {
  const unit = roundMoney(Number(pricePerBox));
  const boxCount = Math.floor(Number(boxes));
  const pallets = Math.max(1, Math.floor(Number(palletCount)) || 1);
  if (!(unit > 0) || boxCount < 1) return { pricePerBox: 0, total: 0 };
  return { pricePerBox: unit, total: roundMoney(unit * boxCount * pallets) };
}

export function boxTierPricesFromVariants(variants: unknown): BoxTierPrices {
  const records = Array.isArray(variants)
    ? variants.filter(
        (item): item is Record<string, unknown> => Boolean(item) && typeof item === "object"
      )
    : [];
  const priceFor = (boxes: number) => {
    const match = records.find((variant) => variantBoxCount(variant) === boxes);
    return match ? perBoxPriceFromVariant(match) : null;
  };
  return {
    price1Box: priceFor(1),
    price16Boxes: priceFor(16),
    price32Boxes: priceFor(32),
    price64Boxes: priceFor(64),
  };
}

function variantUnitPrice(record: Record<string, unknown>, boxes?: number): number | null {
  return perBoxPriceFromVariant(record, boxes);
}

function isMachineCatalogRecord(row: Record<string, unknown>): boolean {
  const application = String(row.application || "").toLowerCase();
  if (application === "machine") return true;
  if (application === "hand") return false;
  const width = Math.round(Number(row.widthInches ?? row.width_inches) || 0);
  if (width === 20) return true;
  const text = `${row.slug || ""} ${row.name || ""} ${row.title || ""}`.toLowerCase();
  return text.includes("genesis") || text.includes("machine");
}

export interface HandCatalogQuote {
  pricePerBox: number;
  boxes: number;
  rolls: number;
  total: number;
  fullPallet: boolean;
}

function lowestVariantUnit(variants: Record<string, unknown>[]): number | null {
  const units = variants
    .map((variant) => variantUnitPrice(variant))
    .filter((price): price is number => price != null && price > 0);
  return units.length > 0 ? Math.min(...units) : null;
}

/** Hand-film catalog unit: the 64-box variant price, else the lowest positive variant price. */
export function handCatalogUnitPrice(product: unknown): number | null {
  const row = product && typeof product === "object" ? (product as Record<string, unknown>) : {};
  if (isMachineCatalogRecord(row)) return null;
  const variants = variantRecords(row);
  const variant64 = variants.find((variant) => variantBoxCount(variant) === HAND_FULL_PALLET_BOXES);
  const fromPallet = variant64 ? variantUnitPrice(variant64) : null;
  if (fromPallet != null) return fromPallet;
  return lowestVariantUnit(variants);
}

export function handCatalogQuote(product: unknown): HandCatalogQuote | null {
  const row = product && typeof product === "object" ? (product as Record<string, unknown>) : {};
  if (isMachineCatalogRecord(row)) return null;
  const variants = variantRecords(row);
  const variant64 = variants.find((variant) => variantBoxCount(variant) === HAND_FULL_PALLET_BOXES);
  const palletUnit = variant64 ? variantUnitPrice(variant64) : null;
  if (palletUnit != null) {
    const quote = quoteTierPrice(palletUnit, HAND_FULL_PALLET_BOXES, 1);
    return {
      pricePerBox: quote.pricePerBox,
      boxes: HAND_FULL_PALLET_BOXES,
      rolls: HAND_FULL_PALLET_ROLLS,
      total: quote.total,
      fullPallet: true,
    };
  }

  const priced = CARD_BOX_COUNTS.flatMap((boxes) => {
    const match = variants.find((variant) => variantBoxCount(variant) === boxes);
    const unit = match ? variantUnitPrice(match) : null;
    if (unit == null) return [];
    return [{ boxes, unit }];
  });
  if (priced.length === 0) return null;
  const lowest = priced.reduce((best, tier) => (tier.unit < best.unit ? tier : best));
  const preset = BOX_PRICE_PRESETS.find((tier) => tier.boxes === lowest.boxes);
  const quote = quoteTierPrice(lowest.unit, lowest.boxes, 1);
  return {
    pricePerBox: quote.pricePerBox,
    boxes: lowest.boxes,
    rolls: preset?.rolls ?? lowest.boxes * HAND_ROLLS_PER_BOX,
    total: quote.total,
    fullPallet: false,
  };
}

export function preferredHandTier<
  T extends { tierKey?: string; boxes_count?: number; boxesCount?: number; boxes?: number },
>(variants: T[]): T | undefined {
  return (
    variants.find((variant) => variant.tierKey === "full") ||
    variants.find(
      (variant) => Number(variant.boxes_count ?? variant.boxesCount ?? variant.boxes) === HAND_FULL_PALLET_BOXES
    ) ||
    variants[0]
  );
}

export interface HandFullPalletCartLine {
  productId: number;
  productSlug: string;
  productName: string;
  productImage: string;
  packageSize: string;
  totalRolls: number;
  totalBoxes: number;
  application: "hand";
  variantId: string | number;
  sku: string;
  widthInches: string;
  gauge: number;
  lengthFeet: number;
  rollsPerBox: number;
  rollsPerPallet: number;
  weightLbs: string;
  pricingTier: string;
  tierType: "full_pallet";
  unitPrice: number;
  boxUnitPrice: number;
  quantity: 1;
}

function positiveNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function variantWeightLbs(variant: Record<string, unknown>): string {
  const pallet = positiveNumber(variant.palletWeightLbs ?? variant.pallet_weight_lbs);
  if (pallet != null) return pallet.toFixed(2);
  const stored = variant.weightLbs ?? variant.weight_lbs;
  if (stored === null || stored === undefined || stored === "") return "";
  const amount = positiveNumber(stored);
  return amount != null ? String(stored) : "";
}

/**
 * One full pallet for a hand-film cart.
 * Returns null when width, gauge, length, or the 64-box variant is missing.
 */
export function buildHandFullPalletCartItem(
  product: unknown,
  variant64: unknown
): HandFullPalletCartLine | null {
  if (!product || typeof product !== "object" || !variant64 || typeof variant64 !== "object") {
    return null;
  }
  const row = product as Record<string, unknown>;
  const variant = variant64 as Record<string, unknown>;
  if (isMachineCatalogRecord(row)) return null;
  if (variantBoxCount(variant) !== HAND_FULL_PALLET_BOXES) return null;

  const width = positiveNumber(row.width_inches ?? row.widthInches);
  const gauge = positiveNumber(row.gauge);
  const lengthFeet = positiveNumber(row.length_feet ?? row.lengthFeet);
  const pricePerBox = perBoxPriceFromVariant(variant);
  const productId = positiveNumber(row.id);
  const productSlug = String(row.slug || "").trim();
  const productName = String(row.title || row.name || "").trim();
  const variantId = variant.id ?? variant.sku;
  if (
    width == null ||
    gauge == null ||
    lengthFeet == null ||
    pricePerBox == null ||
    productId == null ||
    !productSlug ||
    !productName ||
    variantId == null ||
    variantId === ""
  ) {
    return null;
  }

  const quote = quoteTierPrice(pricePerBox, HAND_FULL_PALLET_BOXES, 1);
  const images = Array.isArray(row.images) ? row.images : [];
  const productImage = String(row.imageUrl || images[0] || "");
  const packageSize = `${HAND_FULL_PALLET_BOXES} Boxes (${HAND_FULL_PALLET_ROLLS} Rolls)`;

  return {
    productId,
    productSlug,
    productName,
    productImage,
    packageSize,
    totalRolls: HAND_FULL_PALLET_ROLLS,
    totalBoxes: HAND_FULL_PALLET_BOXES,
    application: "hand",
    variantId: typeof variantId === "number" ? variantId : String(variantId),
    sku: String(variant.sku || ""),
    widthInches: String(row.width_inches ?? row.widthInches),
    gauge,
    lengthFeet,
    rollsPerBox: HAND_ROLLS_PER_BOX,
    rollsPerPallet: HAND_FULL_PALLET_ROLLS,
    weightLbs: variantWeightLbs(variant),
    pricingTier: packageSize,
    tierType: "full_pallet",
    unitPrice: quote.total,
    boxUnitPrice: quote.pricePerBox,
    quantity: 1,
  };
}

/**
 * Catalog price. Hand film uses the 64-box per-box rate from product_variants.price.
 * Machine film keeps the previous 1-box, then 64-box variant order.
 */
export function getDisplayPrice(product: unknown): number | null {
  const row = product && typeof product === "object" ? (product as Record<string, unknown>) : {};
  if (!isMachineCatalogRecord(row)) {
    return handCatalogUnitPrice(product);
  }
  const variants = variantRecords(row);

  const variant1 = variants.find((variant) => variantBoxCount(variant) === 1);
  const fromOneBox = variant1 ? variantUnitPrice(variant1, 1) : null;
  if (fromOneBox != null) return fromOneBox;

  const variant64 = variants.find((variant) => variantBoxCount(variant) === HAND_FULL_PALLET_BOXES);
  const fromPallet = variant64 ? variantUnitPrice(variant64, HAND_FULL_PALLET_BOXES) : null;
  if (fromPallet != null) return fromPallet;

  const variant16 = variants.find((variant) => variantBoxCount(variant) === 16);
  const fromLayer = variant16 ? variantUnitPrice(variant16, 16) : null;
  if (fromLayer != null) return fromLayer;

  const variant32 = variants.find((variant) => variantBoxCount(variant) === 32);
  const fromHalf = variant32 ? variantUnitPrice(variant32, 32) : null;
  if (fromHalf != null) return fromHalf;

  return null;
}

/**
 * Hand-film catalog package. The 64-box per-box rate is the price shown.
 * Total = that rate × 64. Machine products return null.
 */
export function catalogPackageQuote(product: unknown): {
  total: number;
  unitBoxPrice: number;
  boxes: number;
} | null {
  const quote = handCatalogQuote(product);
  if (!quote) return null;
  return { total: quote.total, unitBoxPrice: quote.pricePerBox, boxes: quote.boxes };
}

export function catalogCardStartingPrice(product: unknown): {
  amount: number | null;
  source: CatalogCardPriceSource | null;
} {
  const amount = handCatalogUnitPrice(product);
  if (amount == null) return { amount: null, source: null };
  const row = product && typeof product === "object" ? (product as Record<string, unknown>) : {};
  const variants = variantRecords(row);
  const hasPallet = variants.some((variant) => variantBoxCount(variant) === HAND_FULL_PALLET_BOXES);
  return { amount, source: hasPallet ? "price_64_boxes" : "variant" };
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
