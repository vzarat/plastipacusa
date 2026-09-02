"use server";

import { ProductWithVariants } from "@/types";
import { FALLBACK_PRODUCTS } from "@/data/mock-products";

export async function getProducts(applicationFilter?: "all" | "hand" | "machine"): Promise<ProductWithVariants[]> {
  try {
    const isConfigured = Boolean(
      process.env.DATABASE_URL &&
      !process.env.DATABASE_URL.includes("[TU_PASSWORD]") &&
      !process.env.DATABASE_URL.includes("[YOUR-PASSWORD]") &&
      !process.env.DATABASE_URL.includes("<password>") &&
      !process.env.DATABASE_URL.includes("postgres:postgres@localhost")
    );

    if (isConfigured) {
      try {
        const { db, products } = await import("@/db");
        const { desc } = await import("drizzle-orm");
        const data = await db.query.products.findMany({
          with: {
            variants: true,
          },
          orderBy: [desc(products.createdAt)],
        });

        if (data && data.length > 0) {
          if (applicationFilter && applicationFilter !== "all") {
            return data.filter((p) => p.application === applicationFilter);
          }
          return data;
        }
      } catch (dbError: any) {
        console.warn("Database query skipped or failed, falling back to local dataset:", dbError?.message || dbError);
      }
    }
  } catch (error: any) {
    console.warn("getProducts encountered error, using fallback products:", error?.message || error);
  }

  if (applicationFilter && applicationFilter !== "all") {
    return FALLBACK_PRODUCTS.filter((p) => p.application === applicationFilter);
  }
  return FALLBACK_PRODUCTS;
}

export async function getProductBySlug(slug: string): Promise<ProductWithVariants | null> {
  try {
    const isConfigured = Boolean(
      process.env.DATABASE_URL &&
      !process.env.DATABASE_URL.includes("[TU_PASSWORD]") &&
      !process.env.DATABASE_URL.includes("[YOUR-PASSWORD]") &&
      !process.env.DATABASE_URL.includes("<password>") &&
      !process.env.DATABASE_URL.includes("postgres:postgres@localhost")
    );

    if (isConfigured) {
      try {
        const { db, products } = await import("@/db");
        const { eq } = await import("drizzle-orm");
        const data = await db.query.products.findFirst({
          where: eq(products.slug, slug),
          with: {
            variants: true,
          },
        });

        if (data) {
          return data;
        }
      } catch (dbError: any) {
        console.warn("Database query skipped or failed, falling back to local dataset:", dbError?.message || dbError);
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
