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

import type { PackageOption, ProductVariant, ProductWithVariants } from "@/types";
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

/** Canonical machine film package tiers. Sold by the pallet, not by the roll. */
export const MACHINE_PACKAGE_TIERS = [
  { rolls: 20, label: "Half Pallet (20 Rolls / 1 Layer)", suffix: "20R" },
  { rolls: 40, label: "Full Pallet (40 Rolls / 2 Layers)", suffix: "40R" },
] as const;

/** Canonical hand film full-pallet pack-out (3 layers × 64 rolls). */
export const HAND_FULL_PALLET = {
  boxes: 48,
  rolls: 192,
  label: "48 BOXES = 192 ROLLS (FULL PALLET)",
} as const;

export function unitLabelForProduct(isMachine: boolean): string {
  return isMachine ? "Roll" : "Box";
}

export function normalizeMachinePackageLabel(rolls: number, label?: string): string {
  const upper = String(label || "").toUpperCase();
  if (rolls === 20 || upper.includes("20 ROLL")) {
    return "Half Pallet (20 Rolls / 1 Layer)";
  }
  if (rolls === 40 || upper.includes("40 ROLL")) {
    return "Full Pallet (40 Rolls / 2 Layers)";
  }
  return label || `${rolls} ROLLS`;
}

export function buildMachinePackageOptions(input: {
  baseSku: string;
  price1?: number | null;
  price20?: number | null;
  price40?: number | null;
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
      sku: `${input.baseSku}-${tier.suffix}`,
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
  const fullPalletSavingsPerRoll =
    halfPerRoll > 0 && fullPerRoll > 0 ? roundTierMoney(halfPerRoll - fullPerRoll) : 0;

  return MACHINE_PACKAGE_TIERS.map((tier) => {
    const price = tier.rolls === 40 ? fullPrice : halfPrice;
    const weight = packageTotalWeightLbs({
      rolls: tier.rolls,
      machine: true,
      rollWeightLbs: rollWeight,
      widthInches,
      gauge,
      lengthFeet,
    });
    return {
      id: `${baseSku}-${tier.suffix}`,
      sku: `${baseSku}-${tier.suffix}`,
      tierKey: tier.rolls === 20 ? "fixed_half" : "full_pallet",
      title: tier.label,
      packageSize: tier.label,
      tierSubtext: tier.rolls === 20 ? "20 Rolls" : "40 Rolls",
      tierBadges:
        tier.rolls === 40 && fullPalletSavingsPerRoll >= 0.01
          ? [`Save $${fullPalletSavingsPerRoll.toFixed(2)} / roll`]
          : [],
      price,
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

function buildGenesisMachineProduct(input: {
  id: number;
  slug: string;
  title: string;
  gauge: number;
  lengthFeet: number;
  baseSku: string;
  price1: number;
  price20: number;
  price40: number;
  series: typeof SERIES_GENESIS_STANDARD | typeof SERIES_GENESIS_HP;
}): ProductWithVariants {
  const isHp = input.series === SERIES_GENESIS_HP;
  const packageOptions: PackageOption[] = buildMachinePackageOptions({
    baseSku: input.baseSku,
    price1: input.price1,
    price20: input.price20,
    price40: input.price40,
  }) as PackageOption[];

  const weightSpec = MACHINE_FILM_WEIGHT_SPECS.find(
    (row) => row.width === 20 && row.gauge === input.gauge && row.length === input.lengthFeet
  );
  const variants: ProductVariant[] = packageOptions.map((opt) => ({
    id: `${input.baseSku}-${opt.rolls}-${isHp ? "hp" : "st"}`,
    productId: input.id,
    sku: opt.sku,
    title: opt.label,
    packageSize: opt.label,
    rollsCount: opt.rolls,
    boxesCount: 0,
    rolls_count: opt.rolls,
    boxes_count: 0,
    widthInches: "20.00",
    gauge: input.gauge,
    lengthFeet: input.lengthFeet,
    rollsPerBox: opt.rolls,
    rollsPerPallet: 40,
    weightLbs: weightSpec
      ? String(opt.rolls === 40 ? weightSpec.full : opt.rolls === 20 ? weightSpec.half : weightSpec.roll)
      : "0.00",
    rollWeightLbs: weightSpec?.roll ?? 0,
    boxWeightLbs: weightSpec?.roll ?? 0,
    palletWeightLbs: weightSpec?.full ?? 0,
    priceUsd: String(opt.price),
    casePriceUsd: null,
    palletPriceUsd: null,
    stockStatus: "in_stock",
    createdAt: new Date(),
  }));

  return {
    id: input.id,
    slug: input.slug,
    title: input.title,
    name: input.title,
    brand: "GENESIS",
    series: input.series,
    description: isHp
      ? "GENESIS High Performance machine film for high-throughput wrappers."
      : "GENESIS Standard machine film for high-speed turntable pallet wrappers.",
    shortDescription: isHp
      ? '20" GENESIS High Performance — half pallet and full pallet.'
      : '20" GENESIS Standard — half pallet and full pallet.',
    application: "machine",
    categorySlug: isHp ? "genesis-high-performance" : "genesis-standard",
    categoryId: isHp
      ? "genesis-high-performance"
      : "b0000000-0000-0000-0000-000000000003",
    filmType: "Cast Machine Stretch Film",
    color: "Ultra Clear",
    features: [
      "Machine / automatic cast film",
      "Half pallet (20 rolls) and full pallet (40 rolls)",
      input.series,
    ],
    techSheetUrl: "/docs/plastipac-force-hand-film-specs.pdf",
    imageUrl: MACHINE_FILM_IMAGE_URL,
    images: [MACHINE_FILM_IMAGE_URL],
    recommendedUsage: "High-speed turntable and rotary arm pallet wrappers",
    createdAt: new Date(),
    updatedAt: new Date(),
    variants,
    startingPrice: input.price20,
    widthInches: 20,
    width_inches: "20.00",
    gauge: input.gauge,
    length_feet: input.lengthFeet,
    core_type: 'Standard 3" Core',
    fullPalletRolls: 40,
    palletLayers: 2,
    rollsPerLayer: 20,
    rollsPerBoxSpec: 1,
    boxesPerFullPallet: 40,
    palletizingSummary: "40 rolls / full pallet · 2 layers × 20 rolls",
    palletizingFamily: '20" Automatic Machine Film',
    partNumber: input.baseSku,
    stockQuantity: 100,
    isSoldOut: false,
    isActive: true,
    packageOptions,
  };
}

/** GENESIS High Performance — exactly these 4 SKUs. */
export const GENESIS_MACHINE_FALLBACK_PRODUCTS: ProductWithVariants[] = [
  buildGenesisMachineProduct({
    id: 30606001,
    slug: "stretch-film-20-x-60-ga-x-6000ft",
    title: 'STRETCH FILM 20" X 60 GA X 6000FT',
    gauge: 60,
    lengthFeet: 6000,
    baseSku: "GEN-206060",
    price1: 230.92,
    price20: 696.44,
    price40: 1319.56,
    series: SERIES_GENESIS_HP,
  }),
  buildGenesisMachineProduct({
    id: 30706001,
    slug: "stretch-film-20-x-70-ga-x-6000ft",
    title: 'STRETCH FILM 20" X 70 GA X 6000FT',
    gauge: 70,
    lengthFeet: 6000,
    baseSku: "GEN-207060",
    price1: 307.9,
    price20: 928.58,
    price40: 1759.42,
    series: SERIES_GENESIS_HP,
  }),
  buildGenesisMachineProduct({
    id: 30806001,
    slug: "stretch-film-20-x-80-ga-x-6000ft",
    title: 'STRETCH FILM 20" X 80 GA X 6000FT',
    gauge: 80,
    lengthFeet: 6000,
    baseSku: "GEN-208060",
    price1: 351.88,
    price20: 1061.24,
    price40: 2010.76,
    series: SERIES_GENESIS_HP,
  }),
  buildGenesisMachineProduct({
    id: 30805001,
    slug: "stretch-film-20-x-80-ga-x-5000ft",
    title: 'STRETCH FILM 20" X 80 GA X 5000FT',
    gauge: 80,
    lengthFeet: 5000,
    baseSku: "GEN-208050",
    price1: 256.58,
    price20: 773.82,
    price40: 1466.18,
    series: SERIES_GENESIS_HP,
  }),
];

/** GENESIS Standard — exactly these 4 SKUs. */
export const GENESIS_STANDARD_FALLBACK_PRODUCTS: ProductWithVariants[] = [
  buildGenesisMachineProduct({
    id: 20605001,
    slug: "stretch-film-20-x-60-ga-x-5000ft",
    title: 'STRETCH FILM 20" X 60 GA X 5000FT',
    gauge: 60,
    lengthFeet: 5000,
    baseSku: "GEN-206050",
    price1: 192.44,
    price20: 580.4,
    price40: 1099.6,
    series: SERIES_GENESIS_STANDARD,
  }),
  buildGenesisMachineProduct({
    id: 20705001,
    slug: "stretch-film-20-x-70-ga-x-5000ft",
    title: 'STRETCH FILM 20" X 70 GA X 5000FT',
    gauge: 70,
    lengthFeet: 5000,
    baseSku: "GEN-207050",
    price1: 224.51,
    price20: 677.1,
    price40: 1282.8,
    series: SERIES_GENESIS_STANDARD,
  }),
  buildGenesisMachineProduct({
    id: 20805002,
    slug: "stretch-film-20-x-80-ga-x-5000ft",
    title: 'STRETCH FILM 20" X 80 GA X 5000FT',
    gauge: 80,
    lengthFeet: 5000,
    baseSku: "GEN-208050",
    price1: 256.58,
    price20: 773.82,
    price40: 1466.18,
    series: SERIES_GENESIS_STANDARD,
  }),
  buildGenesisMachineProduct({
    id: 20606002,
    slug: "stretch-film-20-x-60-ga-x-6000ft",
    title: 'STRETCH FILM 20" X 60 GA X 6000FT',
    gauge: 60,
    lengthFeet: 6000,
    baseSku: "GEN-206060",
    price1: 230.92,
    price20: 696.44,
    price40: 1319.56,
    series: SERIES_GENESIS_STANDARD,
  }),
];

export const GENESIS_HP_SLUGS = new Set(
  GENESIS_MACHINE_FALLBACK_PRODUCTS.map((p) => p.slug.toLowerCase())
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

/** Titles / patterns that must never appear under GENESIS Standard. */
const OBSOLETE_GENESIS_STANDARD_PATTERN =
  /63\s*GA|70\s*GA\s*X\s*6000\s*FT\s*\(STANDARD\)|7[,.]?000\s*FT|80\s*GA\s*X\s*6000\s*FT\s*\(STANDARD\)|60\s*GA\s*X\s*6000\s*FT\s*\(STANDARD\)/i;

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

/** Ensure catalog includes both GENESIS series with exact `series` labels (no crossover). */
export function ensureGenesisMachineProducts(
  products: ProductWithVariants[]
): ProductWithVariants[] {
  const byKey = new Map<string, ProductWithVariants>();

  for (const product of products) {
    const title = String(product.title || product.name || "");
    const slug = String(product.slug || "").toLowerCase();

    // Drop obsolete / duplicate GENESIS Standard candidates before series assignment
    if (OBSOLETE_GENESIS_STANDARD_PATTERN.test(title)) {
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
      if (GENESIS_HP_SLUGS.has(slug)) {
        series = SERIES_GENESIS_HP;
      } else {
        continue;
      }
    }

    const withSeries: ProductWithVariants = {
      ...product,
      series,
      categorySlug:
        series === SERIES_GENESIS_STANDARD
          ? "genesis-standard"
          : series === SERIES_GENESIS_HP
            ? "genesis-high-performance"
            : product.categorySlug,
    };

    if (withSeries.series) {
      byKey.set(seriesCatalogKey(withSeries), withSeries);
    } else {
      byKey.set(`id:${withSeries.id}:${slug}`, withSeries);
    }
  }

  const mergeFallback = (fallback: ProductWithVariants) => {
    const key = seriesCatalogKey(fallback);
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, fallback);
      return;
    }
    const existingHasPricing =
      (existing.packageOptions?.length || 0) > 0 ||
      (existing.variants || []).some(
        (v) => Number.parseFloat(String(v.priceUsd || 0)) > 0
      );
    byKey.set(key, {
      ...existing,
      ...pickPricing(
        fallback,
        existing,
        fallback.series === SERIES_GENESIS_HP
          ? "genesis-high-performance"
          : "genesis-standard"
      ),
      series: fallback.series,
      packageOptions: fallback.packageOptions,
      variants: fallback.variants,
      startingPrice: fallback.startingPrice,
    });
    if (!existingHasPricing) {
      byKey.set(key, fallback);
    }
  };

  for (const fallback of GENESIS_MACHINE_FALLBACK_PRODUCTS) {
    mergeFallback(fallback);
  }
  for (const fallback of GENESIS_STANDARD_FALLBACK_PRODUCTS) {
    mergeFallback(fallback);
  }

  // Final purge: GENESIS Standard grid must be exactly the 4 official SKUs
  const officialStandardKeys = new Set(
    GENESIS_STANDARD_FALLBACK_PRODUCTS.map((p) => seriesCatalogKey(p))
  );

  return Array.from(byKey.values()).filter((product) => {
    if (product.series !== SERIES_GENESIS_STANDARD) return true;
    return (
      officialStandardKeys.has(seriesCatalogKey(product)) &&
      isOfficialGenesisStandardProduct(product)
    );
  });
}

function pickPricing(
  fallback: ProductWithVariants,
  existing: ProductWithVariants,
  forceSeries: "genesis-standard" | "genesis-high-performance"
): Partial<ProductWithVariants> {
  const seriesLabel =
    forceSeries === "genesis-high-performance"
      ? SERIES_GENESIS_HP
      : SERIES_GENESIS_STANDARD;
  return {
    packageOptions: fallback.packageOptions,
    variants: fallback.variants,
    startingPrice: fallback.startingPrice ?? existing.startingPrice,
    application: "machine",
    series: seriesLabel,
    categorySlug: forceSeries,
    categoryId:
      forceSeries === "genesis-high-performance"
        ? "genesis-high-performance"
        : "b0000000-0000-0000-0000-000000000003",
    imageUrl: existing.imageUrl?.includes("manual")
      ? fallback.imageUrl
      : existing.imageUrl || fallback.imageUrl,
    images:
      existing.images?.length &&
      !existing.images.every((img) => img.includes("manual"))
        ? existing.images
        : fallback.images,
    widthInches: existing.widthInches || fallback.widthInches,
    width_inches: existing.width_inches || fallback.width_inches,
    gauge: existing.gauge || fallback.gauge,
    length_feet: existing.length_feet || fallback.length_feet,
    brand: existing.brand || fallback.brand,
  };
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
};

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
 * Sort products ascending by Width → Gauge → Roll Length (FT).
 * Example: 15"×60×1000 → 15"×60×1500 → 15"×70×1000 → 18"×60×1000 → 20"×60×5000
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

