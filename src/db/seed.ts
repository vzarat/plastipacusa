import { and, eq, sql } from "drizzle-orm";
import { db, products, productVariants } from "./index";
import { MANUAL_FILM_OFFICIAL_RATES } from "@/lib/manual-film-rates";
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

    // 1. FORCE HAND STRETCH FILM - 60 GAUGE
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
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PRODUCTOS/CAJA_MANUAL_PLASTIPAC.png",
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PRODUCTOS/FICHA%20TECNICA.png",
        ],
        recommendedUsage:
          "Manual wrapping of heavy industrial loads, irregular crate edges, beverage distribution, and U.S. freight transport.",
      })
      .returning();

    await db.insert(productVariants).values([
      {
        productId: forceFilm60.id,
        sku: "STD-SF186010-1B",
        packageSize: "1 BOX WITH 4 ROLLS",
        widthInches: "18.00",
        gauge: 60,
        lengthFeet: 1000,
        rollsPerBox: 4,
        rollsPerPallet: 192,
        weightLbs: "14.40",
        priceUsd: "24.98",
        casePriceUsd: "24.98",
        palletPriceUsd: "1145.28",
        stockStatus: "in_stock",
      },
      {
        productId: forceFilm60.id,
        sku: "STD-SF186010-64B",
        packageSize: "Full Pallet · 48 Boxes (192 Rolls)",
        widthInches: "18.00",
        gauge: 60,
        lengthFeet: 1000,
        rollsPerBox: 4,
        rollsPerPallet: 192,
        weightLbs: "921.60",
        priceUsd: "23.86",
        casePriceUsd: "1145.28",
        palletPriceUsd: "1145.28",
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
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PRODUCTOS/CAJA_MANUAL_PLASTIPAC.png",
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PRODUCTOS/FICHA%20TECNICA.png",
        ],
        recommendedUsage:
          "Manual wrapping of heavy industrial machinery, bricks/building materials, metal components, and heavy-duty logistics freight.",
      })
      .returning();

    console.log(`Created product: ${forceFilm70.name} (ID: ${forceFilm70.id})`);

    // 1 Box + Full Pallet (48×192) for 70 Gauge Hand Wrap
    await db.insert(productVariants).values([
      {
        productId: forceFilm70.id,
        sku: "STD-SF187010-1B",
        packageSize: "1 BOX WITH 4 ROLLS",
        widthInches: "18.00",
        gauge: 70,
        lengthFeet: 1000,
        rollsPerBox: 4,
        rollsPerPallet: 192,
        weightLbs: "16.80",
        priceUsd: "28.65",
        casePriceUsd: "28.65",
        palletPriceUsd: "1312.32",
        stockStatus: "in_stock",
      },
      {
        productId: forceFilm70.id,
        sku: "STD-SF187010-64B",
        packageSize: "Full Pallet · 48 Boxes (192 Rolls)",
        widthInches: "18.00",
        gauge: 70,
        lengthFeet: 1000,
        rollsPerBox: 4,
        rollsPerPallet: 192,
        weightLbs: "1075.20",
        priceUsd: "27.34",
        casePriceUsd: "1312.32",
        palletPriceUsd: "1312.32",
        stockStatus: "in_stock",
      },
    ]);

    // 4. FORCE HAND STRETCH FILM - 80 GAUGE
    const [forceFilm80] = await db
      .insert(products)
      .values({
        slug: "stretch-film-18-x-80-ga-x-1000ft",
        name: 'STRETCH FILM 18" X 80 GA X 1000FT',
        brand: "FORCE",
        application: "hand",
        filmType: "Cast Co-Extruded Multi-Layer",
        color: "Ultra Clear",
        shortDescription:
          "Maximum-strength 80 Gauge industrial cast hand wrap engineered for extreme pallet holding capacity, severe sharp corner resistance, and uncompromising load security.",
        description:
          "Plastipac FORCE™ Standard 80 Gauge Hand Stretch Film delivers maximum containment force for the most demanding commercial and industrial freight. Manufactured with advanced multi-layer cast extrusion technology, it provides maximum resistance against tearing, extreme puncture durability across irregular and sharp-cornered loads, aggressive cling retention, and silent operator-friendly unwind.",
        features: [
          "Maximum-strength 80 Gauge cast resin formulation for extreme industrial freight loads",
          "Superior puncture durability engineered for jagged pallet edges, metal, and building materials",
          "Optically ultra-clear cast clarity for fast optical barcode and SKU scanning",
          "High-tension cling retention keeps oversized and heavy pallets bonded securely in transit",
          "Whisper-quiet release eliminates warehouse acoustic strain and operator fatigue",
        ],
        techSheetUrl: "/docs/plastipac-force-hand-film-specs.pdf",
        imageUrl:
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/productos_plastipac_manual.png",
        images: [
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/productos_plastipac_manual.png",
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PRODUCTOS/CAJA_MANUAL_PLASTIPAC.png",
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PRODUCTOS/FICHA%20TECNICA.png",
        ],
        recommendedUsage:
          "Manual wrapping of extreme-weight pallets, steel drums, heavy machinery, bagged concrete/cement, and rough export freight.",
      })
      .returning();

    console.log(`Created product: ${forceFilm80.name} (ID: ${forceFilm80.id})`);

    // 1 Box + Full Pallet (48×192) for 80 Gauge Hand Wrap
    await db.insert(productVariants).values([
      {
        productId: forceFilm80.id,
        sku: "STD-SF188010-1B",
        packageSize: "1 BOX WITH 4 ROLLS",
        widthInches: "18.00",
        gauge: 80,
        lengthFeet: 1000,
        rollsPerBox: 4,
        rollsPerPallet: 192,
        weightLbs: "19.20",
        priceUsd: "32.31",
        casePriceUsd: "32.31",
        palletPriceUsd: "1479.36",
        stockStatus: "in_stock",
      },
      {
        productId: forceFilm80.id,
        sku: "STD-SF188010-64B",
        packageSize: "Full Pallet · 48 Boxes (192 Rolls)",
        widthInches: "18.00",
        gauge: 80,
        lengthFeet: 1000,
        rollsPerBox: 4,
        rollsPerPallet: 192,
        weightLbs: "1228.80",
        priceUsd: "30.82",
        casePriceUsd: "1479.36",
        palletPriceUsd: "1479.36",
        stockStatus: "in_stock",
      },
    ]);

    // 5. FORCE HAND STRETCH FILM - 60 GAUGE X 1500FT
    const [forceFilm60_15] = await db
      .insert(products)
      .values({
        slug: "stretch-film-18-x-60-ga-x-1500ft",
        name: 'STRETCH FILM 18" X 60 GA X 1500FT',
        brand: "FORCE",
        application: "hand",
        filmType: "Cast Co-Extruded Multi-Layer",
        color: "Ultra Clear",
        shortDescription:
          "Extended-length 1500FT 60 Gauge heavy-duty industrial cast hand wrap engineered for heavier pallets and reduced roll change downtime.",
        description:
          "Plastipac FORCE™ Standard 60 Gauge 1500FT Hand Stretch Film provides elevated puncture resistance and load-holding force with 1500 feet of continuous cast film. Ideal for wrapping heavier carton stacks and irregular freight with fewer roll changes.",
        features: [
          "Extended 1500 FT roll length for increased warehouse efficiency",
          "Heavy-duty 60 Gauge cast resin formulation for secure pallet containment",
          "High corner tear resistance on sharp edges and corrugated corners",
          "Optically clear formulation for effortless optical inventory scanning",
          "Quiet unwind release reduces noise pollution in packing facilities",
        ],
        techSheetUrl: "/docs/plastipac-force-hand-film-specs.pdf",
        imageUrl:
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/productos_plastipac_manual.png",
        images: [
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/productos_plastipac_manual.png",
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PRODUCTOS/CAJA_MANUAL_PLASTIPAC.png",
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PRODUCTOS/FICHA%20TECNICA.png",
        ],
        recommendedUsage:
          "Manual wrapping of heavy industrial loads, irregular crate edges, beverage distribution, and U.S. freight transport.",
      })
      .returning();

    await db.insert(productVariants).values([
      {
        productId: forceFilm60_15.id,
        sku: "STD-SF186015-1B",
        packageSize: "1 BOX WITH 4 ROLLS",
        widthInches: "18.00",
        gauge: 60,
        lengthFeet: 1500,
        rollsPerBox: 4,
        rollsPerPallet: 192,
        weightLbs: "21.60",
        priceUsd: "35.98",
        casePriceUsd: "35.98",
        palletPriceUsd: "1645.92",
        stockStatus: "in_stock",
      },
      {
        productId: forceFilm60_15.id,
        sku: "STD-SF186015-64B",
        packageSize: "Full Pallet · 48 Boxes (192 Rolls)",
        widthInches: "18.00",
        gauge: 60,
        lengthFeet: 1500,
        rollsPerBox: 4,
        rollsPerPallet: 192,
        weightLbs: "1382.40",
        priceUsd: "34.29",
        casePriceUsd: "1645.92",
        palletPriceUsd: "1645.92",
        stockStatus: "in_stock",
      },
    ]);

    // 7. FORCE HAND STRETCH FILM - 70 GAUGE X 1500FT
    const [forceFilm70_15] = await db
      .insert(products)
      .values({
        slug: "stretch-film-18-x-70-ga-x-1500ft",
        name: 'STRETCH FILM 18" X 70 GA X 1500FT',
        brand: "FORCE",
        application: "hand",
        filmType: "Cast Co-Extruded Multi-Layer",
        color: "Ultra Clear",
        shortDescription:
          "Extended-length 1500FT 70 Gauge extra heavy-duty industrial cast hand wrap built for severe freight and abrasive load containment.",
        description:
          "Plastipac FORCE™ Standard 70 Gauge 1500FT Hand Stretch Film combines extreme durability with an extended 1500-foot yield. Formulated for heavy freight demands, high tension retention, and maximum corner tear protection.",
        features: [
          "Extended 1500 FT roll length for extra packaging throughput",
          "Extra heavy-duty 70 Gauge resin formulation for rigorous freight holding",
          "Superior puncture durability against jagged pallet edges and metal containers",
          "Optically clear film ensures seamless barcode scanning",
          "Whisper-quiet release eliminates warehouse acoustic strain",
        ],
        techSheetUrl: "/docs/plastipac-force-hand-film-specs.pdf",
        imageUrl:
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/productos_plastipac_manual.png",
        images: [
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/productos_plastipac_manual.png",
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PRODUCTOS/CAJA_MANUAL_PLASTIPAC.png",
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PRODUCTOS/FICHA%20TECNICA.png",
        ],
        recommendedUsage:
          "Manual wrapping of heavy industrial machinery, bricks/building materials, metal components, and heavy-duty logistics freight.",
      })
      .returning();

    await db.insert(productVariants).values([
      {
        productId: forceFilm70_15.id,
        sku: "STD-SF187015-1B",
        packageSize: "1 BOX WITH 4 ROLLS",
        widthInches: "18.00",
        gauge: 70,
        lengthFeet: 1500,
        rollsPerBox: 4,
        rollsPerPallet: 192,
        weightLbs: "25.20",
        priceUsd: "41.47",
        casePriceUsd: "41.47",
        palletPriceUsd: "1896.48",
        stockStatus: "in_stock",
      },
      {
        productId: forceFilm70_15.id,
        sku: "STD-SF187015-64B",
        packageSize: "Full Pallet · 48 Boxes (192 Rolls)",
        widthInches: "18.00",
        gauge: 70,
        lengthFeet: 1500,
        rollsPerBox: 4,
        rollsPerPallet: 192,
        weightLbs: "1612.80",
        priceUsd: "39.51",
        casePriceUsd: "1896.48",
        palletPriceUsd: "1896.48",
        stockStatus: "in_stock",
      },
    ]);

    // 8. FORCE HAND STRETCH FILM - 80 GAUGE X 1500FT
    const [forceFilm80_15] = await db
      .insert(products)
      .values({
        slug: "stretch-film-18-x-80-ga-x-1500ft",
        name: 'STRETCH FILM 18" X 80 GA X 1500FT',
        brand: "FORCE",
        application: "hand",
        filmType: "Cast Co-Extruded Multi-Layer",
        color: "Ultra Clear",
        shortDescription:
          "Extended-length 1500FT 80 Gauge maximum-strength industrial cast hand wrap built for extreme weight containment and sharp corner puncture resistance.",
        description:
          "Plastipac FORCE™ Standard 80 Gauge 1500FT Hand Stretch Film delivers maximum containment force and 1500 feet of industrial cast stretch film. Engineered for the heaviest, most demanding loads, steel drums, and abrasive industrial freight.",
        features: [
          "Extended 1500 FT roll length provides maximum wrapping coverage with fewer changeovers",
          "Maximum-strength 80 Gauge cast resin formulation for extreme industrial freight",
          "Extreme puncture durability engineered for jagged pallet edges, metal, and building materials",
          "Optically ultra-clear cast clarity for fast optical barcode and SKU scanning",
          "Whisper-quiet release eliminates warehouse acoustic strain and operator fatigue",
        ],
        techSheetUrl: "/docs/plastipac-force-hand-film-specs.pdf",
        imageUrl:
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/productos_plastipac_manual.png",
        images: [
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/productos_plastipac_manual.png",
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PRODUCTOS/CAJA_MANUAL_PLASTIPAC.png",
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PRODUCTOS/FICHA%20TECNICA.png",
        ],
        recommendedUsage:
          "Manual wrapping of extreme-weight pallets, steel drums, heavy machinery, bagged concrete/cement, and rough export freight.",
      })
      .returning();

    await db.insert(productVariants).values([
      {
        productId: forceFilm80_15.id,
        sku: "STD-SF188015-1B",
        packageSize: "1 BOX WITH 4 ROLLS",
        widthInches: "18.00",
        gauge: 80,
        lengthFeet: 1500,
        rollsPerBox: 4,
        rollsPerPallet: 192,
        weightLbs: "28.80",
        priceUsd: "46.97",
        casePriceUsd: "46.97",
        palletPriceUsd: "2146.56",
        stockStatus: "in_stock",
      },
      {
        productId: forceFilm80_15.id,
        sku: "STD-SF188015-64B",
        packageSize: "Full Pallet · 48 Boxes (192 Rolls)",
        widthInches: "18.00",
        gauge: 80,
        lengthFeet: 1500,
        rollsPerBox: 4,
        rollsPerPallet: 192,
        weightLbs: "1843.20",
        priceUsd: "44.72",
        casePriceUsd: "2146.56",
        palletPriceUsd: "2146.56",
        stockStatus: "in_stock",
      },
    ]);

    const freightSpecs = [
      { slug: "stretch-film-18-x-60-ga-x-1000ft", gauge: 60, lengthFeet: 1000, roll: "6.15", box: "21.68", pallet: "1416.88" },
      { slug: "stretch-film-18-x-70-ga-x-1000ft", gauge: 70, lengthFeet: 1000, roll: "6.88", box: "27.51", pallet: "1789.82" },
      { slug: "stretch-film-18-x-80-ga-x-1000ft", gauge: 80, lengthFeet: 1000, roll: "8.66", box: "34.65", pallet: "2240.20" },
      { slug: "stretch-film-18-x-60-ga-x-1500ft", gauge: 60, lengthFeet: 1500, roll: "7.61", box: "30.37", pallet: "1973.00" },
      { slug: "stretch-film-18-x-70-ga-x-1500ft", gauge: 70, lengthFeet: 1500, roll: "8.69", box: "34.74", pallet: "2252.54" },
      { slug: "stretch-film-18-x-80-ga-x-1500ft", gauge: 80, lengthFeet: 1500, roll: "9.77", box: "40.06", pallet: "2525.13" },
    ] as const;
    for (const spec of freightSpecs) {
      await db
        .update(products)
        .set({
          rollWeightLbs: spec.roll,
          palletWeightLbs: spec.pallet,
          palletDimensions: "48 x 48 x 78",
        })
        .where(eq(products.slug, spec.slug));
      await db
        .update(productVariants)
        .set({
          rollWeightLbs: spec.roll,
          boxWeightLbs: spec.box,
          palletWeightLbs: spec.pallet,
        })
        .where(
          and(
            eq(productVariants.gauge, spec.gauge),
            eq(productVariants.lengthFeet, spec.lengthFeet),
            eq(productVariants.widthInches, "18.00")
          )
        );
    }


    // Official Manual 2-tier rates on product columns (per box).
    for (const rate of MANUAL_FILM_OFFICIAL_RATES) {
      await db
        .update(products)
        .set({
          widthInches: rate.widthInches.toFixed(2),
          gauge: rate.gauge,
          lengthFeet: String(rate.lengthFeet),
          boxesPerPallet: 48,
          price1Box: rate.price1Box.toFixed(2),
          price16Boxes: null,
          price32Boxes: null,
          price64Boxes: rate.priceFullPalletBox.toFixed(2),
          priceUsd: rate.priceFullPalletBox.toFixed(2),
          pricePallet: rate.fullPalletTotal.toFixed(2),
        })
        .where(eq(products.slug, rate.slug));
    }

    await db
      .update(productVariants)
      .set({ boxWeightLbs: "25.13", palletWeightLbs: "1637.50" })
      .where(sql`${productVariants.sku} ILIKE 'FEL-156010%'`);
    await db
      .update(products)
      .set({ palletWeightLbs: "1637.50" })
      .where(
        sql`${products.slug} = 'stretch-film-15-x-60-ga-x-1000ft' OR ${products.partNumber} ILIKE 'FEL-156010%'`
      );

    console.log(
      "✅ Seed completed successfully! Seeded FORCE Manual products with official 1-box + full-pallet (48×192) per-box rates."
    );
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  }
}

seed();
