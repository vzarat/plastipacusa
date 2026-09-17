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
  widthInches?: number | string | null;
  width_inches?: number | string | null;
}): boolean {
  const app = String(
    product.application || product.applicationType || product.type || ""
  ).toLowerCase();
  if (app === "machine") return true;

  const width = Math.round(
    Number(product.widthInches ?? product.width_inches ?? 0)
  );
  if (width === 20) return true;

  const haystack = [
    product.categorySlug,
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

/** Canonical machine film package tiers (no boxes). */
export const MACHINE_PACKAGE_TIERS = [
  { rolls: 1, label: "1 ROLL", suffix: "1R" },
  { rolls: 20, label: "20 ROLLS (HALF PALLET)", suffix: "20R" },
  { rolls: 40, label: "40 ROLLS (FULL PALLET)", suffix: "40R" },
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
  if (rolls === 1 || upper.includes("1 ROLL") || (upper.includes("1 BOX") && rolls <= 4)) {
    return "1 ROLL";
  }
  if (rolls === 20 || upper.includes("HALF PALLET") || upper.includes("20 ROLL")) {
    return "20 ROLLS (HALF PALLET)";
  }
  if (
    rolls === 40 ||
    upper.includes("FULL PALLET") ||
    upper.includes("40 ROLL") ||
    rolls === 256 ||
    rolls === 192
  ) {
    return "40 ROLLS (FULL PALLET)";
  }
  if (upper.includes("BOX")) {
    // Strip box language for machine films
    if (rolls <= 1) return "1 ROLL";
    return `${rolls} ROLLS`;
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
    { ...MACHINE_PACKAGE_TIERS[0], price: input.price1 },
    { ...MACHINE_PACKAGE_TIERS[1], price: input.price20 },
    { ...MACHINE_PACKAGE_TIERS[2], price: input.price40 },
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
    weightLbs: "0.00",
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
      ? '20" GENESIS High Performance — 1 / 20 / 40 roll pricing.'
      : '20" GENESIS Standard — 1 / 20 / 40 roll pricing.',
    application: "machine",
    categorySlug: isHp ? "genesis-high-performance" : "genesis-standard",
    categoryId: isHp
      ? "genesis-high-performance"
      : "b0000000-0000-0000-0000-000000000003",
    filmType: "Cast Machine Stretch Film",
    color: "Ultra Clear",
    features: [
      "Machine / automatic cast film",
      "1 / 20 / 40 roll packaging tiers",
      input.series,
    ],
    techSheetUrl: "/docs/plastipac-force-hand-film-specs.pdf",
    imageUrl: MACHINE_FILM_IMAGE_URL,
    images: [MACHINE_FILM_IMAGE_URL],
    recommendedUsage: "High-speed turntable and rotary arm pallet wrappers",
    createdAt: new Date(),
    updatedAt: new Date(),
    variants,
    startingPrice: input.price1,
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
