"use server";

import { supabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { ProductWithVariants, ProductVariant } from "@/types";
import { FALLBACK_PRODUCTS } from "@/data/mock-products";
import { PRODUCT_CATEGORIES } from "@/data/categories";

/**
 * Format raw Supabase database records into type-safe ProductWithVariants
 * - Maps product_variants and sorts by price ascending
 * - Dynamically computes the starting base price as MIN(product_variants.price)
 * - Joins or attaches parent category metadata
 */
function formatProduct(raw: any): ProductWithVariants {
  const rawVariants = (raw.product_variants || raw.variants || []) as any[];

  // Sort variants by price ascending
  const sortedVariants: ProductVariant[] = rawVariants
    .map((v: any, index: number) => {
      const rollsCount = Number(v.rolls_count || v.rollsCount || v.rolls_per_box || v.rollsPerBox || 4);
      const boxesCount = Number(
        v.boxes_count ||
        v.boxesCount ||
        (v.title || v.package_size || v.packageSize || "").match(/(\d+)\s*BOX/i)?.[1] ||
        (rollsCount <= 4 ? 1 : Math.round(rollsCount / 4))
      );
      const variantTitle = String(v.title || v.package_size || v.packageSize || (boxesCount === 1 ? "1 BOX WITH 4 ROLLS" : `${boxesCount} BOXES = ${rollsCount} ROLLS`));

      return {
        id: String(v.id || v.sku || index),
        productId: Number(v.product_id || v.productId || raw.id),
        sku: String(v.sku || ""),
        title: variantTitle,
        packageSize: variantTitle,
        rollsCount,
        boxesCount,
        rolls_count: rollsCount,
        boxes_count: boxesCount,
        widthInches: String(v.width_inches || v.widthInches || raw.width_inches || "18.00"),
        gauge: Number(v.gauge || raw.gauge || 50),
        lengthFeet: Number(v.length_feet || v.lengthFeet || raw.length_feet || 1000),
        rollsPerBox: rollsCount,
        rollsPerPallet: Number(v.rolls_per_pallet || v.rollsPerPallet || 256),
        weightLbs: String(v.weight_lbs || v.weightLbs || "12.00"),
        priceUsd: String(v.price_usd || v.priceUsd || v.price || "20.71"),
        casePriceUsd: v.case_price_usd ? String(v.case_price_usd) : (v.casePriceUsd ? String(v.casePriceUsd) : null),
        palletPriceUsd: v.pallet_price_usd ? String(v.pallet_price_usd) : (v.palletPriceUsd ? String(v.palletPriceUsd) : null),
        stockStatus: String(v.stock_status || v.stockStatus || "in_stock"),
        createdAt: v.created_at ? new Date(v.created_at) : new Date(),
      };
    })
    .sort((a, b) => parseFloat(a.priceUsd) - parseFloat(b.priceUsd));

  // Resolve category slug and machine film detection
  const brandStr = String(raw.brand || "").toLowerCase();
  const nameStr = String(raw.name || raw.title || "").toLowerCase();
  const slugStr = String(raw.slug || "").toLowerCase();
  const rawCategoryId = String(raw.category_id || raw.categoryId || "");
  const widthNum = Number(raw.width_inches || raw.widthInches || sortedVariants[0]?.widthInches || 0);

  const isGenesis =
    widthNum === 20 ||
    slugStr.includes("20-x") ||
    nameStr.includes('20"') ||
    rawCategoryId === "b0000000-0000-0000-0000-000000000003" ||
    rawCategoryId === "genesis-standard" ||
    raw.category_slug === "genesis-standard" ||
    raw.categorySlug === "genesis-standard" ||
    raw.categories?.slug === "genesis-standard" ||
    brandStr.includes("genesis") ||
    nameStr.includes("genesis") ||
    slugStr.includes("genesis") ||
    raw.application === "machine";

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

  // Calculate starting base price dynamically as MIN(product_variants.price)
  const minPrice =
    sortedVariants.length > 0
      ? Math.min(...sortedVariants.map((v) => parseFloat(v.priceUsd)))
      : isGenesis
      ? 192.44
      : 20.71;

  const categorySlug = isGenesis
    ? nameStr.includes("hp") || slugStr.includes("hp") || nameStr.includes("high-performance") || slugStr.includes("high-performance")
      ? "genesis-high-performance"
      : "genesis-standard"
    : isElite
    ? "force-elite"
    : "force-standard";

  const category =
    raw.category ||
    raw.categories ||
    PRODUCT_CATEGORIES.find((c) => c.slug === categorySlug || c.id === rawCategoryId) ||
    PRODUCT_CATEGORIES[0];

  const title = String(raw.title || raw.name || "STRETCH FILM");

  const defaultImage = isGenesis
    ? "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/AUTOMATIC_STRETCH_FILM.png"
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
    id: Number(raw.id),
    slug: String(raw.slug),
    title,
    name: title,
    brand: String(raw.brand || (isGenesis ? "GENESIS" : "FORCE")),
    description: String(raw.description || ""),
    shortDescription: String(raw.short_description || raw.shortDescription || ""),
    application: isGenesis ? "machine" : (raw.application as "hand" | "machine") || "hand",
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
    variants: sortedVariants,
    startingPrice: minPrice,
    categoryId: rawCategoryId || (categorySlug === "genesis-standard" ? "b0000000-0000-0000-0000-000000000003" : categorySlug === "force-elite" ? "b0000000-0000-0000-0000-000000000002" : "b0000000-0000-0000-0000-000000000001"),
    widthInches: Number(raw.width_inches || raw.widthInches || 0),
    width_inches: String(raw.width_inches || raw.widthInches || sortedVariants[0]?.widthInches || (isGenesis ? "20.00" : "18.00")),
    gauge: Number(raw.gauge || sortedVariants[0]?.gauge || 50),
    length_feet: Number(raw.length_feet || raw.lengthFeet || sortedVariants[0]?.lengthFeet || 1000),
    core_type: String(raw.core_type || raw.coreType || 'Standard 3" Core'),
  };
}

/**
 * Live query to Supabase PostgreSQL selecting only product slugs for static route generation
 */
export async function getProductSlugs(): Promise<{ slug: string }[]> {
  try {
    const { data: products, error } = await supabase
      .from("products")
      .select("slug");

    if (!error && products && products.length > 0) {
      return products
        .filter((product) => Boolean(product.slug))
        .map((product) => ({
          slug: product.slug,
        }));
    }
  } catch (err: any) {
    console.warn("getProductSlugs Supabase query failed, falling back:", err?.message || err);
  }

  const fallback = await getProducts();
  return fallback.map((product) => ({
    slug: product.slug,
  }));
}

/**
 * Fetch all products joined with categories and product_variants across all categories
 * Supports optional applicationFilter and categoryFilter
 */
export async function getProducts(
  applicationFilter?: "all" | "hand" | "machine",
  categoryFilter?: string
): Promise<ProductWithVariants[]> {
  const matchesCategory = (p: ProductWithVariants, filter: string) => {
    if (!filter || filter === "all") return true;
    if (filter === "genesis-standard" || filter === "b0000000-0000-0000-0000-000000000003") {
      return (
        p.categorySlug === "genesis-standard" ||
        p.categoryId === "b0000000-0000-0000-0000-000000000003" ||
        String(p.slug || "").startsWith("stretch-film-20")
      );
    }
    return p.categorySlug === filter || p.categoryId === filter;
  };

  try {
    if (isSupabaseConfigured) {
      // 1. Try relational query with categories and product_variants
      try {
        let query = supabase
          .from("products")
          .select(`
            *,
            categories (*),
            product_variants (*)
          `)
          .order("created_at", { ascending: false });

        if (applicationFilter && applicationFilter !== "all") {
          query = query.eq("application", applicationFilter);
        }

        const { data, error } = await query;

        if (!error && data && data.length > 0) {
          let items = data.map(formatProduct);
          if (categoryFilter && categoryFilter !== "all") {
            items = items.filter((p) => matchesCategory(p, categoryFilter));
          }
          return items;
        }

        // 2. If categories table is not related, fallback to product_variants
        if (error) {
          let flatQuery = supabase
            .from("products")
            .select(`
              *,
              product_variants (*)
            `)
            .order("created_at", { ascending: false });

          if (applicationFilter && applicationFilter !== "all") {
            flatQuery = flatQuery.eq("application", applicationFilter);
          }

          const { data: flatData, error: flatError } = await flatQuery;
          if (!flatError && flatData && flatData.length > 0) {
            let items = flatData.map(formatProduct);
            if (categoryFilter && categoryFilter !== "all") {
              items = items.filter((p) => matchesCategory(p, categoryFilter));
            }
            return items;
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

            let items = combined.map(formatProduct);
            if (applicationFilter && applicationFilter !== "all") {
              items = items.filter((p) => p.application === applicationFilter);
            }
            if (categoryFilter && categoryFilter !== "all") {
              items = items.filter((p) => matchesCategory(p, categoryFilter));
            }
            return items;
          }
        }
      } catch (sbErr: any) {
        console.warn("Supabase query exception, will use fallback data:", sbErr?.message || sbErr);
      }
    }
  } catch (error: any) {
    console.warn("getProducts encountered error, using fallback products:", error?.message || error);
  }

  // Fallback to local catalog
  let items = FALLBACK_PRODUCTS;
  if (applicationFilter && applicationFilter !== "all") {
    items = items.filter((p) => p.application === applicationFilter);
  }
  if (categoryFilter && categoryFilter !== "all") {
    items = items.filter((p) => matchesCategory(p, categoryFilter));
  }
  return items;
}

/**
 * Fetch a single product by slug joined with its parent category and product_variants
 */
export async function getProductBySlug(slug: string): Promise<ProductWithVariants | null> {
  try {
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
          return formatProduct(data);
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
            return formatProduct(flatData);
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

            return formatProduct({
              ...rawProd,
              product_variants: rawVariants || [],
            });
          }
        }
      } catch (sbErr: any) {
        console.warn("Supabase getProductBySlug exception, will use fallback data:", sbErr?.message || sbErr);
      }
    }
  } catch (error: any) {
    console.warn("getProductBySlug encountered error, using fallback:", error?.message || error);
  }

  return (
    FALLBACK_PRODUCTS.find((p) => p.slug === slug) ||
    (slug === "force-hand-stretch-film" ? FALLBACK_PRODUCTS[0] : null) ||
    null
  );
}
