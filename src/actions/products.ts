"use server";

import { revalidatePath } from "next/cache";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { ProductWithVariants, ProductVariant, PackageOption } from "@/types";
import { AdminProduct, ProductFormValues, PACKAGE_TIER_DEFAULTS } from "@/types/product";
import { PRODUCT_CATEGORIES, getApplicationForCategory } from "@/data/categories";
import { verifyAdmin } from "./admin";
import {
  isExcludedFifteenInchEightyGauge,
  resolvePalletizingSpecs,
} from "@/lib/palletizing";
import {
  HAND_FULL_PALLET,
  MACHINE_FILM_IMAGE_URL,
  GENESIS_HP_SLUGS,
  GENESIS_STANDARD_SLUGS,
  GENESIS_MACHINE_FALLBACK_PRODUCTS,
  SERIES_FORCE_ELITE,
  SERIES_FORCE_STANDARD,
  buildMachinePackageOptions,
  ensureGenesisMachineProducts,
  getGenesisMachineFallbackBySlug,
  isMachineFilm as detectMachineFilm,
  normalizeMachinePackageLabel,
  seriesLabelFromCategorySlug,
  sortProductsByDimensions,
} from "@/lib/products";

function parsePositivePrice(...candidates: unknown[]): number | null {
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined || candidate === "") continue;
    const value = typeof candidate === "number" ? candidate : parseFloat(String(candidate));
    if (Number.isFinite(value) && value > 0) return value;
  }
  return null;
}

function toNumericProductId(rawId: unknown, slug: string): number {
  const asNumber = Number(rawId);
  if (Number.isFinite(asNumber) && asNumber > 0) return asNumber;

  let hash = 0;
  const source = String(slug || rawId || "product");
  for (let i = 0; i < source.length; i += 1) {
    hash = (hash * 31 + source.charCodeAt(i)) >>> 0;
  }
  return hash || 1;
}

function resolveRollsCount(v: any): number {
  const candidates = [
    v.rolls_count,
    v.rollsCount,
    v.rolls,
    v.rolls_per_box,
    v.rollsPerBox,
  ];
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined || candidate === "") continue;
    const n = Number(candidate);
    if (Number.isFinite(n) && n > 0) return n;
  }

  const label = String(v.title || v.package_size || v.packageSize || "").toUpperCase();
  if (label.includes("40 ROLL") || label.includes("FULL PALLET")) return 40;
  if (label.includes("20 ROLL") || label.includes("HALF PALLET")) return 20;
  if (label.includes("1 ROLL")) return 1;
  return 4;
}

function isDefaultPackageTierSet(
  price6: number | null,
  price12: number | null,
  price20: number | null,
  price40: number | null
): boolean {
  return (
    price6 === PACKAGE_TIER_DEFAULTS.price6Rolls &&
    price12 === PACKAGE_TIER_DEFAULTS.price12Rolls &&
    price20 === PACKAGE_TIER_DEFAULTS.price20Rolls &&
    price40 === PACKAGE_TIER_DEFAULTS.price40Rolls
  );
}

function isFiftyGaugeValue(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return false;
  if (typeof value === "number") return value === 50;
  const normalized = String(value).trim().toLowerCase().replace(/\s+/g, " ");
  return (
    normalized === "50" ||
    normalized === "50ga" ||
    normalized === "50 ga" ||
    normalized === "50 gauge"
  );
}

function isFiftyGaugeStorefrontProduct(product: ProductWithVariants): boolean {
  if (isFiftyGaugeValue(product.gauge)) return true;

  if (
    isExcludedFifteenInchEightyGauge({
      widthInches: product.widthInches ?? product.width_inches,
      gauge: product.gauge,
      slug: product.slug,
      name: product.title || product.name,
    })
  ) {
    return true;
  }

  const slug = String(product.slug || "").toLowerCase();
  if (slug.includes("50-ga") || slug.includes("-50ga") || slug.includes("x-50-ga")) {
    return true;
  }

  const label = `${product.title || ""} ${product.name || ""}`.toLowerCase();
  if (/\b50\s*ga(uge)?\b/.test(label)) return true;

  const variants = product.variants || [];
  if (variants.length > 0 && variants.every((v) => isFiftyGaugeValue(v.gauge))) {
    return true;
  }

  return false;
}

/** Strip 50 GA products/variants from all storefront catalog listings. */
function excludeFiftyGaugeFromStorefront(
  products: ProductWithVariants[]
): ProductWithVariants[] {
  return products
    .filter((product) => !isFiftyGaugeStorefrontProduct(product))
    .map((product) => ({
      ...product,
      variants: (product.variants || []).filter((v) => !isFiftyGaugeValue(v.gauge)),
    }));
}

/**
 * Format raw Supabase database records into type-safe ProductWithVariants
 * - Maps product_variants and sorts by price ascending
 * - Dynamically computes the starting base price as MIN(product_variants.price)
 * - Joins or attaches parent category metadata
 */
function formatProduct(raw: any): ProductWithVariants {
  const rawVariants = (raw.product_variants || raw.variants || []) as any[];

  // Sort variants by price ascending (exclude 50 GA variants from storefront payloads)
  const sortedVariants: ProductVariant[] = rawVariants
    .map((v: any, index: number) => {
      const rollsCount = resolveRollsCount(v);
      const boxesCount = Number(
        v.boxes_count ??
        v.boxesCount ??
        (v.title || v.package_size || v.packageSize || "").match(/(\d+)\s*BOX/i)?.[1] ??
        (rollsCount <= 4 ? 1 : Math.round(rollsCount / 4))
      );
      const variantTitle = String(
        v.title ||
          v.package_size ||
          v.packageSize ||
          (boxesCount === 1 ? "1 BOX WITH 4 ROLLS" : `${boxesCount} BOXES = ${rollsCount} ROLLS`)
      );
      const variantPrice = parsePositivePrice(v.price_usd, v.priceUsd, v.price);

      return {
        id: String(v.id || v.sku || index),
        productId: toNumericProductId(v.product_id || v.productId || raw.id, String(raw.slug || "")),
        sku: String(v.sku || ""),
        title: variantTitle,
        packageSize: variantTitle,
        rollsCount,
        boxesCount,
        rolls_count: rollsCount,
        boxes_count: boxesCount,
        widthInches: String(v.width_inches || v.widthInches || raw.width_inches || "18.00"),
        gauge: Number(v.gauge || raw.gauge || 60),
        lengthFeet: Number(v.length_feet || v.lengthFeet || raw.length_feet || 1000),
        rollsPerBox: rollsCount,
        rollsPerPallet: Number(v.rolls_per_pallet || v.rollsPerPallet || 256),
        weightLbs: String(v.weight_lbs || v.weightLbs || "12.00"),
        priceUsd: variantPrice !== null ? String(variantPrice) : "0",
        casePriceUsd: v.case_price_usd ? String(v.case_price_usd) : (v.casePriceUsd ? String(v.casePriceUsd) : null),
        palletPriceUsd: v.pallet_price_usd ? String(v.pallet_price_usd) : (v.palletPriceUsd ? String(v.palletPriceUsd) : null),
        stockStatus: String(v.stock_status || v.stockStatus || "in_stock"),
        createdAt: v.created_at ? new Date(v.created_at) : new Date(),
      };
    })
    .filter((v) => parsePositivePrice(v.priceUsd) !== null)
    .filter((v) => !isFiftyGaugeValue(v.gauge))
    .sort((a, b) => parseFloat(a.priceUsd) - parseFloat(b.priceUsd));

  // Resolve category slug and machine film detection
  const brandStr = String(raw.brand || "").toLowerCase();
  const nameStr = String(raw.name || raw.title || "").toLowerCase();
  const slugStr = String(raw.slug || "").toLowerCase();
  const typeStr = String(raw.type || "").toLowerCase();
  const rawCategoryId = String(raw.category_id || raw.categoryId || "");
  const joinedCategorySlug = String(
    raw.categories?.slug || raw.category_slug || raw.categorySlug || ""
  ).toLowerCase();
  const widthNum = Number(raw.width_inches || raw.widthInches || sortedVariants[0]?.widthInches || 0);

  const isMachineType =
    typeStr === "machine" ||
    String(raw.application || "").toLowerCase() === "machine" ||
    joinedCategorySlug.includes("machine") ||
    joinedCategorySlug.includes("high-yield") ||
    joinedCategorySlug.includes("genesis");

  const isGenesis =
    widthNum === 20 ||
    isMachineType ||
    slugStr.includes("20-x") ||
    nameStr.includes('20"') ||
    rawCategoryId === "b0000000-0000-0000-0000-000000000003" ||
    rawCategoryId === "genesis-standard" ||
    joinedCategorySlug === "genesis-standard" ||
    joinedCategorySlug === "machine-high-yield-film" ||
    joinedCategorySlug === "genesis-high-performance" ||
    brandStr.includes("genesis") ||
    nameStr.includes("genesis") ||
    slugStr.includes("genesis") ||
    slugStr.includes("6000ft") ||
    slugStr.startsWith("stretch-film-20");

  const isElite =
    !isGenesis &&
    (widthNum === 15 ||
      slugStr.includes("15-x") ||
      nameStr.includes('15"') ||
      rawCategoryId === "b0000000-0000-0000-0000-000000000002" ||
      rawCategoryId === "force-elite" ||
      raw.category_slug === "force-elite" ||
      raw.categorySlug === "force-elite" ||
      brandStr.includes("elite") ||
      nameStr.includes("elite") ||
      slugStr.includes("elite"));

  const resolvedWidth = isGenesis ? 20 : isElite ? 15 : Math.round(widthNum) || 18;
  const gaugeNum = Number(raw.gauge || sortedVariants[0]?.gauge || 60);
  const lengthNum = Number(
    raw.length_feet || raw.lengthFeet || sortedVariants[0]?.lengthFeet || 1000
  );
  const palletizing = resolvePalletizingSpecs({
    widthInches: resolvedWidth,
    gauge: gaugeNum,
    lengthFeet: lengthNum,
    application: isGenesis ? "machine" : raw.application,
    slug: slugStr,
    name: nameStr,
  });

  const warehouseVariants: ProductVariant[] = sortedVariants
    .filter(
      (v) =>
        !isExcludedFifteenInchEightyGauge({
          widthInches: Number(v.widthInches) || resolvedWidth,
          gauge: v.gauge,
          slug: slugStr,
          name: nameStr,
        })
    )
    .map((v) => {
      const label = String((v as any).title || v.packageSize || "").toUpperCase();
      const rolls = Number(v.rollsPerBox || (v as any).rolls_count || 0);
      const boxes = Number((v as any).boxes_count || (v as any).boxesCount || 0);
      const isFullPalletLabel =
        label.includes("FULL PALLET") ||
        rolls === 256 ||
        boxes === 64 ||
        (palletizing.fullPalletRolls === 40 && (rolls === 40 || label.includes("40 ROLLS")));

      if (isFullPalletLabel) {
        const fullLabel = isGenesis
          ? `40 ROLLS (FULL PALLET)`
          : HAND_FULL_PALLET.label;
        const fullRolls = isGenesis ? 40 : HAND_FULL_PALLET.rolls;
        const fullBoxes = isGenesis ? 40 : HAND_FULL_PALLET.boxes;
        return {
          ...v,
          rollsPerBox: fullRolls,
          rolls_count: fullRolls,
          rollsCount: fullRolls,
          boxes_count: fullBoxes,
          boxesCount: fullBoxes,
          rollsPerPallet: palletizing.fullPalletRolls,
          packageSize: fullLabel,
          title: fullLabel,
        };
      }

      return {
        ...v,
        rollsPerPallet: palletizing.fullPalletRolls,
        ...(isGenesis
          ? {
              boxes_count: 0,
              boxesCount: 0,
              packageSize: normalizeMachinePackageLabel(
                Number(v.rollsPerBox || (v as any).rolls_count || 1),
                String((v as any).title || v.packageSize || "")
              ),
              title: normalizeMachinePackageLabel(
                Number(v.rollsPerBox || (v as any).rolls_count || 1),
                String((v as any).title || v.packageSize || "")
              ),
            }
          : {}),
      };
    });

  const productBasePrice = parsePositivePrice(raw.price_usd, raw.priceUsd);
  const price6Rolls = parsePositivePrice(raw.price_6_rolls, raw.price6Rolls);
  const price12Rolls = parsePositivePrice(raw.price_12_rolls, raw.price12Rolls);
  const price20Rolls = parsePositivePrice(raw.price_20_rolls, raw.price20Rolls);
  const price40Rolls = parsePositivePrice(raw.price_40_rolls, raw.price40Rolls);

  // Treat untouched schema defaults as unset when real SKU variants exist
  const packageTiersAreDefaults = isDefaultPackageTierSet(
    price6Rolls,
    price12Rolls,
    price20Rolls,
    price40Rolls
  );
  const useCustomPackageTiers =
    !packageTiersAreDefaults &&
    [price6Rolls, price12Rolls, price20Rolls, price40Rolls].some((p) => p !== null);

  const baseSku = String(raw.part_number || raw.partNumber || raw.slug || "SKU").toUpperCase();

  const isHpOnly =
    GENESIS_HP_SLUGS.has(slugStr) && !GENESIS_STANDARD_SLUGS.has(slugStr);
  const isStdOnly =
    GENESIS_STANDARD_SLUGS.has(slugStr) && !GENESIS_HP_SLUGS.has(slugStr);
  const isOverlapSku =
    GENESIS_HP_SLUGS.has(slugStr) && GENESIS_STANDARD_SLUGS.has(slugStr);

  // Only official Standard allowlist SKUs get genesis-standard; never dump
  // legacy 20" / Machine rows into that series.
  const earlyCategorySlug = isGenesis
    ? isHpOnly || isOverlapSku
      ? "genesis-high-performance"
      : isStdOnly
        ? "genesis-standard"
        : joinedCategorySlug === "genesis-high-performance" ||
            joinedCategorySlug === "machine-high-yield-film"
          ? "genesis-high-performance"
          : "genesis-high-performance"
    : isElite
      ? "force-elite"
      : "force-standard";

  const seriesLabel =
    seriesLabelFromCategorySlug(earlyCategorySlug) ||
    (isElite ? SERIES_FORCE_ELITE : SERIES_FORCE_STANDARD);

  const isMachineProduct =
    isGenesis ||
    isMachineType ||
    detectMachineFilm({
      application: isGenesis || isMachineType ? "machine" : raw.application,
      type: raw.type,
      slug: slugStr,
      name: nameStr,
      brand: brandStr,
      widthInches: resolvedWidth,
      categorySlug: earlyCategorySlug || joinedCategorySlug,
    });

  let packageOptions: PackageOption[] = [];
  if (isMachineProduct) {
    if (useCustomPackageTiers) {
      packageOptions = buildMachinePackageOptions({
        baseSku,
        price1: price6Rolls ?? productBasePrice,
        price20: price20Rolls,
        price40: price40Rolls,
      });
    } else if (warehouseVariants.length > 0) {
      packageOptions = warehouseVariants
        .map((v) => {
          const rolls = Number(v.rollsPerBox || (v as any).rollsCount || 1);
          return {
            rolls,
            label: normalizeMachinePackageLabel(
              rolls,
              String((v as any).title || v.packageSize || v.sku)
            ),
            sku: v.sku,
            price: parseFloat(v.priceUsd),
          };
        })
        .sort((a, b) => a.rolls - b.rolls);
    } else if (productBasePrice !== null) {
      packageOptions = buildMachinePackageOptions({
        baseSku,
        price1: productBasePrice,
        price20: null,
        price40: null,
      });
    }
  } else if (useCustomPackageTiers) {
    const tiers: Array<{ rolls: number; label: string; suffix: string; price: number | null }> = [
      { rolls: 6, label: "6 ROLLS", suffix: "6R", price: price6Rolls },
      { rolls: 12, label: "12 ROLLS", suffix: "12R", price: price12Rolls },
      { rolls: 20, label: "20 ROLLS (HALF PALLET)", suffix: "20R", price: price20Rolls },
      { rolls: 40, label: "40 ROLLS (FULL PALLET)", suffix: "40R", price: price40Rolls },
    ];
    packageOptions = tiers
      .filter((tier) => tier.price !== null)
      .map((tier) => ({
        rolls: tier.rolls,
        label: tier.label,
        sku: `${baseSku}-${tier.suffix}`,
        price: tier.price as number,
      }));
  } else if (warehouseVariants.length > 0) {
    // Prefer unique per-SKU variant prices from product_variants
    packageOptions = warehouseVariants.map((v) => {
      const rolls = Number(v.rollsPerBox || (v as any).rollsCount || 4);
      const label = String((v as any).title || v.packageSize || v.sku);
      const normalizedLabel =
        label.toUpperCase().includes("FULL PALLET") || rolls === 256 || rolls === 192
          ? HAND_FULL_PALLET.label
          : label;
      return {
        rolls:
          normalizedLabel === HAND_FULL_PALLET.label
            ? HAND_FULL_PALLET.rolls
            : rolls,
        label: normalizedLabel,
        sku: v.sku,
        price: parseFloat(v.priceUsd),
      };
    });
  } else if (productBasePrice !== null) {
    packageOptions = [
      {
        rolls: 1,
        label: "BASE UNIT",
        sku: `${baseSku}-BASE`,
        price: productBasePrice,
      },
    ];
  }

  const candidatePrices = [
    ...warehouseVariants.map((v) => parsePositivePrice(v.priceUsd)),
    ...packageOptions.map((opt) => parsePositivePrice(opt.price)),
    productBasePrice,
  ].filter((p): p is number => p !== null);

  const minPrice =
    candidatePrices.length > 0 ? Math.min(...candidatePrices) : undefined;

  const categorySlug = earlyCategorySlug;

  const category =
    raw.category ||
    raw.categories ||
    PRODUCT_CATEGORIES.find((c) => c.slug === categorySlug || c.id === rawCategoryId) ||
    PRODUCT_CATEGORIES[0];

  const title = String(raw.title || raw.name || "STRETCH FILM");

  const defaultImage = isGenesis
    ? MACHINE_FILM_IMAGE_URL
    : "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/productos_plastipac_manual.png";

  const rawImg = String(raw.image_url || raw.imageUrl || "");
  const primaryImg =
    isGenesis && (!rawImg || rawImg.includes("manual"))
      ? defaultImage
      : rawImg || defaultImage;

  const rawImages = Array.isArray(raw.images) && raw.images.length > 0 ? raw.images : [primaryImg];
  const images = isGenesis && rawImages.every((img: string) => img.includes("manual"))
    ? [defaultImage]
    : rawImages;

  return {
    id: toNumericProductId(raw.id, slugStr),
    slug: String(raw.slug),
    title,
    name: title,
    brand: String(raw.brand || (isGenesis ? "GENESIS" : "FORCE")),
    series: seriesLabel,
    description: String(raw.description || ""),
    shortDescription: String(raw.short_description || raw.shortDescription || ""),
    application:
      isGenesis || isMachineProduct || isMachineType
        ? "machine"
        : (raw.application as "hand" | "machine") || "hand",
    categorySlug,
    category,
    filmType: String(raw.film_type || raw.filmType || (isGenesis ? "Cast Machine Stretch Film" : "Cast Co-Extruded Multi-Layer")),
    color: String(raw.color || "Ultra Clear"),
    features: Array.isArray(raw.features) ? raw.features : [],
    techSheetUrl: raw.tech_sheet_url || raw.techSheetUrl || "/docs/plastipac-force-hand-film-specs.pdf",
    imageUrl: primaryImg,
    images,
    recommendedUsage: raw.recommended_usage || raw.recommendedUsage || null,
    createdAt: raw.created_at ? new Date(raw.created_at) : new Date(),
    updatedAt: raw.updated_at ? new Date(raw.updated_at) : new Date(),
    variants: warehouseVariants,
    startingPrice: minPrice,
    categoryId: rawCategoryId || (categorySlug === "genesis-standard" ? "b0000000-0000-0000-0000-000000000003" : categorySlug === "force-elite" ? "b0000000-0000-0000-0000-000000000002" : "b0000000-0000-0000-0000-000000000001"),
    widthInches: Number(raw.width_inches || raw.widthInches || resolvedWidth || 0),
    width_inches: String(
      raw.width_inches ||
        raw.widthInches ||
        warehouseVariants[0]?.widthInches ||
        (isGenesis ? "20.00" : isElite ? "15.00" : "18.00")
    ),
    gauge: Number(raw.gauge || warehouseVariants[0]?.gauge || 60),
    length_feet: Number(
      raw.length_feet || raw.lengthFeet || warehouseVariants[0]?.lengthFeet || 1000
    ),
    core_type: String(raw.core_type || raw.coreType || 'Standard 3" Core'),
    fullPalletRolls: palletizing.fullPalletRolls,
    palletLayers: palletizing.palletLayers,
    rollsPerLayer: palletizing.rollsPerLayer,
    rollsPerBoxSpec: palletizing.rollsPerBox,
    boxesPerFullPallet: palletizing.boxesPerFullPallet,
    palletizingSummary: palletizing.packOutSummary,
    palletizingFamily: palletizing.familyLabel,
    partNumber: raw.part_number || raw.partNumber || null,
    stockQuantity: Number(raw.stock_quantity ?? raw.stockQuantity ?? 0),
    isActive: raw.is_active === undefined && raw.isActive === undefined ? true : Boolean(raw.is_active ?? raw.isActive),
    storefrontTitle: raw.storefront_title || raw.storefrontTitle || null,
    priceCase: raw.price_case === null || raw.price_case === undefined ? null : Number(raw.price_case),
    priceHalfPallet:
      raw.price_half_pallet === null || raw.price_half_pallet === undefined ? null : Number(raw.price_half_pallet),
    pricePallet: raw.price_pallet === null || raw.price_pallet === undefined ? null : Number(raw.price_pallet),
    price6Rolls: price6Rolls ?? undefined,
    price12Rolls: price12Rolls ?? undefined,
    price20Rolls: price20Rolls ?? undefined,
    price40Rolls: price40Rolls ?? undefined,
    packageOptions,
  };
}

/**
 * Live query to Supabase PostgreSQL selecting only product slugs for static route generation
 */
export async function getProductSlugs(): Promise<{ slug: string }[]> {
  try {
    const supabase = await createServerClient();
    const { data: products, error } = await supabase
      .from("products")
      .select("slug");

    if (!error && products && products.length > 0) {
      const slugs = products
        .filter((product) => Boolean(product.slug))
        .filter((product) => {
          const slug = String(product.slug || "").toLowerCase();
          return !slug.includes("50-ga") && !slug.includes("-50ga");
        })
        .map((product) => ({
          slug: product.slug,
        }));

      const existing = new Set(slugs.map((s) => s.slug.toLowerCase()));
      for (const fallback of GENESIS_MACHINE_FALLBACK_PRODUCTS) {
        if (!existing.has(fallback.slug.toLowerCase())) {
          slugs.push({ slug: fallback.slug });
        }
      }
      return slugs;
    }
  } catch (err: any) {
    console.error("getProductSlugs Supabase query failed:", err?.message || err);
  }

  return GENESIS_MACHINE_FALLBACK_PRODUCTS.map((p) => ({ slug: p.slug }));
}

/**
 * Fetch all products joined with categories and product_variants across all categories
 * Supports optional applicationFilter and categoryFilter
 */
export async function getProducts(
  applicationFilter?: "all" | "hand" | "machine",
  categoryFilter?: string
): Promise<ProductWithVariants[]> {
  const supabase = await createServerClient();

  const matchesCategory = (p: ProductWithVariants, filter: string) => {
    if (!filter || filter === "all") return true;
    if (
      filter === "genesis-standard" ||
      filter === "genesis-high-performance" ||
      filter === "machine-high-yield-film" ||
      filter === "b0000000-0000-0000-0000-000000000003"
    ) {
      return (
        p.categorySlug === "genesis-standard" ||
        p.categorySlug === "genesis-high-performance" ||
        p.categoryId === "b0000000-0000-0000-0000-000000000003" ||
        p.categoryId === "genesis-high-performance" ||
        p.application === "machine" ||
        String(p.slug || "").startsWith("stretch-film-20")
      );
    }
    return p.categorySlug === filter || p.categoryId === filter;
  };

  const finalizeCatalog = (items: ProductWithVariants[]) => {
    let next = ensureGenesisMachineProducts(
      items.filter((p) => p.isActive !== false)
    );
    if (applicationFilter && applicationFilter !== "all") {
      next = next.filter((p) => p.application === applicationFilter);
    }
    if (categoryFilter && categoryFilter !== "all") {
      next = next.filter((p) => matchesCategory(p, categoryFilter));
    }
    return sortProductsByDimensions(excludeFiftyGaugeFromStorefront(next));
  };

  try {
    if (isSupabaseConfigured) {
      // 1. Try relational query with categories and product_variants
      try {
        // Fetch broadly, then filter by formatted application so `type = Machine`
        // rows without an `application` column still appear in machine catalogs.
        const query = supabase
          .from("products")
          .select(`
            *,
            categories (*),
            product_variants (*)
          `)
          .order("created_at", { ascending: false });

        const { data, error } = await query;

        if (!error && data && data.length > 0) {
          return finalizeCatalog(data.map(formatProduct));
        }

        // 2. If categories table is not related, fallback to product_variants
        if (error) {
          const flatQuery = supabase
            .from("products")
            .select(`
              *,
              product_variants (*)
            `)
            .order("created_at", { ascending: false });

          const { data: flatData, error: flatError } = await flatQuery;
          if (!flatError && flatData && flatData.length > 0) {
            return finalizeCatalog(flatData.map(formatProduct));
          }

          // 3. Flat query without joins (handles schema cache without FKs)
          const { data: rawProds, error: rawError } = await supabase
            .from("products")
            .select("*")
            .order("created_at", { ascending: false });

          if (!rawError && rawProds && rawProds.length > 0) {
            const { data: rawVariants } = await supabase
              .from("product_variants")
              .select("*");

            const combined = rawProds.map((p) => ({
              ...p,
              product_variants: (rawVariants || []).filter(
                (v: any) => v.product_id === p.id || v.productId === p.id
              ),
            }));

            return finalizeCatalog(combined.map(formatProduct));
          }
        }
      } catch (sbErr: any) {
        console.error("Supabase getProducts query exception:", sbErr?.message || sbErr);
      }
    }
  } catch (error: any) {
    console.error("getProducts encountered error:", error?.message || error);
  }

  return finalizeCatalog([]);
}

/**
 * Fetch a single product by slug joined with its parent category and product_variants
 */
export async function getProductBySlug(slug: string): Promise<ProductWithVariants | null> {
  const normalizedSlug = String(slug || "").toLowerCase();
  if (normalizedSlug.includes("50-ga") || normalizedSlug.includes("-50ga")) {
    return null;
  }

  try {
    const supabase = await createServerClient();

    if (isSupabaseConfigured) {
      try {
        // 1. Relational query with categories and product_variants
        const { data, error } = await supabase
          .from("products")
          .select(`
            *,
            categories (*),
            product_variants (*)
          `)
          .eq("slug", slug)
          .maybeSingle();

        if (!error && data) {
          const product = formatProduct(data);
          return isFiftyGaugeStorefrontProduct(product) ? null : product;
        }

        // 2. Fallback to product_variants query if categories relation is omitted
        if (error) {
          const { data: flatData, error: flatError } = await supabase
            .from("products")
            .select(`
              *,
              product_variants (*)
            `)
            .eq("slug", slug)
            .maybeSingle();

          if (!flatError && flatData) {
            const product = formatProduct(flatData);
            return isFiftyGaugeStorefrontProduct(product) ? null : product;
          }

          // 3. Flat query without joins
          const { data: rawProd, error: rawProdError } = await supabase
            .from("products")
            .select("*")
            .eq("slug", slug)
            .maybeSingle();

          if (!rawProdError && rawProd) {
            const { data: rawVariants } = await supabase
              .from("product_variants")
              .select("*")
              .eq("product_id", rawProd.id);

            const product = formatProduct({
              ...rawProd,
              product_variants: rawVariants || [],
            });
            return isFiftyGaugeStorefrontProduct(product) ? null : product;
          }
        }
      } catch (sbErr: any) {
        console.error("Supabase getProductBySlug exception:", sbErr?.message || sbErr);
      }
    }
  } catch (error: any) {
    console.error("getProductBySlug encountered error:", error?.message || error);
  }

  return getGenesisMachineFallbackBySlug(slug);
}

/**
 * Generate a unique, URL-safe slug from a product name.
 */
function slugify(value: string): string {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

function formatAdminProduct(raw: any): AdminProduct {
  const categorySlug = String(
    PRODUCT_CATEGORIES.find((c) => c.id === raw.category_id || c.slug === raw.category_id)?.slug ||
      raw.category_id ||
      "force-standard"
  );

  return {
    id: Number(raw.id),
    slug: String(raw.slug),
    name: String(raw.name || ""),
    storefrontTitle: String(raw.storefront_title || raw.storefrontTitle || ""),
    partNumber: String(raw.part_number || ""),
    description: String(raw.description || ""),
    gauge: raw.gauge === null || raw.gauge === undefined ? null : Number(raw.gauge),
    priceUsd: raw.price_usd === null || raw.price_usd === undefined ? null : Number(raw.price_usd),
    priceCase: raw.price_case === null || raw.price_case === undefined ? null : Number(raw.price_case),
    priceHalfPallet:
      raw.price_half_pallet === null || raw.price_half_pallet === undefined ? null : Number(raw.price_half_pallet),
    pricePallet: raw.price_pallet === null || raw.price_pallet === undefined ? null : Number(raw.price_pallet),
    price6Rolls:
      raw.price_6_rolls === null || raw.price_6_rolls === undefined
        ? PACKAGE_TIER_DEFAULTS.price6Rolls
        : Number(raw.price_6_rolls),
    price12Rolls:
      raw.price_12_rolls === null || raw.price_12_rolls === undefined
        ? PACKAGE_TIER_DEFAULTS.price12Rolls
        : Number(raw.price_12_rolls),
    price20Rolls:
      raw.price_20_rolls === null || raw.price_20_rolls === undefined
        ? PACKAGE_TIER_DEFAULTS.price20Rolls
        : Number(raw.price_20_rolls),
    price40Rolls:
      raw.price_40_rolls === null || raw.price_40_rolls === undefined
        ? PACKAGE_TIER_DEFAULTS.price40Rolls
        : Number(raw.price_40_rolls),
    stockQuantity: Number(raw.stock_quantity ?? 0),
    // GENESIS categories are always machine-application; every other category is hand-application
    application: getApplicationForCategory(categorySlug),
    categorySlug,
    imageUrl: String(raw.image_url || raw.imageUrl || (Array.isArray(raw.images) && raw.images[0]) || ""),
    images: Array.isArray(raw.images) ? raw.images : [],
    isActive: raw.is_active === undefined || raw.is_active === null ? true : Boolean(raw.is_active),
    createdAt: raw.created_at || undefined,
    updatedAt: raw.updated_at || undefined,
  };
}

/**
 * Fetch the full flat product list (no variant joins) for the Admin Product Management UI.
 */
export async function getAdminProducts(): Promise<AdminProduct[]> {
  const { isAdmin } = await verifyAdmin();
  if (!isAdmin) {
    return [];
  }

  try {
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1000);

    if (error) {
      console.error("getAdminProducts query error:", error);
      return [];
    }

    return (data || []).map(formatAdminProduct);
  } catch (err: any) {
    console.error("getAdminProducts error:", err);
    return [];
  }
}

/**
 * Create a new product record in Supabase `public.products`.
 */
export async function createProduct(values: ProductFormValues) {
  const { isAdmin } = await verifyAdmin();
  if (!isAdmin) {
    return { success: false, error: "Unauthorized." };
  }

  try {
    if (!values.name?.trim()) {
      return { success: false, error: "Product name is required." };
    }

    const supabase = await createServerClient();
    const baseSlug = slugify(values.name);
    let slug = baseSlug;
    let attempt = 1;

    // Ensure slug uniqueness
    while (true) {
      const { data: existing } = await supabase
        .from("products")
        .select("id")
        .eq("slug", slug)
        .maybeSingle();
      if (!existing) break;
      attempt += 1;
      slug = `${baseSlug}-${attempt}`;
    }

    const insertPayload = {
      slug,
      name: values.name.trim(),
      storefront_title: values.storefrontTitle?.trim() || null,
      part_number: values.partNumber?.trim() || null,
      description: values.description?.trim() || "",
      short_description: (values.description || "").slice(0, 500),
      application: getApplicationForCategory(values.categorySlug),
      gauge: values.gauge ?? null,
      price_usd: values.priceUsd ?? null,
      price_case: values.priceCase ?? null,
      price_half_pallet: values.priceHalfPallet ?? null,
      price_pallet: values.pricePallet ?? null,
      price_6_rolls: values.price6Rolls ?? PACKAGE_TIER_DEFAULTS.price6Rolls,
      price_12_rolls: values.price12Rolls ?? PACKAGE_TIER_DEFAULTS.price12Rolls,
      price_20_rolls: values.price20Rolls ?? PACKAGE_TIER_DEFAULTS.price20Rolls,
      price_40_rolls: values.price40Rolls ?? PACKAGE_TIER_DEFAULTS.price40Rolls,
      stock_quantity: values.stockQuantity ?? 0,
      is_active: values.isActive ?? true,
      image_url: values.imageUrl || values.images?.[0] || "",
      images: values.images || [],
      category_id: PRODUCT_CATEGORIES.find((c) => c.slug === values.categorySlug)?.id || values.categorySlug || null,
    };

    const { data, error } = await supabase
      .from("products")
      .insert(insertPayload)
      .select("*")
      .single();

    if (error) {
      console.error("createProduct insert error:", error);
      return { success: false, error: error.message || "Failed to create product." };
    }

    revalidatePath("/admin");
    revalidatePath("/products");

    return { success: true, product: formatAdminProduct(data) };
  } catch (err: any) {
    console.error("createProduct error:", err);
    return { success: false, error: err?.message || "Failed to create product." };
  }
}

/**
 * Update an existing product's details in Supabase `public.products`.
 */
export async function updateProduct(id: number, values: Partial<ProductFormValues>) {
  const { isAdmin } = await verifyAdmin();
  if (!isAdmin) {
    return { success: false, error: "Unauthorized." };
  }

  try {
    const supabase = await createServerClient();

    const updatePayload: Record<string, any> = { updated_at: new Date().toISOString() };
    if (values.name !== undefined) updatePayload.name = values.name.trim();
    if (values.storefrontTitle !== undefined) updatePayload.storefront_title = values.storefrontTitle?.trim() || null;
    if (values.partNumber !== undefined) updatePayload.part_number = values.partNumber?.trim() || null;
    if (values.description !== undefined) {
      updatePayload.description = values.description?.trim() || "";
      updatePayload.short_description = (values.description || "").slice(0, 500);
    }
    if (values.application !== undefined) updatePayload.application = values.application;
    if (values.gauge !== undefined) updatePayload.gauge = values.gauge;
    if (values.priceUsd !== undefined) updatePayload.price_usd = values.priceUsd;
    if (values.priceCase !== undefined) updatePayload.price_case = values.priceCase;
    if (values.priceHalfPallet !== undefined) updatePayload.price_half_pallet = values.priceHalfPallet;
    if (values.pricePallet !== undefined) updatePayload.price_pallet = values.pricePallet;
    if (values.price6Rolls !== undefined) updatePayload.price_6_rolls = values.price6Rolls;
    if (values.price12Rolls !== undefined) updatePayload.price_12_rolls = values.price12Rolls;
    if (values.price20Rolls !== undefined) updatePayload.price_20_rolls = values.price20Rolls;
    if (values.price40Rolls !== undefined) updatePayload.price_40_rolls = values.price40Rolls;
    if (values.stockQuantity !== undefined) updatePayload.stock_quantity = values.stockQuantity;
    if (values.isActive !== undefined) updatePayload.is_active = values.isActive;
    if (values.categorySlug !== undefined) {
      updatePayload.category_id =
        PRODUCT_CATEGORIES.find((c) => c.slug === values.categorySlug)?.id || values.categorySlug;
      // GENESIS categories are always machine-application; every other category is hand-application
      updatePayload.application = getApplicationForCategory(values.categorySlug);
    }
    if (values.images !== undefined) {
      updatePayload.images = values.images;
      updatePayload.image_url = values.imageUrl || values.images?.[0] || "";
    } else if (values.imageUrl !== undefined) {
      updatePayload.image_url = values.imageUrl;
    }

    const { data, error } = await supabase
      .from("products")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("updateProduct error:", error);
      return { success: false, error: error.message || "Failed to update product." };
    }

    revalidatePath("/admin");
    revalidatePath("/products");
    revalidatePath(`/products/${data.slug}`);

    return { success: true, product: formatAdminProduct(data) };
  } catch (err: any) {
    console.error("updateProduct error:", err);
    return { success: false, error: err?.message || "Failed to update product." };
  }
}

/**
 * Toggle a product's active/inactive visibility status.
 */
export async function toggleProductActive(id: number, isActive: boolean) {
  return updateProduct(id, { isActive });
}

/**
 * Permanently delete a product (and its variants, via cascade) from Supabase.
 */
export async function deleteProduct(id: number) {
  const { isAdmin } = await verifyAdmin();
  if (!isAdmin) {
    return { success: false, error: "Unauthorized." };
  }

  try {
    const supabase = await createServerClient();
    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      console.error("deleteProduct error:", error);
      return { success: false, error: error.message || "Failed to delete product." };
    }

    revalidatePath("/admin");
    revalidatePath("/products");

    return { success: true };
  } catch (err: any) {
    console.error("deleteProduct error:", err);
    return { success: false, error: err?.message || "Failed to delete product." };
  }
}

/**
 * Upload a product image file to the Supabase Storage `product-images` bucket
 * and return its public URL.
 */
export async function uploadProductImage(formData: FormData) {
  const { isAdmin } = await verifyAdmin();
  if (!isAdmin) {
    return { success: false, error: "Unauthorized." };
  }

  try {
    const file = formData.get("file") as File | null;
    if (!file || file.size === 0) {
      return { success: false, error: "No file provided." };
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/gif"];
    if (!allowedTypes.includes(file.type)) {
      return { success: false, error: "Unsupported file type. Please upload a PNG, JPG, WEBP, or GIF image." };
    }

    const maxSizeBytes = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSizeBytes) {
      return { success: false, error: "Image is too large. Maximum size is 5MB." };
    }

    const supabase = await createServerClient();
    const extension = file.name.split(".").pop()?.toLowerCase() || "png";
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${extension}`;

    const arrayBuffer = await file.arrayBuffer();
    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(fileName, arrayBuffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("uploadProductImage error:", uploadError);
      return { success: false, error: uploadError.message || "Failed to upload image." };
    }

    const { data: publicUrlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(fileName);

    return { success: true, url: publicUrlData.publicUrl };
  } catch (err: any) {
    console.error("uploadProductImage error:", err);
    return { success: false, error: err?.message || "Failed to upload image." };
  }
}
