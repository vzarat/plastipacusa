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
  series?: "genesis-standard" | "genesis-high-performance";
}): ProductWithVariants {
  const series = input.series || "genesis-high-performance";
  const isHp = series === "genesis-high-performance";
  const packageOptions: PackageOption[] = buildMachinePackageOptions({
    baseSku: input.baseSku,
    price1: input.price1,
    price20: input.price20,
    price40: input.price40,
  }) as PackageOption[];

  const variants: ProductVariant[] = packageOptions.map((opt) => ({
    id: `${input.baseSku}-${opt.rolls}`,
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
    description: isHp
      ? "GENESIS Automatic Stretch Film engineered for high-performance machine wrappers with consistent stretch and load containment."
      : "GENESIS Standard Automatic Stretch Film for high-speed turntable pallet wrappers with consistent stretch performance.",
    shortDescription: isHp
      ? '20" GENESIS High Performance machine cast film — roll / half pallet / full pallet pricing.'
      : '20" GENESIS Standard machine cast film — roll / half pallet / full pallet pricing.',
    application: "machine",
    categorySlug: series,
    categoryId: isHp
      ? "genesis-high-performance"
      : "b0000000-0000-0000-0000-000000000003",
    filmType: "Cast Machine Stretch Film",
    color: "Ultra Clear",
    features: [
      "Machine / automatic cast film",
      "1 / 20 / 40 roll packaging tiers",
      isHp ? "GENESIS High Performance series" : "GENESIS Standard series",
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

/**
 * Static mock / seed mirror for the 4 GENESIS Machine High-Yield films
 * (matches Supabase insert for stretch-film-20-*-6000/5000ft).
 */
export const GENESIS_MACHINE_FALLBACK_PRODUCTS: ProductWithVariants[] = [
  buildGenesisMachineProduct({
    id: 20606001,
    slug: "stretch-film-20-x-60-ga-x-6000ft",
    title: 'STRETCH FILM 20" X 60 GA X 6000FT',
    gauge: 60,
    lengthFeet: 6000,
    baseSku: "GEN-206060",
    price1: 230.92,
    price20: 696.44,
    price40: 1319.56,
    series: "genesis-high-performance",
  }),
  buildGenesisMachineProduct({
    id: 20706001,
    slug: "stretch-film-20-x-70-ga-x-6000ft",
    title: 'STRETCH FILM 20" X 70 GA X 6000FT',
    gauge: 70,
    lengthFeet: 6000,
    baseSku: "GEN-207060",
    price1: 307.9,
    price20: 928.58,
    price40: 1759.42,
    series: "genesis-high-performance",
  }),
  buildGenesisMachineProduct({
    id: 20806001,
    slug: "stretch-film-20-x-80-ga-x-6000ft",
    title: 'STRETCH FILM 20" X 80 GA X 6000FT',
    gauge: 80,
    lengthFeet: 6000,
    baseSku: "GEN-208060",
    price1: 351.88,
    price20: 1061.24,
    price40: 2010.76,
    series: "genesis-high-performance",
  }),
  buildGenesisMachineProduct({
    id: 20805001,
    slug: "stretch-film-20-x-80-ga-x-5000ft",
    title: 'STRETCH FILM 20" X 80 GA X 5000FT',
    gauge: 80,
    lengthFeet: 5000,
    baseSku: "GEN-208050",
    price1: 256.58,
    price20: 773.82,
    price40: 1466.18,
    series: "genesis-high-performance",
  }),
];

/**
 * Classic GENESIS Standard (turntable) machine films — distinct from High Performance / 6,000 FT SKUs.
 */
export const GENESIS_STANDARD_FALLBACK_PRODUCTS: ProductWithVariants[] = [
  buildGenesisMachineProduct({
    id: 20517001,
    slug: "stretch-film-20-x-51-ga-x-7000ft",
    title: 'STRETCH FILM 20" X 51 GA X 7000FT',
    gauge: 51,
    lengthFeet: 7000,
    baseSku: "GEN-205170",
    price1: 198.5,
    price20: 598.4,
    price40: 1134.2,
    series: "genesis-standard",
  }),
  buildGenesisMachineProduct({
    id: 20519001,
    slug: "stretch-film-20-x-51-ga-x-9000ft",
    title: 'STRETCH FILM 20" X 51 GA X 9000FT',
    gauge: 51,
    lengthFeet: 9000,
    baseSku: "GEN-205190",
    price1: 224.75,
    price20: 678.2,
    price40: 1285.6,
    series: "genesis-standard",
  }),
  buildGenesisMachineProduct({
    id: 20705001,
    slug: "stretch-film-20-x-70-ga-x-5000ft",
    title: 'STRETCH FILM 20" X 70 GA X 5000FT',
    gauge: 70,
    lengthFeet: 5000,
    baseSku: "GEN-207050",
    price1: 242.15,
    price20: 730.4,
    price40: 1384.9,
    series: "genesis-standard",
  }),
  buildGenesisMachineProduct({
    id: 20605001,
    slug: "stretch-film-20-x-60-ga-x-5000ft",
    title: 'STRETCH FILM 20" X 60 GA X 5000FT',
    gauge: 60,
    lengthFeet: 5000,
    baseSku: "GEN-206050",
    price1: 212.4,
    price20: 640.8,
    price40: 1214.5,
    series: "genesis-standard",
  }),
];

/** Ensure catalog always includes GENESIS Automatic + Standard series (DB or static fallback). */
export function ensureGenesisMachineProducts(
  products: ProductWithVariants[]
): ProductWithVariants[] {
  const bySlug = new Map(
    products.map((p) => [String(p.slug || "").toLowerCase(), p])
  );

  const mergeFallback = (
    fallback: ProductWithVariants,
    forceSeries: "genesis-standard" | "genesis-high-performance"
  ) => {
    const key = fallback.slug.toLowerCase();
    const existing = bySlug.get(key);
    const existingHasPricing =
      (existing?.packageOptions?.length || 0) > 0 ||
      (existing?.variants || []).some(
        (v) => Number.parseFloat(String(v.priceUsd || 0)) > 0
      );

    if (!existing || !existingHasPricing) {
      bySlug.set(
        key,
        existing
          ? {
              ...fallback,
              ...existing,
              ...pickPricing(fallback, existing, forceSeries),
            }
          : fallback
      );
    } else {
      // Re-assert series mapping so featured filters stay accurate
      bySlug.set(key, {
        ...existing,
        categorySlug: forceSeries,
        application: "machine",
        brand: existing.brand || "GENESIS",
      });
    }
  };

  for (const fallback of GENESIS_MACHINE_FALLBACK_PRODUCTS) {
    mergeFallback(fallback, "genesis-high-performance");
  }

  for (const fallback of GENESIS_STANDARD_FALLBACK_PRODUCTS) {
    mergeFallback(fallback, "genesis-standard");
  }

  // Normalize series for any other GENESIS / 20" machine rows already in the catalog
  return Array.from(bySlug.values()).map((product) => {
    const series = getGenesisSeriesKey(product);
    if (!series) return product;
    if (product.categorySlug === series) return product;
    return {
      ...product,
      categorySlug: series,
      application: "machine" as const,
      brand: product.brand || "GENESIS",
    };
  });
}

function pickPricing(
  fallback: ProductWithVariants,
  existing: ProductWithVariants,
  forceSeries: "genesis-standard" | "genesis-high-performance"
): Partial<ProductWithVariants> {
  return {
    packageOptions: fallback.packageOptions,
    variants: fallback.variants,
    startingPrice: fallback.startingPrice ?? existing.startingPrice,
    application: "machine",
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

const GENESIS_HP_SLUGS = new Set(
  GENESIS_MACHINE_FALLBACK_PRODUCTS.map((p) => p.slug.toLowerCase())
);

/** True only for the GENESIS Automatic / High Performance high-yield SKUs. */
export function isGenesisHighPerformanceProduct(product: {
  slug?: string | null;
  categorySlug?: string | null;
  categoryId?: string | null;
  title?: string | null;
  name?: string | null;
  application?: string | null;
  type?: string | null;
  widthInches?: number | string | null;
  width_inches?: number | string | null;
  length_feet?: number | string | null;
}): boolean {
  const slug = String(product.slug || "").toLowerCase();
  const catSlug = String(product.categorySlug || "").toLowerCase();
  const catId = String(product.categoryId || "").toLowerCase();
  const title = String(product.title || product.name || "").toLowerCase();

  // Explicit Automatic / High Performance catalog SKUs
  if (GENESIS_HP_SLUGS.has(slug)) return true;
  if (slug.includes("6000ft")) return true;
  if (slug === "stretch-film-20-x-80-ga-x-5000ft") return true;

  if (catSlug === "machine-high-yield-film") return true;

  if (
    (catSlug === "genesis-high-performance" ||
      catId === "genesis-high-performance") &&
    !catSlug.includes("standard")
  ) {
    // Keep HP category rows here unless slug clearly belongs to Standard fallbacks
    if (slug.includes("7000ft") || slug.includes("9000ft")) return false;
    if (slug === "stretch-film-20-x-60-ga-x-5000ft") return false;
    if (slug === "stretch-film-20-x-70-ga-x-5000ft") return false;
    return true;
  }

  if (
    title.includes("high performance") ||
    title.includes("high-performance") ||
    slug.includes("high-performance")
  ) {
    return true;
  }

  return false;
}

/** Classic GENESIS Standard machine film (excludes Automatic / High Performance SKUs). */
export function isGenesisStandardProduct(product: {
  slug?: string | null;
  categorySlug?: string | null;
  categoryId?: string | null;
  title?: string | null;
  name?: string | null;
  brand?: string | null;
  application?: string | null;
  type?: string | null;
  widthInches?: number | string | null;
  width_inches?: number | string | null;
}): boolean {
  if (isGenesisHighPerformanceProduct(product)) return false;

  const slug = String(product.slug || "").toLowerCase();
  const catSlug = String(product.categorySlug || "").toLowerCase();
  const catId = String(product.categoryId || "");
  const title = String(product.title || product.name || "").toLowerCase();
  const brand = String(product.brand || "").toLowerCase();
  const type = String(product.type || "").toLowerCase();
  const width = Math.round(
    Number(product.widthInches ?? product.width_inches ?? 0)
  );

  if (
    catSlug === "genesis-standard" ||
    catId === "b0000000-0000-0000-0000-000000000003" ||
    catId === "genesis-standard"
  ) {
    return true;
  }

  // 20" GENESIS / machine cast films that are not High Performance
  if (width === 20 || slug.includes("20-x") || title.includes('20"')) {
    return (
      brand.includes("genesis") ||
      type === "machine" ||
      String(product.application || "").toLowerCase() === "machine" ||
      catSlug.includes("genesis") ||
      slug.startsWith("stretch-film-20")
    );
  }

  return brand.includes("genesis");
}

/** Series key used by featured / catalog filters. */
export function getGenesisSeriesKey(
  product: Parameters<typeof isGenesisHighPerformanceProduct>[0] & {
    brand?: string | null;
  }
): "genesis-high-performance" | "genesis-standard" | null {
  if (isGenesisHighPerformanceProduct(product)) return "genesis-high-performance";
  if (isGenesisStandardProduct(product)) return "genesis-standard";
  return null;
}
