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

    // 1. FORCE HAND STRETCH FILM - 50 GAUGE
    const [forceFilm50] = await db
      .insert(products)
      .values({
        slug: "stretch-film-18-x-50-ga-x-1000ft",
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
        imageUrl:
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/productos_plastipac_manual.png",
        images: [
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/productos_plastipac_manual.png",
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/CAJA_MANUAL_PLASTIPAC.png",
        ],
        recommendedUsage:
          "Manual wrapping of B and C type pallet loads, distribution centers, cross-border freight, and warehouse logistics.",
      })
      .returning();

    await db.insert(productVariants).values([
      {
        productId: forceFilm50.id,
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
        productId: forceFilm50.id,
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
        productId: forceFilm50.id,
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
        productId: forceFilm50.id,
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

    // 2. FORCE HAND STRETCH FILM - 60 GAUGE
    const [forceFilm60] = await db
      .insert(products)
      .values({
        slug: "stretch-film-18-x-60-ga-x-1000ft",
        name: 'STRETCH FILM 18" X 60 GA X 1000FT',
        brand: "FORCE",
        application: "hand",
        filmType: "Cast Co-Extruded Multi-Layer",
        color: "Ultra Clear",
        shortDescription:
          "Heavy-duty 60 Gauge industrial cast hand wrap engineered for heavier loads, superior puncture resistance, and secure pallet containment.",
        description:
          "Plastipac FORCE™ Standard 60 Gauge Hand Stretch Film provides elevated load holding strength for heavier pallets and irregular shaped freight. Manufactured with advanced multi-layer cast extrusion, it features superior cling, high puncture resistance on sharp crate corners, and whisper-quiet unwind.",
        features: [
          "Heavy-duty 60 Gauge cast resin formulation for heavier industrial pallet freight",
          "Ultra-strong corner puncture and tear propagation resistance",
          "Optically ultra-clear for swift optical barcode scanning",
          "Differential cling prevents pallets from rubbing together in transit",
          "Whisper-quiet release reduces operator strain in warehouse environments",
        ],
        techSheetUrl: "/docs/plastipac-force-hand-film-specs.pdf",
        imageUrl:
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/productos_plastipac_manual.png",
        images: [
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/productos_plastipac_manual.png",
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/CAJA_MANUAL_PLASTIPAC.png",
        ],
        recommendedUsage:
          "Manual wrapping of heavy industrial loads, irregular crate edges, beverage distribution, and cross-border transport.",
      })
      .returning();

    await db.insert(productVariants).values([
      {
        productId: forceFilm60.id,
        sku: "PP-FRC-1860-1B",
        packageSize: "1 BOX WITH 4 ROLLS",
        widthInches: "18.00",
        gauge: 60,
        lengthFeet: 1000,
        rollsPerBox: 4,
        rollsPerPallet: 256,
        weightLbs: "14.40",
        priceUsd: "24.85",
        casePriceUsd: "24.85",
        palletPriceUsd: "1379.38",
        stockStatus: "in_stock",
      },
      {
        productId: forceFilm60.id,
        sku: "PP-FRC-1860-16B",
        packageSize: "16 BOXES = 64 ROLLS",
        widthInches: "18.00",
        gauge: 60,
        lengthFeet: 1000,
        rollsPerBox: 64,
        rollsPerPallet: 256,
        weightLbs: "230.40",
        priceUsd: "380.03",
        casePriceUsd: "380.03",
        palletPriceUsd: "1379.38",
        stockStatus: "in_stock",
      },
      {
        productId: forceFilm60.id,
        sku: "PP-FRC-1860-32B",
        packageSize: "32 BOXES = 128 ROLLS (HALF PALLET)",
        widthInches: "18.00",
        gauge: 60,
        lengthFeet: 1000,
        rollsPerBox: 128,
        rollsPerPallet: 256,
        weightLbs: "460.80",
        priceUsd: "724.88",
        casePriceUsd: "724.88",
        palletPriceUsd: "1379.38",
        stockStatus: "in_stock",
      },
      {
        productId: forceFilm60.id,
        sku: "PP-FRC-1860-64B",
        packageSize: "64 BOXES = 256 ROLLS (FULL PALLET)",
        widthInches: "18.00",
        gauge: 60,
        lengthFeet: 1000,
        rollsPerBox: 256,
        rollsPerPallet: 256,
        weightLbs: "921.60",
        priceUsd: "1379.38",
        casePriceUsd: "1379.38",
        palletPriceUsd: "1379.38",
        stockStatus: "in_stock",
      },
    ]);

    // 3. FORCE HAND STRETCH FILM - 70 GAUGE
    const [forceFilm70] = await db
      .insert(products)
      .values({
        slug: "stretch-film-18-x-70-ga-x-1000ft",
        name: 'STRETCH FILM 18" X 70 GA X 1000FT',
        brand: "FORCE",
        application: "hand",
        filmType: "Cast Co-Extruded Multi-Layer",
        color: "Ultra Clear",
        shortDescription:
          "Extra heavy-duty 70 Gauge industrial cast hand wrap engineered for severe freight demands, maximum puncture resistance, and heavy pallet containment.",
        description:
          "Plastipac FORCE™ Standard 70 Gauge Hand Stretch Film is formulated for maximum load-holding security on the heaviest and most abrasive pallets. Engineered with advanced multi-layer cast extrusion technology, it delivers extreme puncture resistance, sharp-corner durability, high cling tension, and silent unwind to handle rigorous transport challenges.",
        features: [
          "Extra heavy-duty 70 Gauge cast resin formulation for demanding pallet freight",
          "Maximum puncture resistance against sharp crate corners and jagged pallet edges",
          "Optically ultra-clear for effortless barcode scanning and inventory tracking",
          "Superior cling retention keeps pallet loads bonded securely without unraveling",
          "Whisper-quiet release eliminates warehouse noise and minimizes operator fatigue",
        ],
        techSheetUrl: "/docs/plastipac-force-hand-film-specs.pdf",
        imageUrl:
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/productos_plastipac_manual.png",
        images: [
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/productos_plastipac_manual.png",
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/CAJA_MANUAL_PLASTIPAC.png",
        ],
        recommendedUsage:
          "Manual wrapping of heavy industrial machinery, bricks/building materials, metal components, and heavy-duty logistics freight.",
      })
      .returning();

    console.log(`Created product: ${forceFilm70.name} (ID: ${forceFilm70.id})`);

    // Insert 4 Tiers for 70 Gauge Hand Wrap
    await db.insert(productVariants).values([
      {
        productId: forceFilm70.id,
        sku: "PP-FRC-1870-1B",
        packageSize: "1 BOX WITH 4 ROLLS",
        widthInches: "18.00",
        gauge: 70,
        lengthFeet: 1000,
        rollsPerBox: 4,
        rollsPerPallet: 256,
        weightLbs: "16.80",
        priceUsd: "28.99",
        casePriceUsd: "28.99",
        palletPriceUsd: "1609.28",
        stockStatus: "in_stock",
      },
      {
        productId: forceFilm70.id,
        sku: "PP-FRC-1870-16B",
        packageSize: "16 BOXES = 64 ROLLS",
        widthInches: "18.00",
        gauge: 70,
        lengthFeet: 1000,
        rollsPerBox: 64,
        rollsPerPallet: 256,
        weightLbs: "268.80",
        priceUsd: "443.37",
        casePriceUsd: "443.37",
        palletPriceUsd: "1609.28",
        stockStatus: "in_stock",
      },
      {
        productId: forceFilm70.id,
        sku: "PP-FRC-1870-32B",
        packageSize: "32 BOXES = 128 ROLLS (HALF PALLET)",
        widthInches: "18.00",
        gauge: 70,
        lengthFeet: 1000,
        rollsPerBox: 128,
        rollsPerPallet: 256,
        weightLbs: "537.60",
        priceUsd: "845.69",
        casePriceUsd: "845.69",
        palletPriceUsd: "1609.28",
        stockStatus: "in_stock",
      },
      {
        productId: forceFilm70.id,
        sku: "PP-FRC-1870-64B",
        packageSize: "64 BOXES = 256 ROLLS (FULL PALLET)",
        widthInches: "18.00",
        gauge: 70,
        lengthFeet: 1000,
        rollsPerBox: 256,
        rollsPerPallet: 256,
        weightLbs: "1075.20",
        priceUsd: "1609.28",
        casePriceUsd: "1609.28",
        palletPriceUsd: "1609.28",
        stockStatus: "in_stock",
      },
    ]);

    console.log(
      "✅ Seed completed successfully! Inserted FORCE Standard (50 GA, 60 GA, and 70 GA) with exact 4-tier package pricing."
    );
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  }
}

seed();
