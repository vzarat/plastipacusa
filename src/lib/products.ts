/**
 * Product catalog helpers, warehouse palletizing metadata, and packaging tier rules.
 */
export {
  resolvePalletizingSpecs,
  isExcludedFifteenInchEightyGauge,
  fullPalletPackageLabel,
  type PalletizingSpecs,
  type PalletizingInput,
} from "@/lib/palletizing";

import type { ProductWithVariants } from "@/types";
import { machineFilmTierSku } from "@/lib/machine-film-sku";
import { machineFilmPackagePrice, machineFilmPerRollPrice } from "@/lib/machine-film-pricing";
import { MACHINE_FILM_WEIGHT_SPECS, packageTotalWeightLbs } from "@/lib/package-weight";

/** Remote fallback when a product row has no image_url. Never stored in /public. */
export const STRETCH_FILM_PLACEHOLDER =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/productos_plastipac_manual.png";

export interface PackageOptionLike {
  rolls: number;
  label: string;
  sku: string;
  price: number;
}

export const MACHINE_FILM_IMAGE_URL =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/AUTOMATIC_STRETCH_FILM.png";

/** Manual stretch film gallery extras. The roll photo stays first. */
export const HAND_FILM_BOX_IMAGE_URL =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PRODUCTOS/CAJA_MANUAL_PLASTIPAC.png";

export const HAND_FILM_SPEC_SHEET_IMAGE_URL =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PRODUCTOS/FICHA%20TECNICA.png";

function isManualRollPhoto(url: string): boolean {
  const value = url.toLowerCase();
  return (
    value.length > 0 &&
    !value.includes("caja_manual_plastipac") &&
    !value.includes("ficha")
  );
}

/**
 * Hand stretch film gallery. `products.images` is a text[].
 * Order is the stored roll photo, then the carton, then the technical sheet.
 */
export function manualFilmGallery(stored: unknown, fallbackRoll?: string | null): string[] {
  const list = Array.isArray(stored) ? stored.map((item) => String(item || "").trim()) : [];
  const fallback = String(fallbackRoll || "").trim();
  const roll =
    list.find((url) => isManualRollPhoto(url)) ||
    (isManualRollPhoto(fallback) ? fallback : "") ||
    STRETCH_FILM_PLACEHOLDER;
  return [roll, HAND_FILM_BOX_IMAGE_URL, HAND_FILM_SPEC_SHEET_IMAGE_URL];
}

export const GENESIS_HP_LOGO_URL =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/GENESIS_HP.svg";

export const GENESIS_ST_LOGO_URL =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/GENESIS_ST.svg";

/** True for Machine High-Yield / automatic cast films (sold by the roll, not boxed). */
export function isMachineFilm(product: {
  application?: string | null;
  applicationType?: string | null;
  type?: string | null;
  categorySlug?: string | null;
  slug?: string | null;
  name?: string | null;
  title?: string | null;
  brand?: string | null;
  filmType?: string | null;
  category?: { name?: string | null } | string | null;
  widthInches?: number | string | null;
  width_inches?: number | string | null;
} | null | undefined): boolean {
  if (!product) return false;
  const app = String(
    product?.application || product?.applicationType || product?.type || ""
  ).toLowerCase();
  if (app === "machine") return true;

  const width = Math.round(
    Number(product.widthInches ?? product.width_inches ?? 0)
  );
  if (width === 20) return true;

  const categoryName =
    typeof product.category === "string" ? product.category : product.category?.name;
  const haystack = [
    product.categorySlug,
    categoryName,
    product.filmType,
    product.slug,
    product.name,
    product.title,
    product.brand,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return (
    haystack.includes("machine") ||
    haystack.includes("genesis") ||
    haystack.includes("high-yield") ||
    haystack.includes("automatic") ||
    haystack.includes("20-x") ||
    haystack.includes('20"')
  );
}

/** Canonical machine film package tiers. Sold by the pallet, with no boxes. */
export const MACHINE_PACKAGE_TIERS = [
  { rolls: 20, label: "Half Pallet (20 Rolls)", suffix: "HLP" },
  { rolls: 40, label: "Full Pallet (40 Rolls)", suffix: "FLP" },
] as const;

function officialMachineTierSku(
  width: number,
  gauge: number,
  length: number,
  rolls: number
): string | null {
  return machineFilmTierSku({ widthInches: width, gauge, lengthFeet: length, rolls });
}

/** Canonical hand film full-pallet pack-out (3 layers × 64 rolls). */
export const HAND_FULL_PALLET = {
  boxes: 48,
  rolls: 192,
  label: "48 Boxes (192 Rolls)",
} as const;

export function formatBoxRollLabel(boxes: number, rolls: number): string {
  const boxCount = Math.max(0, Math.round(boxes));
  const rollCount = Math.max(0, Math.round(rolls));
  const boxWord = boxCount === 1 ? "Box" : "Boxes";
  const rollWord = rollCount === 1 ? "Roll" : "Rolls";
  return `${boxCount} ${boxWord} (${rollCount} ${rollWord})`;
}

/** Customer-facing package name. Hand film leads with boxes; machine film stays in rolls. */
export function presentPackageLabel(input: {
  label?: string | null;
  boxes?: number | null;
  rolls?: number | null;
  application?: string | null;
}): string {
  const label = String(input.label || "").trim();
  const upper = label.toUpperCase();
  const rolls = Number(input.rolls) || 0;
  const boxes = Number(input.boxes) || 0;
  const machine =
    input.application === "machine" ||
    upper.includes("20 ROLL") ||
    upper.includes("40 ROLL") ||
    (upper.includes("2 LAYER") && upper.includes("FULL"));

  if (machine) {
    if (rolls === 40 || upper.includes("40 ROLL") || upper.includes("2 LAYER")) {
      return "Full Pallet (40 Rolls)";
    }
    if (rolls === 20 || upper.includes("20 ROLL") || upper.includes("1 LAYER")) {
      return "Half Pallet (20 Rolls)";
    }
  }

  const boxMatch = upper.match(/(\d+)\s*BOX/);
  const rollMatch = upper.match(/(\d+)\s*ROLL/);
  if (boxMatch && rollMatch) {
    return formatBoxRollLabel(Number(boxMatch[1]), Number(rollMatch[1]));
  }

  if (boxes > 0 && rolls > 0 && rolls !== 4) {
    return formatBoxRollLabel(boxes, rolls);
  }

  if (rolls === 256 || boxes === 64 || upper.includes("256 ROLL") || upper.includes("64 BOX")) {
    return formatBoxRollLabel(64, 256);
  }
  if (rolls === 192 || boxes === 48 || upper.includes("192 ROLL") || upper.includes("48 BOX")) {
    return formatBoxRollLabel(48, 192);
  }
  if (rolls === 128 || boxes === 32 || upper.includes("128 ROLL") || upper.includes("32 BOX")) {
    return formatBoxRollLabel(32, 128);
  }
  if (
    rolls === 64 ||
    boxes === 16 ||
    upper.includes("1 LAYER") ||
    upper.includes("16 BOX") ||
    upper.includes("64 ROLL")
  ) {
    return formatBoxRollLabel(16, 64);
  }
  if (rolls === 4 || boxes === 1 || upper.includes("1 BOX")) {
    return formatBoxRollLabel(1, rolls === 4 || rolls <= 0 ? 4 : rolls);
  }

  return label;
}

export function unitLabelForProduct(isMachine: boolean): string {
  return isMachine ? "Roll" : "Box";
}

export function normalizeMachinePackageLabel(rolls: number, label?: string): string {
  const upper = String(label || "").toUpperCase();
  if (rolls === 20 || upper.includes("20 ROLL")) {
    return "Half Pallet (20 Rolls)";
  }
  if (rolls === 40 || upper.includes("40 ROLL")) {
    return "Full Pallet (40 Rolls)";
  }
  return label || `${rolls} ROLLS`;
}

export function buildMachinePackageOptions(input: {
  baseSku: string;
  price1?: number | null;
  price20?: number | null;
  price40?: number | null;
  widthInches?: number | string | null;
  gauge?: number | string | null;
  lengthFeet?: number | string | null;
}): PackageOptionLike[] {
  const tiers: Array<{
    rolls: number;
    label: string;
    suffix: string;
    price: number | null | undefined;
  }> = [
    { ...MACHINE_PACKAGE_TIERS[0], price: input.price20 },
    { ...MACHINE_PACKAGE_TIERS[1], price: input.price40 },
  ];

  return tiers
    .filter(
      (tier) =>
        tier.price !== null && tier.price !== undefined && Number(tier.price) > 0
    )
    .map((tier) => ({
      rolls: tier.rolls,
      label: tier.label,
      sku:
        machineFilmTierSku({
          widthInches: input.widthInches,
          gauge: input.gauge,
          lengthFeet: input.lengthFeet,
          rolls: tier.rolls,
        }) || `${input.baseSku}-${tier.suffix}`,
      price: Number(tier.price),
    }));
}

/**
 * Full-pallet per-roll price compared with the half-pallet per-roll price.
 * Matches the 20-roll and 40-roll tier columns (580.36 vs 1,099.64).
 */
const MACHINE_FULL_PALLET_UNIT_RATE = 1099.64 / (580.36 * 2);

function roundTierMoney(amount: number): number {
  return Math.round(amount * 100) / 100;
}

function firstPositiveAmount(values: unknown[]): number {
  for (const value of values) {
    const amount = typeof value === "number" ? value : parseFloat(String(value ?? ""));
    if (Number.isFinite(amount) && amount > 0) return amount;
  }
  return 0;
}

function sourceRolls(item: any): number {
  return Number(item?.rolls ?? item?.rolls_count ?? item?.rollsCount ?? item?.rollsPerBox ?? 0);
}

function sourcePrice(item: any): number {
  return firstPositiveAmount([item?.price, item?.priceUsd, item?.price_usd]);
}

/**
 * Machine film is sold as a half pallet and a full pallet even when the
 * database only has a single-roll price. Half pallet is first so it can be
 * the default selection.
 */
export function buildMachineFilmSelectorTiers(product: any, variants?: any[] | null) {
  const sources = [...(product?.packageOptions || []), ...(variants || product?.variants || [])];
  const widthInches = String(product?.width_inches || product?.widthInches || sources[0]?.widthInches || "20.00");
  const gauge = Number(product?.gauge || sources[0]?.gauge || 60);
  const lengthFeet = Number(product?.length_feet || product?.lengthFeet || sources[0]?.lengthFeet || 0);
  const singleRoll = sources.find((item) => sourceRolls(item) === 1 && sourcePrice(item) > 0);
  const looseRoll = sources.find(
    (item) => sourcePrice(item) > 0 && sourceRolls(item) > 0 && sourceRolls(item) < 20
  );
  const storedTierPrice = (rolls: number) => {
    const match = sources.find((item) => sourceRolls(item) === rolls && sourcePrice(item) > 0);
    if (match) return sourcePrice(match);
    if (rolls === 20) {
      return firstPositiveAmount([product?.price20Rolls, product?.price_20_rolls]);
    }
    return firstPositiveAmount([product?.price40Rolls, product?.price_40_rolls]);
  };
  const halfStored = storedTierPrice(20);
  const fullStored = storedTierPrice(40);
  const unitRollPrice =
    sourcePrice(singleRoll) ||
    firstPositiveAmount([product?.price6Rolls, product?.price_6_rolls, product?.price1]) ||
    (halfStored > 0 || fullStored > 0
      ? 0
      : firstPositiveAmount([
          product?.priceUsd,
          product?.price_usd,
          product?.price,
          product?.startingPrice,
        ])) ||
    (looseRoll ? sourcePrice(looseRoll) / Math.max(1, sourceRolls(looseRoll)) : 0);
  const rollWeight = firstPositiveAmount([
    ...sources.map((item) => item?.rollWeightLbs ?? item?.roll_weight_lbs),
    product?.rollWeightLbs,
    product?.roll_weight_lbs,
    MACHINE_FILM_WEIGHT_SPECS.find(
      (row) =>
        row.width === Math.round(Number(widthInches) || 0) &&
        row.gauge === Math.round(gauge) &&
        row.length === Math.round(lengthFeet)
    )?.roll,
  ]);
  const baseSku = String(product?.partNumber || product?.part_number || product?.slug || "MACHINE");

  const palletTotalMatchesUnit = (stored: number, rolls: number, unit: number) => {
    if (!(stored > 0)) return false;
    if (!(unit > 0)) return true;
    const perRoll = stored / rolls;
    return perRoll <= unit * 1.05 && perRoll >= unit * 0.5;
  };

  const halfPerRoll = palletTotalMatchesUnit(halfStored, 20, unitRollPrice)
    ? halfStored / 20
    : unitRollPrice;
  const halfPrice = halfPerRoll > 0 ? roundTierMoney(halfPerRoll * 20) : 0;
  const storedFullPerRoll = fullStored > 0 ? fullStored / 40 : 0;
  const fullPerRoll =
    palletTotalMatchesUnit(fullStored, 40, halfPerRoll) &&
    storedFullPerRoll > 0 &&
    storedFullPerRoll < halfPerRoll - 0.004
      ? storedFullPerRoll
      : halfPerRoll > 0
        ? roundTierMoney(halfPerRoll * MACHINE_FULL_PALLET_UNIT_RATE)
        : 0;
  const fullPrice = fullPerRoll > 0 ? roundTierMoney(fullPerRoll * 40) : 0;
  const officialHalf = machineFilmPerRollPrice({
    widthInches,
    gauge,
    lengthFeet,
    rolls: 20,
  });
  const officialFull = machineFilmPerRollPrice({
    widthInches,
    gauge,
    lengthFeet,
    rolls: 40,
  });
  const pricedHalfPerRoll = officialHalf ?? halfPerRoll;
  const pricedFullPerRoll = officialFull ?? fullPerRoll;
  const pricedHalf = officialHalf != null ? machineFilmPackagePrice({ widthInches, gauge, lengthFeet, rolls: 20 }) ?? 0 : halfPrice;
  const pricedFull = officialFull != null ? machineFilmPackagePrice({ widthInches, gauge, lengthFeet, rolls: 40 }) ?? 0 : fullPrice;
  const fullPalletSavingsPerRoll =
    pricedHalfPerRoll > 0 && pricedFullPerRoll > 0
      ? roundTierMoney(pricedHalfPerRoll - pricedFullPerRoll)
      : 0;

  return MACHINE_PACKAGE_TIERS.map((tier) => {
    const price = tier.rolls === 40 ? pricedFull : pricedHalf;
    const perRollPrice = tier.rolls === 40 ? pricedFullPerRoll : pricedHalfPerRoll;
    const storedTier = sources.find((item) => sourceRolls(item) === tier.rolls);
    const weight = packageTotalWeightLbs({
      rolls: tier.rolls,
      machine: true,
      rollWeightLbs: rollWeight,
      palletWeightLbs: storedTier?.palletWeightLbs ?? storedTier?.pallet_weight_lbs,
      widthInches,
      gauge,
      lengthFeet,
    });
    const officialSku = officialMachineTierSku(
      Math.round(Number(widthInches) || 0),
      Math.round(gauge),
      Math.round(lengthFeet),
      tier.rolls
    );
    const sku = officialSku || String(storedTier?.sku || `${baseSku}-${tier.suffix}`);
    return {
      id: storedTier?.id || sku,
      sku,
      tierKey: tier.rolls === 20 ? "fixed_half" : "full_pallet",
      title: tier.label,
      packageSize: tier.label,
      tierSubtext: tier.rolls === 20 ? "20 Rolls" : "40 Rolls",
      tierBadges:
        tier.rolls === 40 && fullPalletSavingsPerRoll >= 0.01
          ? [`Save $${fullPalletSavingsPerRoll.toFixed(2)} / roll`]
          : [],
      price,
      perRollPrice,
      priceUsd: price > 0 ? price.toFixed(2) : "",
      rolls: tier.rolls,
      rolls_count: tier.rolls,
      rollsCount: tier.rolls,
      rollsPerBox: tier.rolls,
      boxes_count: 0,
      boxesCount: 0,
      rollsPerPallet: 40,
      widthInches,
      gauge,
      lengthFeet,
      weightLbs: weight != null ? String(weight) : "",
      rollWeightLbs: rollWeight,
      boxWeightLbs: rollWeight,
      palletWeightLbs: tier.rolls === 40 && weight != null ? weight : 0,
      stockStatus: "in_stock",
      createdAt: new Date().toISOString(),
    };
  });
}

export const SERIES_FORCE_STANDARD = "FORCE Standard";
export const SERIES_FORCE_ELITE = "FORCE Elite";
export const SERIES_GENESIS_STANDARD = "GENESIS Standard";
export const SERIES_GENESIS_HP = "GENESIS High Performance";

export type FeaturedSeriesLabel =
  | typeof SERIES_FORCE_STANDARD
  | typeof SERIES_FORCE_ELITE
  | typeof SERIES_GENESIS_STANDARD
  | typeof SERIES_GENESIS_HP;

/** Official Machine Film catalog — only these four width × gauge × length specs. */
export const OFFICIAL_MACHINE_FILM_SPECS = [
  { width: 20, gauge: 51, length: 7000, slug: "stretch-film-20-x-51-ga-x-7000ft" },
  { width: 20, gauge: 51, length: 9000, slug: "stretch-film-20-x-51-ga-x-9000ft" },
  { width: 20, gauge: 70, length: 5000, slug: "stretch-film-20-x-70-ga-x-5000ft" },
  { width: 20, gauge: 80, length: 5000, slug: "stretch-film-20-x-80-ga-x-5000ft" },
] as const;

const OFFICIAL_MACHINE_SLUGS = new Set<string>(
  OFFICIAL_MACHINE_FILM_SPECS.map((spec) => spec.slug)
);

const OFFICIAL_MACHINE_SPEC_KEYS = new Set(
  OFFICIAL_MACHINE_FILM_SPECS.map(
    (spec) => `${spec.width}::${spec.gauge}::${spec.length}`
  )
);

export function isOfficialMachineFilmProduct(product: {
  slug?: string | null;
  application?: string | null;
  widthInches?: number | string | null;
  width_inches?: number | string | null;
  gauge?: number | string | null;
  length_feet?: number | string | null;
  lengthFeet?: number | string | null;
}): boolean {
  const slug = String(product.slug || "").toLowerCase();
  if (OFFICIAL_MACHINE_SLUGS.has(slug)) return true;

  const width = Math.round(Number(product.widthInches ?? product.width_inches ?? 0));
  const gauge = Math.round(Number(product.gauge ?? 0));
  const length = Math.round(
    Number(product.length_feet ?? product.lengthFeet ?? 0)
  );
  if (!Number.isFinite(width) || !Number.isFinite(gauge) || !Number.isFinite(length)) {
    return false;
  }
  return OFFICIAL_MACHINE_SPEC_KEYS.has(`${width}::${gauge}::${length}`);
}

/** Machine film cards come from Supabase only. These lists stay empty so no static card is rendered. */
export const GENESIS_MACHINE_FALLBACK_PRODUCTS: ProductWithVariants[] = [];

/** Machine film is High Performance only. Standard no longer duplicates those four specs. */
export const GENESIS_STANDARD_FALLBACK_PRODUCTS: ProductWithVariants[] = [];

export const GENESIS_HP_SLUGS = new Set<string>(
  OFFICIAL_MACHINE_FILM_SPECS.map((spec) => spec.slug)
);

export const GENESIS_STANDARD_SLUGS = new Set(
  GENESIS_STANDARD_FALLBACK_PRODUCTS.map((p) => p.slug.toLowerCase())
);

/** Official GENESIS Standard catalog: exactly 4 gauge × length fingerprints. */
export const GENESIS_STANDARD_OFFICIAL_SPECS = GENESIS_STANDARD_FALLBACK_PRODUCTS.map(
  (p) => ({
    slug: p.slug.toLowerCase(),
    gauge: p.gauge,
    lengthFeet: Number(p.length_feet),
    title: p.title,
  })
);

/** Titles / patterns that must never appear under GENESIS (retired 20" machine SKUs). */
const OBSOLETE_GENESIS_STANDARD_PATTERN =
  /20"?\s*X\s*60\s*GA|20"?\s*X\s*63\s*GA|20"?\s*X\s*\d+\s*GA\s*X\s*6000|6000\s*FT/i;

function genesisStandardSpecKey(
  gauge?: number | null,
  lengthFeet?: number | null
): string {
  return `${Number(gauge ?? 0)}::${Number(lengthFeet ?? 0)}`;
}

const GENESIS_STANDARD_SPEC_KEYS = new Set(
  GENESIS_STANDARD_OFFICIAL_SPECS.map((s) =>
    genesisStandardSpecKey(Number(s.gauge ?? 0), Number(s.lengthFeet ?? 0))
  )
);

/** True only for the 4 official GENESIS Standard SKUs (slug + gauge + length). */
export function isOfficialGenesisStandardProduct(product: {
  slug?: string | null;
  title?: string | null;
  name?: string | null;
  gauge?: number | string | null;
  length_feet?: number | string | null;
  lengthFeet?: number | string | null;
  series?: string | null;
}): boolean {
  const title = String(product.title || product.name || "");
  if (OBSOLETE_GENESIS_STANDARD_PATTERN.test(title)) return false;

  const slug = String(product.slug || "").toLowerCase();
  if (!GENESIS_STANDARD_SLUGS.has(slug)) return false;

  const gauge = Number(product.gauge);
  const lengthFeet = Number(product.length_feet ?? product.lengthFeet);

  // Prefer exact gauge×length match against the official 4
  if (Number.isFinite(gauge) && Number.isFinite(lengthFeet) && lengthFeet > 0) {
    return GENESIS_STANDARD_SPEC_KEYS.has(genesisStandardSpecKey(gauge, lengthFeet));
  }

  // Slug-only fallback when specs missing: must still be one of the 4 official slugs
  return GENESIS_STANDARD_OFFICIAL_SPECS.some((s) => s.slug === slug);
}

function seriesCatalogKey(product: { slug?: string | null; series?: string | null }) {
  return `${String(product.slug || "").toLowerCase()}::${String(product.series || "")}`;
}

function officialMachineSpecKey(product: {
  slug?: string | null;
  widthInches?: number | string | null;
  width_inches?: number | string | null;
  gauge?: number | string | null;
  length_feet?: number | string | null;
  lengthFeet?: number | string | null;
}): string | null {
  if (!isOfficialMachineFilmProduct(product)) return null;
  const slug = String(product.slug || "").toLowerCase();
  const fromSlug = OFFICIAL_MACHINE_FILM_SPECS.find((spec) => spec.slug === slug);
  if (fromSlug) return `${fromSlug.width}::${fromSlug.gauge}::${fromSlug.length}`;
  const width = Math.round(Number(product.widthInches ?? product.width_inches ?? 0));
  const gauge = Math.round(Number(product.gauge ?? 0));
  const length = Math.round(Number(product.length_feet ?? product.lengthFeet ?? 0));
  return `${width}::${gauge}::${length}`;
}

function machineCatalogScore(product: ProductWithVariants): number {
  const pricedVariants = (product.variants || []).filter(
    (variant) => Number.parseFloat(String(variant.priceUsd || 0)) > 0
  ).length;
  return (
    pricedVariants * 10 +
    (product.packageOptions?.length || 0) +
    (product.isActive === false ? -100 : 0)
  );
}

/** Map categorySlug → exact featured series label. */
export function seriesLabelFromCategorySlug(categorySlug?: string | null): FeaturedSeriesLabel | undefined {
  switch (String(categorySlug || "").toLowerCase()) {
    case "force-elite":
      return SERIES_FORCE_ELITE;
    case "force-standard":
      return SERIES_FORCE_STANDARD;
    case "genesis-standard":
      return SERIES_GENESIS_STANDARD;
    case "genesis-high-performance":
    case "machine-high-yield-film":
      return SERIES_GENESIS_HP;
    default:
      return undefined;
  }
}

/** One High Performance card per official machine spec. Hand film is left as-is. */
export function ensureGenesisMachineProducts(
  products: ProductWithVariants[]
): ProductWithVariants[] {
  const byKey = new Map<string, ProductWithVariants>();

  for (const product of products) {
    const title = String(product.title || product.name || "");
    const slug = String(product.slug || "").toLowerCase();
    const isMachineRow =
      product.application === "machine" ||
      Math.round(Number(product.widthInches ?? product.width_inches ?? 0)) === 20 ||
      slug.startsWith("stretch-film-20") ||
      /genesis|machine|automatic/i.test(
        `${product.categorySlug || ""} ${product.series || ""} ${title}`
      );

    // Drop retired machine SKUs; hand film passes through unchanged.
    if (isMachineRow && !isOfficialMachineFilmProduct(product)) {
      continue;
    }

    // Drop obsolete / duplicate GENESIS Standard candidates before series assignment
    if (isMachineRow && OBSOLETE_GENESIS_STANDARD_PATTERN.test(title)) {
      continue;
    }

    let series =
      product.series ||
      seriesLabelFromCategorySlug(product.categorySlug) ||
      undefined;

    // Never keep loose GENESIS rows without an exact series — assign by slug allowlist
    if (!series) {
      if (GENESIS_STANDARD_SLUGS.has(slug) && !GENESIS_HP_SLUGS.has(slug)) {
        series = SERIES_GENESIS_STANDARD;
      } else if (GENESIS_HP_SLUGS.has(slug) && !GENESIS_STANDARD_SLUGS.has(slug)) {
        series = SERIES_GENESIS_HP;
      } else if (GENESIS_STANDARD_SLUGS.has(slug) && GENESIS_HP_SLUGS.has(slug)) {
        // Overlap SKU from DB: keep one entry; dedicated fallbacks inject both series copies
        series = SERIES_GENESIS_HP;
      } else if (seriesLabelFromCategorySlug(product.categorySlug)) {
        series = seriesLabelFromCategorySlug(product.categorySlug);
      }
    }

    // Strip unauthorized GENESIS Standard tagging (legacy DB rows, wrong category, etc.)
    if (
      series === SERIES_GENESIS_STANDARD &&
      !isOfficialGenesisStandardProduct({ ...product, series })
    ) {
      // Do not surface as GENESIS Standard — keep only if it belongs to HP allowlist
      if (GENESIS_HP_SLUGS.has(slug) || isOfficialMachineFilmProduct(product)) {
        series = SERIES_GENESIS_HP;
      } else {
        continue;
      }
    }

    const specKey = isMachineRow ? officialMachineSpecKey(product) : null;
    const withSeries: ProductWithVariants = specKey
      ? {
          ...product,
          series: SERIES_GENESIS_HP,
          application: "machine",
          categorySlug: "genesis-high-performance",
          imageUrl: MACHINE_FILM_IMAGE_URL,
          images: [MACHINE_FILM_IMAGE_URL],
        }
      : {
          ...product,
          series,
          categorySlug:
            series === SERIES_GENESIS_STANDARD
              ? "genesis-standard"
              : series === SERIES_GENESIS_HP
                ? "genesis-high-performance"
                : product.categorySlug,
        };

    if (specKey) {
      const key = `machine:${specKey}`;
      const existing = byKey.get(key);
      byKey.set(
        key,
        existing && machineCatalogScore(existing) >= machineCatalogScore(withSeries)
          ? existing
          : withSeries
      );
    } else if (withSeries.series) {
      byKey.set(seriesCatalogKey(withSeries), withSeries);
    } else {
      byKey.set(`id:${withSeries.id}:${slug}`, withSeries);
    }
  }

  // Final purge: GENESIS Standard grid must be exactly the 4 official SKUs
  const officialStandardKeys = new Set(
    GENESIS_STANDARD_FALLBACK_PRODUCTS.map((p) => seriesCatalogKey(p))
  );

  return Array.from(byKey.values()).filter((product) => {
    const isMachineRow =
      product.application === "machine" ||
      Math.round(Number(product.widthInches ?? product.width_inches ?? 0)) === 20 ||
      String(product.slug || "")
        .toLowerCase()
        .startsWith("stretch-film-20");
    if (isMachineRow && !isOfficialMachineFilmProduct(product)) {
      return false;
    }
    if (product.series !== SERIES_GENESIS_STANDARD) return true;
    return (
      officialStandardKeys.has(seriesCatalogKey(product)) &&
      isOfficialGenesisStandardProduct(product)
    );
  });
}

export function getGenesisMachineFallbackBySlug(
  slug: string
): ProductWithVariants | null {
  const key = String(slug || "").toLowerCase();
  return (
    GENESIS_MACHINE_FALLBACK_PRODUCTS.find((p) => p.slug.toLowerCase() === key) ||
    GENESIS_STANDARD_FALLBACK_PRODUCTS.find((p) => p.slug.toLowerCase() === key) ||
    null
  );
}

/** Strict series equality helpers for featured tabs. */
export function isGenesisHighPerformanceProduct(product: {
  slug?: string | null;
  series?: string | null;
}): boolean {
  if (product.series === SERIES_GENESIS_HP) return true;
  if (product.series === SERIES_GENESIS_STANDARD) return false;
  return GENESIS_HP_SLUGS.has(String(product.slug || "").toLowerCase());
}

export function isGenesisStandardProduct(product: {
  slug?: string | null;
  title?: string | null;
  name?: string | null;
  gauge?: number | string | null;
  length_feet?: number | string | null;
  lengthFeet?: number | string | null;
  series?: string | null;
}): boolean {
  if (product.series === SERIES_GENESIS_HP) return false;
  if (product.series === SERIES_GENESIS_STANDARD) {
    return isOfficialGenesisStandardProduct(product);
  }
  return isOfficialGenesisStandardProduct(product);
}

export function getGenesisSeriesKey(product: {
  slug?: string | null;
  series?: string | null;
}): typeof SERIES_GENESIS_HP | typeof SERIES_GENESIS_STANDARD | null {
  if (product.series === SERIES_GENESIS_STANDARD) return SERIES_GENESIS_STANDARD;
  if (product.series === SERIES_GENESIS_HP) return SERIES_GENESIS_HP;
  if (isGenesisStandardProduct(product)) return SERIES_GENESIS_STANDARD;
  if (isGenesisHighPerformanceProduct(product)) return SERIES_GENESIS_HP;
  return null;
}

/** Shape accepted by dimension sorting (storefront + raw rows). */
export type DimensionSortableProduct = {
  width?: number | string | null;
  widthInches?: number | string | null;
  width_inches?: number | string | null;
  gauge?: number | string | null;
  lengthFeet?: number | string | null;
  length_feet?: number | string | null;
  slug?: string | null;
  title?: string | null;
  name?: string | null;
  variants?: Array<{
    widthInches?: number | string | null;
    gauge?: number | string | null;
    lengthFeet?: number | string | null;
  }> | null;
  isSoldOut?: boolean | null;
  is_sold_out?: boolean | null;
  isAvailable?: boolean | null;
  is_available?: boolean | null;
  stockQuantity?: number | null;
  stock_quantity?: number | null;
  stock_qty?: number | null;
};

/** In stock when the product is not sold out and still has pallet stock. Untracked stock stays available. */
export function isCatalogInStock(product: DimensionSortableProduct): boolean {
  if (product.isSoldOut === true || product.is_sold_out === true) return false;
  if (product.isAvailable === false || product.is_available === false) return false;
  const raw = product.stockQuantity ?? product.stock_quantity ?? product.stock_qty;
  if (raw == null || String(raw).trim() === "") return true;
  const stock = Number(raw);
  if (!Number.isFinite(stock)) return true;
  return stock > 0;
}

/** Keep a secondary ordering inside the in-stock group and again inside the sold-out group. */
export function compareInStockFirst<T extends DimensionSortableProduct>(
  compare: (left: T, right: T) => number
): (left: T, right: T) => number {
  return (left, right) => {
    const stockDelta = Number(!isCatalogInStock(left)) - Number(!isCatalogInStock(right));
    if (stockDelta !== 0) return stockDelta;
    return compare(left, right);
  };
}

function toPositiveNumber(value: unknown): number {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : 0;
  }
  if (value === null || value === undefined) return 0;
  const normalized = String(value)
    .replace(/,/g, "")
    .replace(/\s*(ft|in|inches|ga|gauge)\b\.?/gi, "")
    .replace(/"/g, "")
    .trim();
  const n = Number(normalized);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function parseDimsFromSlugOrTitle(text: string): {
  width: number;
  gauge: number;
  lengthFeet: number;
} {
  const raw = String(text || "").toLowerCase();
  // e.g. stretch-film-20-x-60-ga-x-5000ft  OR  15" X 60 GA X 1000 FT
  const match =
    raw.match(
      /(\d+(?:\.\d+)?)\s*(?:["”]|in(?:ch(?:es)?)?)?\s*[x×]\s*(\d+)\s*ga(?:uge)?\s*[x×]\s*([\d,]+)\s*ft?/i
    ) ||
    raw.match(/(\d+(?:\.\d+)?)-x-(\d+)-ga-x-([\d]+)ft/);

  if (!match) return { width: 0, gauge: 0, lengthFeet: 0 };
  return {
    width: toPositiveNumber(match[1]),
    gauge: toPositiveNumber(match[2]),
    lengthFeet: toPositiveNumber(match[3]),
  };
}

/** Extract numeric width / gauge / length for ascending catalog sort. */
export function getProductSortDimensions(product: DimensionSortableProduct): {
  width: number;
  gauge: number;
  lengthFeet: number;
} {
  const fromLabel = parseDimsFromSlugOrTitle(
    `${product.slug || ""} ${product.title || ""} ${product.name || ""}`
  );

  const widthCandidates = [
    product.width,
    product.widthInches,
    product.width_inches,
    product.variants?.[0]?.widthInches,
    fromLabel.width,
  ];
  const gaugeCandidates = [
    product.gauge,
    product.variants?.[0]?.gauge,
    fromLabel.gauge,
  ];
  const lengthCandidates = [
    product.lengthFeet,
    product.length_feet,
    product.variants?.[0]?.lengthFeet,
    fromLabel.lengthFeet,
  ];

  const width =
    widthCandidates.map(toPositiveNumber).find((n) => n > 0) || 0;
  const gauge =
    gaugeCandidates.map(toPositiveNumber).find((n) => n > 0) || 0;
  const lengthFeet =
    lengthCandidates.map(toPositiveNumber).find((n) => n > 0) || 0;

  return {
    width: Math.round(width),
    gauge: Math.round(gauge),
    lengthFeet: Math.round(lengthFeet),
  };
}

/**
 * Ascending Width → Gauge → Roll Length (FT).
 * Example: 15"×60×1000 → 15"×60×1500 → 18"×60×1000.
 * Stock does not change this order. The product catalog applies that separately.
 */
export function sortProductsByDimensions<T extends DimensionSortableProduct>(
  products: T[]
): T[] {
  return [...products].sort((a, b) => {
    const da = getProductSortDimensions(a);
    const db = getProductSortDimensions(b);

    if (da.width !== db.width) return da.width - db.width;
    if (da.gauge !== db.gauge) return da.gauge - db.gauge;
    return da.lengthFeet - db.lengthFeet;
  });
}

