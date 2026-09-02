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
    .map((v: any) => ({
      id: Number(v.id),
      productId: Number(v.product_id || v.productId || raw.id),
      sku: String(v.sku || ""),
      packageSize: v.package_size || v.packageSize || null,
      widthInches: String(v.width_inches || v.widthInches || "18.00"),
      gauge: Number(v.gauge || 50),
      lengthFeet: Number(v.length_feet || v.lengthFeet || 1000),
      rollsPerBox: Number(v.rolls_per_box || v.rollsPerBox || 4),
      rollsPerPallet: Number(v.rolls_per_pallet || v.rollsPerPallet || 256),
      weightLbs: String(v.weight_lbs || v.weightLbs || "12.00"),
      priceUsd: String(v.price_usd || v.priceUsd || v.price || "20.71"),
      casePriceUsd: v.case_price_usd ? String(v.case_price_usd) : (v.casePriceUsd ? String(v.casePriceUsd) : null),
      palletPriceUsd: v.pallet_price_usd ? String(v.pallet_price_usd) : (v.palletPriceUsd ? String(v.palletPriceUsd) : null),
      stockStatus: String(v.stock_status || v.stockStatus || "in_stock"),
      createdAt: v.created_at ? new Date(v.created_at) : new Date(),
    }))
    .sort((a, b) => parseFloat(a.priceUsd) - parseFloat(b.priceUsd));

  // Calculate starting base price dynamically as MIN(product_variants.price)
  const minPrice =
    sortedVariants.length > 0
      ? Math.min(...sortedVariants.map((v) => parseFloat(v.priceUsd)))
      : 20.71;

  // Resolve category slug
  const categorySlug =
    raw.category_slug ||
    raw.categorySlug ||
    raw.categories?.slug ||
    raw.category?.slug ||
    (raw.brand?.toLowerCase().includes("elite")
      ? "force-elite"
      : raw.brand?.toLowerCase().includes("genesis")
      ? raw.name?.toLowerCase().includes("hp")
        ? "genesis-high-performance"
        : "genesis-standard"
      : "force-standard");

  const category =
    raw.category ||
    raw.categories ||
    PRODUCT_CATEGORIES.find((c) => c.slug === categorySlug) ||
    PRODUCT_CATEGORIES[0];

  return {
    id: Number(raw.id),
    slug: String(raw.slug),
    name: String(raw.name),
    brand: String(raw.brand || "FORCE"),
    description: String(raw.description || ""),
    shortDescription: String(raw.short_description || raw.shortDescription || ""),
    application: (raw.application as "hand" | "machine") || "hand",
    categorySlug,
    category,
    filmType: String(raw.film_type || raw.filmType || "Cast Co-Extruded Multi-Layer"),
    color: String(raw.color || "Ultra Clear"),
    features: Array.isArray(raw.features) ? raw.features : [],
    techSheetUrl: raw.tech_sheet_url || raw.techSheetUrl || "/docs/plastipac-force-hand-film-specs.pdf",
    imageUrl: String(
      raw.image_url ||
      raw.imageUrl ||
      "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/productos_plastipac_manual.png"
    ),
    images:
      Array.isArray(raw.images) && raw.images.length > 0
        ? raw.images
        : [raw.image_url || raw.imageUrl || "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/productos_plastipac_manual.png"],
    recommendedUsage: raw.recommended_usage || raw.recommendedUsage || null,
    createdAt: raw.created_at ? new Date(raw.created_at) : new Date(),
    updatedAt: raw.updated_at ? new Date(raw.updated_at) : new Date(),
    variants: sortedVariants,
    startingPrice: minPrice,
  };
}

/**
 * Fetch all products joined with categories and product_variants (ordered by price ascending)
 */
export async function getProducts(applicationFilter?: "all" | "hand" | "machine"): Promise<ProductWithVariants[]> {
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
          return data.map(formatProduct);
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
            return flatData.map(formatProduct);
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
  if (applicationFilter && applicationFilter !== "all") {
    return FALLBACK_PRODUCTS.filter((p) => p.application === applicationFilter);
  }
  return FALLBACK_PRODUCTS;
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
