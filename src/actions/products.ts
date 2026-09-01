"use server";

import { db, products, productVariants, isDbConfigured } from "@/db";
import { eq, desc } from "drizzle-orm";
import { ProductWithVariants } from "@/types";

// Active manual stretch film line
const FALLBACK_PRODUCTS: ProductWithVariants[] = [
  {
    id: 1,
    slug: "force-hand-stretch-film",
    name: 'STRETCH FILM 18" X 50 GA X 1000FT',
    brand: "FORCE",
    application: "hand",
    filmType: "Cast Co-Extruded Multi-Layer",
    color: "Ultra Clear",
    shortDescription: "Premium industrial cast hand wrap engineered for high load retention, exceptional puncture resistance, and quiet unwind.",
    description: "Plastipac FORCE™ Hand Stretch Film is manufactured with cutting-edge multi-layer cast extrusion technology. Engineered specifically for manual pallet wrapping operations, it provides superior cling, maximum puncture resistance on sharp corners, and whisper-quiet release to protect operators from fatigue.",
    features: [
      "High optical clarity for barcode scanning through wrap",
      "One-side cling prevents pallets from sticking together during transit",
      "Differential slip release for effortless dispensing",
      "Ultra-strong puncture & tear resistance for irregular loads",
      "High load retention & maximum stretch recovery for stable pallet freight",
    ],
    techSheetUrl: "/docs/plastipac-force-hand-film-specs.pdf",
    imageUrl: "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/productos_plastipac_manual.png",
    images: [
      "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/productos_plastipac_manual.png",
      "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/CAJA_MANUAL_PLASTIPAC.png",
    ],
    recommendedUsage: "Manual wrapping of B and C type pallet loads, distribution centers, cross-border freight, and warehouse logistics.",
    createdAt: new Date(),
    updatedAt: new Date(),
    variants: [
      {
        id: 1,
        productId: 1,
        sku: "PP-FRC-1850-1B",
        packageSize: "1 BOX WITH 4 ROLLS",
        widthInches: "18.00",
        gauge: 50,
        lengthFeet: 1000,
        rollsPerBox: 4,
        rollsPerPallet: 256,
        weightLbs: "12.00",
        priceUsd: "20.71",
        casePriceUsd: "20.71",
        palletPriceUsd: "1149.49",
        stockStatus: "in_stock",
        createdAt: new Date(),
      },
      {
        id: 2,
        productId: 1,
        sku: "PP-FRC-1850-16B",
        packageSize: "16 BOXES = 64 ROLLS",
        widthInches: "18.00",
        gauge: 50,
        lengthFeet: 1000,
        rollsPerBox: 64,
        rollsPerPallet: 256,
        weightLbs: "192.00",
        priceUsd: "316.70",
        casePriceUsd: "316.70",
        palletPriceUsd: "1149.49",
        stockStatus: "in_stock",
        createdAt: new Date(),
      },
      {
        id: 3,
        productId: 1,
        sku: "PP-FRC-1850-32B",
        packageSize: "32 BOXES = 128 ROLLS (HALF PALLET)",
        widthInches: "18.00",
        gauge: 50,
        lengthFeet: 1000,
        rollsPerBox: 128,
        rollsPerPallet: 256,
        weightLbs: "384.00",
        priceUsd: "604.07",
        casePriceUsd: "604.07",
        palletPriceUsd: "1149.49",
        stockStatus: "in_stock",
        createdAt: new Date(),
      },
      {
        id: 4,
        productId: 1,
        sku: "PP-FRC-1850-64B",
        packageSize: "64 BOXES = 256 ROLLS (FULL PALLET)",
        widthInches: "18.00",
        gauge: 50,
        lengthFeet: 1000,
        rollsPerBox: 256,
        rollsPerPallet: 256,
        weightLbs: "768.00",
        priceUsd: "1149.49",
        casePriceUsd: "1149.49",
        palletPriceUsd: "1149.49",
        stockStatus: "in_stock",
        createdAt: new Date(),
      },
    ],
  },
];

export async function getProducts(applicationFilter?: "all" | "hand" | "machine"): Promise<ProductWithVariants[]> {
  if (isDbConfigured) {
    try {
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
    } catch (error: any) {
      console.warn("Database query skipped or failed, falling back to local dataset:", error?.message || error);
    }
  }

  if (applicationFilter && applicationFilter !== "all") {
    return FALLBACK_PRODUCTS.filter((p) => p.application === applicationFilter);
  }
  return FALLBACK_PRODUCTS;
}

export async function getProductBySlug(slug: string): Promise<ProductWithVariants | null> {
  if (isDbConfigured) {
    try {
      const data = await db.query.products.findFirst({
        where: eq(products.slug, slug),
        with: {
          variants: true,
        },
      });

      if (data) {
        return data;
      }
    } catch (error: any) {
      console.warn("Database query skipped or failed, falling back to local dataset:", error?.message || error);
    }
  }

  return FALLBACK_PRODUCTS.find((p) => p.slug === slug) || null;
}
