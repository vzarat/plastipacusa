import { db, products, productVariants } from "./index";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

async function seed() {
  console.log("🌱 Starting Plastipac USA database seed...");

  try {
    // Clear existing variants and products
    await db.delete(productVariants);
    await db.delete(products);

    console.log("Cleared existing product and variant records.");

    // 1. FORCE HAND STRETCH FILM
    const [forceFilm] = await db
      .insert(products)
      .values({
        slug: "force-hand-stretch-film",
        name: 'STRETCH FILM 18" X 50 GA X 1000FT',
        brand: "FORCE",
        application: "hand",
        filmType: "Cast Co-Extruded Multi-Layer",
        color: "Ultra Clear",
        shortDescription:
          "Premium industrial cast hand wrap engineered for high load retention, exceptional puncture resistance, and quiet unwind.",
        description:
          "Plastipac FORCE™ Hand Stretch Film is manufactured with cutting-edge multi-layer cast extrusion technology. Engineered specifically for manual pallet wrapping operations, it provides superior cling, maximum puncture resistance on sharp corners, and whisper-quiet release to protect operators from fatigue.",
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
      })
      .returning();

    await db.insert(productVariants).values([
      {
        productId: forceFilm.id,
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
      },
      {
        productId: forceFilm.id,
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
      },
      {
        productId: forceFilm.id,
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
      },
      {
        productId: forceFilm.id,
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
      },
    ]);

    console.log("✅ Seed completed successfully! Inserted FORCE Hand Stretch Film with exact 4 package size variants.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  }
}

seed();
