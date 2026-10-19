"use server";

import { revalidatePath, unstable_noStore as noStore } from "next/cache";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  createServiceRoleClient,
  isServiceRoleConfigured,
} from "@/lib/supabase/admin";
import { ProductWithVariants, ProductVariant, PackageOption } from "@/types";
import { AdminPackageTier, AdminProduct, ProductFormValues, PACKAGE_TIER_DEFAULTS } from "@/types/product";
import {
  PRODUCT_CATEGORIES,
  categoryIdForSlug,
  categorySlugFromRecord,
  getApplicationForCategory,
} from "@/data/categories";
import { verifyAdmin } from "./admin";
import {
  isExcludedFifteenInchEightyGauge,
  resolvePalletizingSpecs,
  usesCompact1880Pallets,
} from "@/lib/palletizing";
import { packageTotalWeightLbs } from "@/lib/package-weight";
import { CATALOG_SOLD_OUT } from "@/lib/catalog-availability";
import {
  BOX_PRICE_PRESETS,
  getDisplayPrice,
  perBoxPriceFromVariant,
  readBoxTierPrices,
  totalForBoxes,
  unitBoxPriceForCount,
} from "@/lib/pricing";
import {
  HAND_FULL_PALLET,
  MACHINE_FILM_IMAGE_URL,
  GENESIS_HP_SLUGS,
  GENESIS_STANDARD_SLUGS,
  GENESIS_MACHINE_FALLBACK_PRODUCTS,
  SERIES_FORCE_ELITE,
  SERIES_FORCE_STANDARD,
  buildMachinePackageOptions,
  formatBoxRollLabel,
  ensureGenesisMachineProducts,
  getGenesisMachineFallbackBySlug,
  isMachineFilm as detectMachineFilm,
  normalizeMachinePackageLabel,
  seriesLabelFromCategorySlug,
  sortProductsByDimensions,
} from "@/lib/products";

/** Optional box rates. A missing column must not discard the product list. */
const BOX_PRICE_COLUMN_SELECT =
  "id, price_1_box, price_16_boxes, price_32_boxes, price_64_boxes" as const;

async function getProductWriteClient() {
  if (isServiceRoleConfigured()) return createServiceRoleClient();
  return createServerClient();
}

function revalidateProductPaths(slug?: string) {
  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath("/products");
  if (slug) revalidatePath(`/products/${slug}`);
}

function firstRow<T>(data: T | T[] | null | undefined): T | null {
  if (Array.isArray(data)) return data[0] ?? null;
  return data ?? null;
}

/** Drop unknown columns and retry so older Supabase schemas still save. */
async function writeProductRow(
  supabase: Awaited<ReturnType<typeof getProductWriteClient>>,
  mode: "insert" | "update",
  payload: Record<string, unknown>,
  id?: string
) {
  let next = { ...payload };
  for (let attempt = 0; attempt < 30; attempt += 1) {
    const query =
      mode === "insert"
        ? supabase.from("products").insert(next).select("*")
        : supabase.from("products").update(next).eq("id", id as string).select("*");
    const result = await query;
    if (!result.error) {
      return { data: firstRow(result.data), error: null };
    }
    const message = result.error.message || "";
    const missing =
      message.match(/Could not find the ['"]([a-z0-9_]+)['"] column/i) ||
      message.match(/column ["']?([a-z0-9_]+)["']?/i);
    const unknownColumn =
      /does not exist/i.test(message) || /schema cache/i.test(message);
    if (!missing || !unknownColumn) return { data: null, error: result.error };
    const column = missing[1];
    if (!(column in next)) return { data: null, error: result.error };
    delete next[column];
    next = { ...next };
  }
  const result = await supabase.from("products").update(next).eq("id", id as string).select("*");
  return { data: firstRow(result.data), error: result.error };
}

/** Per-box rate from the matching variant, then the product-row column. */
function handBoxTierOptions(raw: any, baseSku: string, variants: any[] = []): PackageOption[] {
  const prices = readBoxTierPrices(raw);
  return BOX_PRICE_PRESETS.flatMap((tier) => {
    const match = variants.find(
      (variant) => Number(variant?.boxes_count ?? variant?.boxesCount ?? 0) === tier.boxes
    );
    const unit =
      perBoxPriceFromVariant(match, tier.boxes) ?? unitBoxPriceForCount(prices, tier.boxes);
    if (unit === null) return [];
    return [
      {
        rolls: tier.rolls,
        boxes: tier.boxes,
        label: formatBoxRollLabel(tier.boxes, tier.rolls),
        sku: String(match?.sku || `${baseSku}-${tier.boxes}BX`),
        boxUnitPrice: unit,
        price: unit,
      },
    ];
  });
}

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
      const widthInches = String(v.width_inches || v.widthInches || raw.width_inches || "18.00");
      const machineVariant =
        Math.round(Number(widthInches) || 0) === 20 ||
        String(raw.application || raw.type || raw.film_type || raw.filmType || "").toLowerCase().includes("machine");
      const boxesCount = machineVariant
        ? 0
        : Number(
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
      const variantPrice = perBoxPriceFromVariant(v, boxesCount);
      const productRollWeight = Number(raw.roll_weight_lbs ?? raw.rollWeightLbs) || 0;
      const productPalletWeight = Number(raw.pallet_weight_lbs ?? raw.palletWeightLbs) || 0;
      const gauge = Number(v.gauge || raw.gauge || 60);
      const lengthFeet = Number(v.length_feet || v.lengthFeet || raw.length_feet || 1000);
      const rollWeightLbs = Number(v.roll_weight_lbs ?? v.rollWeightLbs) || productRollWeight;
      const storedBoxWeight = Number(v.box_weight_lbs ?? v.boxWeightLbs) || 0;
      const boxWeightLbs =
        storedBoxWeight > 0
          ? storedBoxWeight
          : machineVariant
            ? rollWeightLbs
            : rollWeightLbs > 0
              ? rollWeightLbs * 4
              : 0;
      const palletWeightLbs =
        Number(v.pallet_weight_lbs ?? v.palletWeightLbs) || productPalletWeight;
      const totalWeight = packageTotalWeightLbs({
        rolls: rollsCount,
        boxes: boxesCount,
        rollWeightLbs,
        boxWeightLbs,
        palletWeightLbs,
        weightLbs: v.weight_lbs ?? v.weightLbs,
        machine: machineVariant,
        widthInches,
        gauge,
        lengthFeet,
      });

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
        widthInches,
        gauge,
        lengthFeet,
        rollsPerBox: rollsCount,
        rollsPerPallet: Number(v.rolls_per_pallet || v.rollsPerPallet || 256),
        weightLbs: totalWeight != null ? String(totalWeight) : "",
        rollWeightLbs,
        boxWeightLbs,
        palletWeightLbs,
        price: variantPrice,
        priceUsd: variantPrice !== null ? String(variantPrice) : "0",
        casePriceUsd: v.case_price_usd ? String(v.case_price_usd) : (v.casePriceUsd ? String(v.casePriceUsd) : null),
        palletPriceUsd: v.pallet_price_usd ? String(v.pallet_price_usd) : (v.palletPriceUsd ? String(v.palletPriceUsd) : null),
        stockStatus: String(v.stock_status || v.stockStatus || "in_stock"),
        dimensions: firstText(v.dimensions, v.package_dimensions) || null,
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
      const keepStoredPackageLabel = usesCompact1880Pallets({
        widthInches: resolvedWidth,
        gauge: gaugeNum,
        lengthFeet: lengthNum,
        slug: slugStr,
        name: nameStr,
      });
      const isStandard256Pallet = rolls === 256 || boxes === 64;
      const isFullPalletLabel =
        !keepStoredPackageLabel &&
        !isStandard256Pallet &&
        (label.includes("FULL PALLET") ||
          (palletizing.fullPalletRolls === 40 && (rolls === 40 || label.includes("40 ROLLS"))));

      const machinePack = palletizing.fullPalletRolls === 40;
      if (isFullPalletLabel) {
        const fullLabel = machinePack
          ? "Full Pallet (40 Rolls)"
          : HAND_FULL_PALLET.label;
        const fullRolls = machinePack ? 40 : HAND_FULL_PALLET.rolls;
        const fullBoxes = machinePack ? 0 : HAND_FULL_PALLET.boxes;
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
        ...(machinePack
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
        .filter((option) => option.rolls === 20 || option.rolls === 40)
        .sort((a, b) => a.rolls - b.rolls);
    } else if (productBasePrice !== null) {
      packageOptions = buildMachinePackageOptions({
        baseSku,
        price1: productBasePrice,
        price20: null,
        price40: null,
      });
    }
  } else {
    packageOptions = handBoxTierOptions(raw, baseSku, warehouseVariants);
  }

  const boxPrices = readBoxTierPrices(raw);
  const variantAmounts = warehouseVariants
    .map((variant) => parsePositivePrice(variant.priceUsd))
    .filter((price): price is number => price !== null);
  const variantStart = variantAmounts.length > 0 ? Math.min(...variantAmounts) : null;
  const columnStart = boxPrices.price64Boxes ?? boxPrices.price1Box ?? null;
  const candidatePrices = [
    ...(isMachineProduct ? packageOptions.map((opt) => parsePositivePrice(opt.price)) : []),
    ...(isMachineProduct ? [productBasePrice] : []),
  ].filter((p): p is number => p !== null);

  const minPrice =
    variantStart ??
    columnStart ??
    (candidatePrices.length > 0 ? Math.min(...candidatePrices) : undefined);

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
    palletDimensions: String(raw.pallet_dimensions || raw.palletDimensions || ""),
    pallet_dimensions: String(raw.pallet_dimensions || raw.palletDimensions || ""),
    partNumber: raw.part_number || raw.partNumber || null,
    stockQuantity: Number(raw.stock_quantity ?? raw.stockQuantity ?? 0),
    isSoldOut: CATALOG_SOLD_OUT || raw.is_sold_out === true || raw.isSoldOut === true,
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
    boxPrices,
    price_1_box: boxPrices.price1Box,
    price_16_boxes: boxPrices.price16Boxes,
    price_32_boxes: boxPrices.price32Boxes,
    price_64_boxes: boxPrices.price64Boxes,
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

type CatalogClient = Awaited<ReturnType<typeof createServerClient>>;

/**
 * Keep every product row. Variants and box-rate columns are attached only when
 * those queries succeed, so a product with no variant is still returned.
 */
async function attachCatalogRelations(supabase: CatalogClient, products: any[]) {
  if (!products.length) return products;

  try {
  const ids = products.map((product) => product.id).filter((id) => id != null && id !== "");
  const [embedded, variantRows, priceRows, categories] = await Promise.all([
    supabase.from("products").select("*, product_variants(*)").in("id", ids),
    supabase.from("product_variants").select("*").in("product_id", ids),
    supabase.from("products").select(BOX_PRICE_COLUMN_SELECT).in("id", ids),
    supabase.from("categories").select("id, slug, name"),
  ]);

  const variantsByProduct = new Map<string, any[]>();
  const embedKeepsEveryProduct =
    !embedded.error &&
    Array.isArray(embedded.data) &&
    embedded.data.length >= products.length;

  if (embedKeepsEveryProduct) {
    for (const row of embedded.data || []) {
      variantsByProduct.set(
        String(row.id),
        Array.isArray(row.product_variants) ? row.product_variants : []
      );
    }
  } else if (!variantRows.error) {
    for (const variant of variantRows.data || []) {
      const key = String(variant.product_id ?? variant.productId ?? "");
      if (!key) continue;
      const list = variantsByProduct.get(key) || [];
      list.push(variant);
      variantsByProduct.set(key, list);
    }
  } else {
    console.error("Catalog variant attach failed:", embedded.error || variantRows.error);
  }

  const pricesById = new Map(
    (!priceRows.error ? priceRows.data || [] : []).map((row) => [String(row.id), row])
  );
  if (priceRows.error) {
    console.error("Catalog box-price columns unavailable:", priceRows.error.message);
  }
  const categoriesById = new Map(
    (!categories.error ? categories.data || [] : []).map((category) => [String(category.id), category])
  );

  return products.map((product) => ({
    ...product,
    ...(pricesById.get(String(product.id)) || {}),
    categories:
      categoriesById.get(String(product.category_id ?? product.categoryId)) ||
      product.categories ||
      null,
    product_variants: variantsByProduct.get(String(product.id)) || [],
  }));
  } catch (err) {
    console.error("Catalog relation attach failed:", err);
    return products.map((product) => ({
      ...product,
      product_variants: Array.isArray(product.product_variants) ? product.product_variants : [],
    }));
  }
}

/**
 * Fetch all products joined with categories and product_variants across all categories
 * Supports optional applicationFilter and categoryFilter
 */
export async function getProducts(
  applicationFilter?: "all" | "hand" | "machine",
  categoryFilter?: string
): Promise<ProductWithVariants[]> {
  noStore();
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
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) {
          console.error("getProducts query error:", error);
        } else if (data) {
          const rows = await attachCatalogRelations(supabase, data);
          const formatted = rows.flatMap((row) => {
            try {
              return [formatProduct(row)];
            } catch (formatError) {
              console.error("formatProduct failed:", row?.slug || row?.id, formatError);
              return [];
            }
          });
          return finalizeCatalog(formatted);
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
  noStore();
  const normalizedSlug = String(slug || "").toLowerCase();
  if (normalizedSlug.includes("50-ga") || normalizedSlug.includes("-50ga")) {
    return null;
  }

  try {
    const supabase = await createServerClient();

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .eq("slug", slug)
          .maybeSingle();

        if (error) {
          console.error("getProductBySlug query error:", error);
        } else if (data) {
          const [row] = await attachCatalogRelations(supabase, [data]);
          const product = formatProduct(row);
          return isFiftyGaugeStorefrontProduct(product) ? null : product;
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

function readPositiveNumber(...candidates: unknown[]): number | null {
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined || candidate === "") continue;
    const value = Number(candidate);
    if (Number.isFinite(value) && value > 0) return value;
  }
  return null;
}

function readNullableNumber(...candidates: unknown[]): number | null {
  for (const candidate of candidates) {
    if (candidate === null || candidate === undefined || candidate === "") continue;
    const value = Number(candidate);
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function extractWidthInches(text: string): number | null {
  const match = text.match(/(\d+(?:\.\d+)?)\s*(?:"|″|\bin\b)/i);
  return match ? Number(match[1]) : null;
}

function extractLengthFeetFromText(text: string): number | null {
  const match = text.match(/(\d{3,5})\s*ft\b/i);
  return match ? Number(match[1]) : null;
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    if (value === null || value === undefined) continue;
    const text = String(value).trim();
    if (text) return text;
  }
  return "";
}

function readSoldOut(raw: any): boolean {
  if (raw.is_sold_out !== null && raw.is_sold_out !== undefined) return Boolean(raw.is_sold_out);
  if (raw.isSoldOut !== null && raw.isSoldOut !== undefined) return Boolean(raw.isSoldOut);
  if (typeof raw.in_stock === "boolean") return !raw.in_stock;
  const availability = String(raw.availability || "").toLowerCase();
  if (availability.includes("sold")) return true;
  if (availability.includes("in stock") || availability === "available") return false;
  return false;
}

function readIsActive(raw: any): boolean {
  if (raw.is_active !== null && raw.is_active !== undefined) return Boolean(raw.is_active);
  if (raw.visible !== null && raw.visible !== undefined) return Boolean(raw.visible);
  return true;
}

function applicationFromRecord(raw: any, categorySlug: string): "hand" | "machine" {
  const type = String(raw.application || raw.type || "").toLowerCase();
  if (type === "machine" || type.includes("machine") || type.includes("automatic")) return "machine";
  if (type === "hand" || type.includes("hand") || type.includes("manual")) return "hand";
  return getApplicationForCategory(categorySlug);
}

const BOX_TIER_COUNTS = [1, 16, 32, 64] as const;
const ROLLS_FOR_BOX_TIER: Record<number, number> = { 4: 1, 64: 16, 128: 32, 256: 64 };

/** Resolve a variant row to one of the sellable box counts. */
function inferVariantBoxes(variant: any): number | null {
  const boxes = Math.floor(Number(variant?.boxes_count ?? variant?.boxesCount) || 0);
  if ((BOX_TIER_COUNTS as readonly number[]).includes(boxes)) return boxes;

  const rolls = Math.floor(Number(variant?.rolls_count ?? variant?.rollsCount) || 0);
  if (ROLLS_FOR_BOX_TIER[rolls]) return ROLLS_FOR_BOX_TIER[rolls];

  const label = String(
    variant?.title || variant?.package_size || variant?.packageSize || variant?.label || ""
  );
  const boxMatch = label.match(/(\d+)\s*BOX/i);
  const labeledBoxes = Math.floor(Number(boxMatch?.[1]) || 0);
  if ((BOX_TIER_COUNTS as readonly number[]).includes(labeledBoxes)) return labeledBoxes;

  const rollMatch = label.match(/(\d+)\s*ROLL/i);
  const labeledRolls = Math.floor(Number(rollMatch?.[1]) || 0);
  if (ROLLS_FOR_BOX_TIER[labeledRolls]) return ROLLS_FOR_BOX_TIER[labeledRolls];

  const skuMatch = String(variant?.sku || "").match(/-(1|16|32|64)B(?:X)?$/i);
  const skuBoxes = Math.floor(Number(skuMatch?.[1]) || 0);
  if ((BOX_TIER_COUNTS as readonly number[]).includes(skuBoxes)) return skuBoxes;

  return null;
}

function mapPackageTiers(variants: any[] | null | undefined): AdminPackageTier[] {
  const rows = Array.isArray(variants) ? variants : [];
  return [...rows]
    .sort((a, b) => {
      const boxesA = inferVariantBoxes(a) ?? 0;
      const boxesB = inferVariantBoxes(b) ?? 0;
      if (boxesA !== boxesB) return boxesA - boxesB;
      return (
        (parsePositivePrice(a.price_usd, a.priceUsd, a.price) ?? 0) -
        (parsePositivePrice(b.price_usd, b.priceUsd, b.price) ?? 0)
      );
    })
    .map((variant) => {
      const boxes = inferVariantBoxes(variant);
      const storedRolls = Number(variant.rolls_count ?? variant.rollsCount) || null;
      return {
        id: variant.id ? String(variant.id) : undefined,
        label: firstText(variant.title, variant.package_size, variant.packageSize, variant.sku) || "Package",
        sku: firstText(variant.sku),
        price: parsePositivePrice(variant.price_usd, variant.priceUsd, variant.price) ?? 0,
        boxesCount: boxes,
        rollsCount: storedRolls || (boxes ? boxes * 4 : null),
        rollWeightLbs: readNullableNumber(variant.roll_weight_lbs, variant.rollWeightLbs),
        boxWeightLbs: readNullableNumber(variant.box_weight_lbs, variant.boxWeightLbs),
        palletWeightLbs: readNullableNumber(variant.pallet_weight_lbs, variant.palletWeightLbs),
      };
    });
}

async function loadProductVariantRows(
  supabase: Awaited<ReturnType<typeof getProductWriteClient>>,
  productId: string
) {
  const { data, error } = await supabase
    .from("product_variants")
    .select("*")
    .eq("product_id", productId);
  if (error) {
    throw new Error(error.message || "Failed to load product variants.");
  }
  return data || [];
}

async function insertPackageVariant(
  supabase: Awaited<ReturnType<typeof getProductWriteClient>>,
  payload: Record<string, unknown>
) {
  let next = { ...payload };
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const result = await supabase.from("product_variants").insert(next).select("*");
    if (!result.error) return firstRow(result.data);
    const message = result.error.message || "";
    const missing =
      message.match(/Could not find the ['"]([a-z0-9_]+)['"] column/i) ||
      message.match(/column ["']?([a-z0-9_]+)["']?/i);
    const unknownColumn = /does not exist/i.test(message) || /schema cache/i.test(message);
    if (!missing || !unknownColumn || !(missing[1] in next)) {
      throw new Error(message || "Failed to create package option.");
    }
    delete next[missing[1]];
    next = { ...next };
  }
  throw new Error("Failed to create package option.");
}

function boxPriceColumnPatch(tiers: ProductFormValues["packageTiers"] | undefined) {
  const patch: Record<string, number> = {};
  for (const tier of tiers || []) {
    const boxes = Number(tier.boxesCount);
    const price = Number(tier.price);
    if (!Number.isFinite(price) || price <= 0) continue;
    const amount = Number(price.toFixed(2));
    if (boxes === 1) patch.price_1_box = amount;
    if (boxes === 16) patch.price_16_boxes = amount;
    if (boxes === 32) patch.price_32_boxes = amount;
    if (boxes === 64) patch.price_64_boxes = amount;
  }
  return patch;
}

async function updatePackageVariant(
  supabase: Awaited<ReturnType<typeof getProductWriteClient>>,
  id: string,
  productId: string,
  payload: Record<string, unknown>
) {
  let next = { ...payload };
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const result = await supabase
      .from("product_variants")
      .update(next)
      .eq("id", id)
      .eq("product_id", productId)
      .select("*");
    if (!result.error) return firstRow(result.data);
    const message = result.error.message || "";
    const missing =
      message.match(/Could not find the ['"]([a-z0-9_]+)['"] column/i) ||
      message.match(/column ["']?([a-z0-9_]+)["']?/i);
    const unknownColumn = /does not exist/i.test(message) || /schema cache/i.test(message);
    if (!missing || !unknownColumn || !(missing[1] in next)) {
      throw new Error(message || "Failed to update package option.");
    }
    delete next[missing[1]];
    next = { ...next };
  }
  throw new Error("Failed to update package option.");
}

async function syncBaseVariant(
  supabase: Awaited<ReturnType<typeof getProductWriteClient>>,
  productId: string,
  values: Partial<ProductFormValues>
) {
  let variants = await loadProductVariantRows(supabase, productId);
  const pricedTierIds = new Set<string>();

  for (const tier of values.packageTiers || []) {
    const boxes = Number(tier.boxesCount);
    const isBoxTier = BOX_TIER_COUNTS.includes(boxes as (typeof BOX_TIER_COUNTS)[number]);
    if (!isBoxTier) {
      if (tier.price === null || tier.price === undefined || !Number.isFinite(Number(tier.price))) continue;
      if (Number(tier.price) < 0) continue;
      const legacyPrice = Number(Number(tier.price).toFixed(2));
      if (tier.id) {
        const updated = await updatePackageVariant(supabase, String(tier.id), productId, {
          price: legacyPrice,
          price_usd: legacyPrice,
        });
        pricedTierIds.add(String(tier.id));
        const match = variants.find((variant) => String(variant.id) === String(tier.id));
        if (match) Object.assign(match, updated || { price: legacyPrice, price_usd: legacyPrice });
        continue;
      }
      const sku =
        tier.sku?.trim() ||
        `${String(productId).replace(/-/g, "").slice(0, 8)}-${boxes || 1}B`;
      const inserted = await insertPackageVariant(supabase, {
        product_id: productId,
        sku,
        title: tier.label,
        rolls_count: tier.rollsCount ?? null,
        boxes_count: tier.boxesCount ?? null,
        price: legacyPrice,
        price_usd: legacyPrice,
        stock_quantity: 0,
      });
      if (inserted) {
        variants.push(inserted);
        pricedTierIds.add(String(inserted.id));
      }
      continue;
    }
    const matches = variants.filter(
      (variant) =>
        inferVariantBoxes(variant) === boxes ||
        (tier.id && String(variant.id) === String(tier.id)) ||
        (tier.sku?.trim() && String(variant.sku || "").trim() === tier.sku.trim())
    );
    if (tier.price === null || tier.price === undefined || !Number.isFinite(Number(tier.price)) || Number(tier.price) <= 0) {
      if (!tier.id) continue;
      for (const row of matches) {
        if (String(row.id) !== String(tier.id)) continue;
        await supabase.from("product_variants").delete().eq("id", row.id).eq("product_id", productId);
        variants = variants.filter((variant) => String(variant.id) !== String(row.id));
      }
      continue;
    }
    const price = Number(Number(tier.price).toFixed(2));
    const existing = matches[0];
    const rolls = tier.rollsCount ?? boxes * 4;
    const sku =
      tier.sku?.trim() ||
      existing?.sku ||
      `${String(productId).replace(/-/g, "").slice(0, 8)}-${boxes}B`;
    const payload: Record<string, unknown> = {
      price,
      price_usd: price,
      boxes_count: boxes,
      rolls_count: rolls,
      title: tier.label,
      package_size: tier.label,
      sku,
    };
    if (values.widthInches != null) payload.width_inches = values.widthInches;
    if (values.gauge != null) payload.gauge = values.gauge;
    if (values.lengthFeet != null) payload.length_feet = values.lengthFeet;

    let saved = existing;
    if (existing?.id) {
      saved = await updatePackageVariant(supabase, String(existing.id), productId, payload);
      pricedTierIds.add(String(existing.id));
    } else {
      const rollWeight = Number(values.rollWeightLbs);
      saved = await insertPackageVariant(supabase, {
        product_id: productId,
        ...payload,
        stock_quantity: 0,
        ...(rollWeight > 0 ? { weight_lbs: Number((rollWeight * rolls).toFixed(2)), rolls_per_box: 4 } : {}),
      });
      if (saved?.id) pricedTierIds.add(String(saved.id));
    }
    if (saved) {
      if (existing) Object.assign(existing, saved);
      else variants.push(saved);
    }
    for (const extra of matches.slice(1)) {
      if (inferVariantBoxes(extra) !== boxes) continue;
      await supabase.from("product_variants").delete().eq("id", extra.id).eq("product_id", productId);
      variants = variants.filter((variant) => String(variant.id) !== String(extra.id));
    }
  }

  const base = pickBaseVariant(variants);
  if (!base) return variants;

  const patch: Record<string, unknown> = {};
  if (
    values.priceUsd !== undefined &&
    values.priceUsd !== null &&
    Number(values.priceUsd) > 0 &&
    !pricedTierIds.has(String(base.id))
  ) {
    patch.price = Number(values.priceUsd);
  }
  if (values.stockQuantity !== undefined && values.stockQuantity !== null) {
    patch.stock_quantity = Number(values.stockQuantity);
  }
  if (Object.keys(patch).length > 0) {
    await supabase.from("product_variants").update(patch).eq("id", base.id);
    Object.assign(base, patch);
  }
  return variants;
}

function pickBaseVariant(variants: any[] | null | undefined) {
  const rows = Array.isArray(variants) ? variants : [];
  if (!rows.length) return null;
  return (
    rows.find((variant) => Number(variant.boxes_count ?? variant.boxesCount) === 1) ||
    [...rows].sort(
      (a, b) => Number(a.price ?? a.price_usd ?? a.priceUsd ?? 0) - Number(b.price ?? b.price_usd ?? b.priceUsd ?? 0)
    )[0]
  );
}

function formatAdminProduct(raw: any): AdminProduct {
  const joinedCategory = raw.categories || raw.category || null;
  const categorySlug = categorySlugFromRecord(
    raw.category_id || raw.categoryId || joinedCategory?.id,
    joinedCategory?.slug || raw.category_slug || raw.categorySlug
  );
  const baseVariant = pickBaseVariant(raw.product_variants || raw.variants);

  const specSource = [raw.title, raw.name, raw.storefront_title, raw.storefrontTitle, raw.slug]
    .filter(Boolean)
    .join(" ");
  const gauge = readPositiveNumber(raw.gauge) ?? readPositiveNumber(specSource.match(/(\d+)\s*ga\b/i)?.[1]);
  const widthInches =
    readPositiveNumber(raw.width_inches, raw.widthInches, raw.width) ??
    extractWidthInches(specSource);
  const lengthFeet =
    readPositiveNumber(raw.length_feet, raw.lengthFeet, raw.length) ??
    extractLengthFeetFromText(specSource);
  const boxPrices = readBoxTierPrices(raw);
  const priceUsd =
    getDisplayPrice(raw) ??
    parsePositivePrice(
      raw.base_unit_price,
      raw.price_usd,
      raw.priceUsd,
      raw.price,
      baseVariant?.price,
      baseVariant?.price_usd,
      baseVariant?.priceUsd
    );

  return {
    id: String(raw.id),
    slug: String(raw.slug || ""),
    name: firstText(raw.title, raw.name, raw.product_title),
    storefrontTitle: firstText(raw.display_name, raw.displayName, raw.storefront_title, raw.storefrontTitle),
    partNumber: firstText(raw.part_number, raw.partNumber, raw.sku, baseVariant?.sku),
    description: firstText(raw.description),
    gauge,
    widthInches,
    lengthFeet,
    rollsPerBox: readNullableNumber(raw.rolls_per_box, raw.rollsPerBox),
    rollWeightLbs: readNullableNumber(raw.roll_weight_lbs, raw.rollWeightLbs),
    palletWeightLbs: readNullableNumber(raw.pallet_weight_lbs, raw.palletWeightLbs),
    palletDimensions: firstText(raw.pallet_dimensions, raw.palletDimensions),
    priceUsd,
    price1Box: boxPrices.price1Box,
    price16Boxes: boxPrices.price16Boxes,
    price32Boxes: boxPrices.price32Boxes,
    price64Boxes: boxPrices.price64Boxes,
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
    stockQuantity: Number(
      raw.stock_quantity ?? raw.stock_qty ?? raw.stockQuantity ?? baseVariant?.stock_quantity ?? 0
    ),
    isSoldOut: readSoldOut(raw),
    application: applicationFromRecord(raw, categorySlug),
    categorySlug,
    imageUrl: String(raw.image_url || raw.imageUrl || (Array.isArray(raw.images) && raw.images[0]) || ""),
    images: Array.isArray(raw.images) ? raw.images : [],
    isActive: readIsActive(raw),
    packageTiers: mapPackageTiers(raw.product_variants || raw.variants),
    createdAt: raw.created_at || undefined,
    updatedAt: raw.updated_at || undefined,
  };
}

/**
 * Load every variant for one product so the edit form can fill the 1, 16, 32, and 64 box fields.
 */
export async function getAdminProductVariants(productId: string): Promise<AdminPackageTier[]> {
  const { isAdmin } = await verifyAdmin();
  if (!isAdmin) {
    throw new Error("Unauthorized.");
  }
  if (!productId) return [];

  const supabase = await getProductWriteClient();
  const rows = await loadProductVariantRows(supabase, productId);
  return mapPackageTiers(rows);
}

/**
 * Ping products and product_variants so the admin catalog can confirm Supabase is reachable.
 */
export async function testAdminDatabaseConnection(): Promise<
  | { ok: true; products: number; variants: number }
  | { ok: false; error: string }
> {
  const { isAdmin } = await verifyAdmin();
  if (!isAdmin) {
    return { ok: false, error: "Unauthorized." };
  }

  try {
    const supabase = await getProductWriteClient();
    const { error, count } = await supabase
      .from("products")
      .select("id", { count: "exact", head: true });
    if (error) throw error;

    const { error: variantsError, count: variantsCount } = await supabase
      .from("product_variants")
      .select("id", { count: "exact", head: true });
    if (variantsError) throw variantsError;

    return { ok: true, products: count ?? 0, variants: variantsCount ?? 0 };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Sin conexión";
    return { ok: false, error: message };
  }
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
    const writer = await getProductWriteClient();
    const adminWithVariants =
      "*, price_1_box, price_16_boxes, price_32_boxes, price_64_boxes, product_variants(*)" as const;
    const joined = await writer
      .from("products")
      .select(adminWithVariants)
      .order("created_at", { ascending: false })
      .limit(1000);

    let rows = joined.data || [];
    let variantsEmbedded = !joined.error && rows.some((row) => Array.isArray(row.product_variants));
    if (joined.error || rows.length === 0) {
      if (joined.error) console.error("getAdminProducts joined query error:", joined.error);
      const fallback = await writer
        .from("products")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (fallback.error) {
        console.error("getAdminProducts query error:", fallback.error);
        return [];
      }
      rows = fallback.data || [];
      variantsEmbedded = false;
    }

    const productIds = rows.map((row) => row.id).filter(Boolean);
    const [variantResult, categoryResult, priceResult] = await Promise.all([
      !variantsEmbedded && productIds.length
        ? writer.from("product_variants").select("*").in("product_id", productIds)
        : Promise.resolve({ data: [] as any[], error: null }),
      supabase.from("categories").select("id, slug, name"),
      productIds.length
        ? writer
            .from("products")
            .select("id, price_1_box, price_16_boxes, price_32_boxes, price_64_boxes")
            .in("id", productIds)
        : Promise.resolve({ data: [] as any[], error: null }),
    ]);
    if (variantResult.error) {
      console.error("getAdminProducts variants error:", variantResult.error);
    }
    if (priceResult.error) {
      console.error("getAdminProducts price columns error:", priceResult.error);
    }
    const variantRows = variantResult.data || [];
    const categoryRows = categoryResult.data || [];
    const variantsByProduct = new Map<string, any[]>();
    for (const variant of variantRows || []) {
      const key = String(variant.product_id);
      const list = variantsByProduct.get(key) || [];
      list.push(variant);
      variantsByProduct.set(key, list);
    }
    const pricesById = new Map(
      (priceResult.error ? [] : priceResult.data || []).map((priceRow) => [String(priceRow.id), priceRow])
    );
    const categoriesById = new Map(
      (categoryRows || []).map((category) => [String(category.id), category])
    );

    return rows.map((row) =>
      formatAdminProduct({
        ...row,
        ...(pricesById.get(String(row.id)) || {}),
        categories: categoriesById.get(String(row.category_id)) || null,
        product_variants: variantsEmbedded
          ? row.product_variants || []
          : variantsByProduct.get(String(row.id)) || row.product_variants || [],
      })
    );
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

    const supabase = await getProductWriteClient();
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

    const categoryId = categoryIdForSlug(values.categorySlug);
    const insertPayload = {
      slug,
      title: values.name.trim(),
      name: values.name.trim(),
      storefront_title: values.storefrontTitle?.trim() || null,
      display_name: values.storefrontTitle?.trim() || null,
      part_number: values.partNumber?.trim() || null,
      description: values.description?.trim() || "",
      short_description: (values.description || "").slice(0, 500),
      application: getApplicationForCategory(values.categorySlug),
      gauge: values.gauge ?? null,
      width_inches: values.widthInches ?? null,
      length_feet: values.lengthFeet ?? null,
      rolls_per_box: values.rollsPerBox ?? null,
      roll_weight_lbs: values.rollWeightLbs ?? null,
      pallet_weight_lbs: values.palletWeightLbs ?? null,
      pallet_dimensions: values.palletDimensions?.trim() || null,
      price_usd: values.priceUsd ?? null,
      price_case: values.priceCase ?? null,
      price_half_pallet: values.priceHalfPallet ?? null,
      price_pallet: values.pricePallet ?? null,
      price_6_rolls: values.price6Rolls ?? PACKAGE_TIER_DEFAULTS.price6Rolls,
      price_12_rolls: values.price12Rolls ?? PACKAGE_TIER_DEFAULTS.price12Rolls,
      price_20_rolls: values.price20Rolls ?? PACKAGE_TIER_DEFAULTS.price20Rolls,
      price_40_rolls: values.price40Rolls ?? PACKAGE_TIER_DEFAULTS.price40Rolls,
      ...boxPriceColumnPatch(values.packageTiers),
      stock_quantity: values.stockQuantity ?? 0,
      is_sold_out: values.isSoldOut ?? false,
      is_active: values.isActive ?? true,
      image_url: values.imageUrl || values.images?.[0] || "",
      images: values.images || [],
      category_id: categoryId,
    };

    const { data, error } = await writeProductRow(supabase, "insert", insertPayload);

    if (error || !data) {
      console.error("createProduct insert error:", error);
      return { success: false, error: error?.message || "Failed to create product." };
    }

    const variants = await syncBaseVariant(supabase, data.id, values);
    revalidateProductPaths(data.slug);

    return {
      success: true,
      product: formatAdminProduct({
        ...data,
        title: data.title || values.name,
        categories: { slug: values.categorySlug },
        product_variants: variants,
      }),
    };
  } catch (err: any) {
    console.error("createProduct error:", err);
    return { success: false, error: err?.message || "Failed to create product." };
  }
}

/**
 * Update an existing product's details in Supabase `public.products`.
 */
export async function updateProduct(id: string, values: Partial<ProductFormValues>) {
  const { isAdmin } = await verifyAdmin();
  if (!isAdmin) {
    return { success: false, error: "Unauthorized." };
  }

  try {
    const supabase = await getProductWriteClient();

    const updatePayload: Record<string, any> = {};
    const trimmedName = values.name?.trim();
    if (trimmedName) {
      updatePayload.title = trimmedName;
      updatePayload.name = trimmedName;
    }
    if (values.storefrontTitle !== undefined && values.storefrontTitle.trim()) {
      updatePayload.storefront_title = values.storefrontTitle.trim();
      updatePayload.display_name = values.storefrontTitle.trim();
    }
    if (values.partNumber !== undefined && values.partNumber.trim()) {
      updatePayload.part_number = values.partNumber.trim();
    }
    if (values.description !== undefined && values.description.trim()) {
      updatePayload.description = values.description.trim();
      updatePayload.short_description = values.description.trim().slice(0, 500);
    }
    if (values.application !== undefined) updatePayload.application = values.application;
    if (values.gauge !== undefined && values.gauge !== null) updatePayload.gauge = values.gauge;
    if (values.widthInches !== undefined && values.widthInches !== null) {
      updatePayload.width_inches = values.widthInches;
    }
    if (values.lengthFeet !== undefined && values.lengthFeet !== null) {
      updatePayload.length_feet = values.lengthFeet;
    }
    if (values.rollsPerBox !== undefined && values.rollsPerBox !== null) {
      updatePayload.rolls_per_box = values.rollsPerBox;
    }
    if (values.rollWeightLbs !== undefined && values.rollWeightLbs !== null) {
      updatePayload.roll_weight_lbs = values.rollWeightLbs;
    }
    if (values.palletWeightLbs !== undefined && values.palletWeightLbs !== null) {
      updatePayload.pallet_weight_lbs = values.palletWeightLbs;
    }
    if (values.palletDimensions !== undefined && values.palletDimensions.trim()) {
      updatePayload.pallet_dimensions = values.palletDimensions.trim();
    }
    if (values.priceUsd !== undefined && values.priceUsd !== null) {
      updatePayload.price_usd = values.priceUsd;
      updatePayload.base_unit_price = values.priceUsd;
    }
    if (values.priceCase !== undefined) updatePayload.price_case = values.priceCase;
    if (values.priceHalfPallet !== undefined) updatePayload.price_half_pallet = values.priceHalfPallet;
    if (values.pricePallet !== undefined) updatePayload.price_pallet = values.pricePallet;
    if (values.price6Rolls !== undefined) updatePayload.price_6_rolls = values.price6Rolls;
    if (values.price12Rolls !== undefined) updatePayload.price_12_rolls = values.price12Rolls;
    if (values.price20Rolls !== undefined) updatePayload.price_20_rolls = values.price20Rolls;
    if (values.price40Rolls !== undefined) updatePayload.price_40_rolls = values.price40Rolls;
    Object.assign(updatePayload, boxPriceColumnPatch(values.packageTiers));
    if (values.stockQuantity !== undefined && values.stockQuantity !== null) {
      updatePayload.stock_quantity = values.stockQuantity;
      updatePayload.stock_qty = values.stockQuantity;
    }
    if (values.isSoldOut !== undefined) updatePayload.is_sold_out = values.isSoldOut;
    if (values.isActive !== undefined) updatePayload.is_active = values.isActive;
    if (values.categorySlug !== undefined) {
      const categoryId = categoryIdForSlug(values.categorySlug);
      if (categoryId) updatePayload.category_id = categoryId;
      updatePayload.application = getApplicationForCategory(values.categorySlug);
    }
    if (values.images !== undefined) {
      updatePayload.images = values.images;
      updatePayload.image_url = values.imageUrl || values.images?.[0] || "";
    } else if (values.imageUrl !== undefined) {
      updatePayload.image_url = values.imageUrl;
    }

    const { data, error } = await writeProductRow(
      supabase,
      "update",
      updatePayload,
      id
    );

    if (error) {
      console.error("updateProduct error:", error);
      return { success: false, error: error.message || "Failed to update product." };
    }
    if (!data) {
      return { success: false, error: "Product not found." };
    }

    const variants = await syncBaseVariant(supabase, data.id, values);
    revalidateProductPaths(data.slug);

    return {
      success: true,
      product: formatAdminProduct({
        ...data,
        title: data.title || trimmedName,
        categories: values.categorySlug ? { slug: values.categorySlug } : null,
        product_variants: variants,
      }),
    };
  } catch (err: any) {
    console.error("updateProduct error:", err);
    return { success: false, error: err?.message || "Failed to update product." };
  }
}

/**
 * Toggle a product's active/inactive visibility status.
 * `.select()` returns an array. Asking PostgREST for a single object
 * throws "Cannot coerce the result to a single JSON object" when the
 * representation is empty or has more than one row.
 */
export async function toggleProductActive(id: string, isActive: boolean) {
  const { isAdmin } = await verifyAdmin();
  if (!isAdmin) {
    return { success: false, error: "Unauthorized." };
  }

  try {
    const supabase = await getProductWriteClient();
    const { data, error } = await supabase
      .from("products")
      .update({ is_active: isActive })
      .eq("id", id)
      .select();

    if (error) {
      console.error("toggleProductActive error:", error);
      return {
        success: false,
        error: "Failed to update product status. Please try again.",
      };
    }

    const row = firstRow(data);
    revalidateProductPaths(row?.slug);
    revalidatePath("/admin/products");

    return { success: true, isActive };
  } catch (err: any) {
    console.error("toggleProductActive error:", err);
    return {
      success: false,
      error: "Failed to update product status. Please try again.",
    };
  }
}

export async function toggleProductSoldOut(id: string, isSoldOut: boolean) {
  const { isAdmin } = await verifyAdmin();
  if (!isAdmin) {
    return { success: false, error: "Unauthorized." };
  }

  try {
    const supabase = await getProductWriteClient();
    const { data, error } = await writeProductRow(
      supabase,
      "update",
      { is_sold_out: isSoldOut },
      id
    );

    if (error) {
      console.error("toggleProductSoldOut error:", error);
      return {
        success: false,
        error: "No se pudo actualizar el inventario. Inténtalo de nuevo.",
      };
    }

    revalidateProductPaths(data?.slug);
    return { success: true, isSoldOut };
  } catch (err: any) {
    console.error("toggleProductSoldOut error:", err);
    return {
      success: false,
      error: "No se pudo actualizar el inventario. Inténtalo de nuevo.",
    };
  }
}

/**
 * Permanently delete a product (and its variants, via cascade) from Supabase.
 */
export async function deleteProduct(id: string) {
  const { isAdmin } = await verifyAdmin();
  if (!isAdmin) {
    return { success: false, error: "Unauthorized." };
  }

  try {
    const supabase = await getProductWriteClient();
    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      console.error("deleteProduct error:", error);
      return { success: false, error: error.message || "Failed to delete product." };
    }

    revalidateProductPaths();

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
