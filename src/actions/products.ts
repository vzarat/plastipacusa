"use server";

import { db, products, productVariants, isDbConfigured } from "@/db";
import { eq, desc } from "drizzle-orm";
import { ProductWithVariants } from "@/types";

// Active manual stretch film line
const FALLBACK_PRODUCTS: ProductWithVariants[] = [
  {
    id: 1,
    slug: "force-hand-stretch-film",
    name: "Force™ Hand Stretch Film",
    brand: "Plastipac USA",
    application: "hand",
    filmType: "Cast Co-Extruded Multi-Layer",
    color: "Ultra Clear",
    shortDescription: "Premium industrial cast hand wrap engineered for high load retention, exceptional puncture resistance, and quiet unwind.",
    description: "Plastipac Force™ Hand Stretch Film is manufactured with cutting-edge multi-layer cast extrusion technology. Engineered specifically for manual pallet wrapping operations, it provides superior cling, maximum puncture resistance on sharp corners, and whisper-quiet release to protect operators from fatigue.",
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
        sku: "PP-FRC-1880-4B",
        widthInches: "18.00",
        gauge: 80,
        lengthFeet: 1500,
        rollsPerBox: 4,
        rollsPerPallet: 192,
        weightLbs: "34.50",
        priceUsd: "19.75",
        casePriceUsd: "79.00",
        palletPriceUsd: "3648.00",
        stockStatus: "in_stock",
        createdAt: new Date(),
      },
      {
        id: 2,
        productId: 1,
        sku: "PP-FRC-1870-4B",
        widthInches: "18.00",
        gauge: 70,
        lengthFeet: 1500,
        rollsPerBox: 4,
        rollsPerPallet: 192,
        weightLbs: "30.20",
        priceUsd: "17.90",
        casePriceUsd: "71.60",
        palletPriceUsd: "3300.00",
        stockStatus: "in_stock",
        createdAt: new Date(),
      },
      {
        id: 3,
        productId: 1,
        sku: "PP-FRC-1860-4B",
        widthInches: "18.00",
        gauge: 60,
        lengthFeet: 2000,
        rollsPerBox: 4,
        rollsPerPallet: 192,
        weightLbs: "34.50",
        priceUsd: "21.50",
        casePriceUsd: "86.00",
        palletPriceUsd: "3950.00",
        stockStatus: "in_stock",
        createdAt: new Date(),
      },
      {
        id: 4,
        productId: 1,
        sku: "PP-FRC-1580-4B",
        widthInches: "15.00",
        gauge: 80,
        lengthFeet: 1500,
        rollsPerBox: 4,
        rollsPerPallet: 256,
        weightLbs: "28.80",
        priceUsd: "16.80",
        casePriceUsd: "67.20",
        palletPriceUsd: "4120.00",
        stockStatus: "in_stock",
        createdAt: new Date(),
      },
      {
        id: 5,
        productId: 1,
        sku: "PP-FRC-1280-4B",
        widthInches: "12.00",
        gauge: 80,
        lengthFeet: 1500,
        rollsPerBox: 4,
        rollsPerPallet: 320,
        weightLbs: "23.00",
        priceUsd: "13.90",
        casePriceUsd: "55.60",
        palletPriceUsd: "4200.00",
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
