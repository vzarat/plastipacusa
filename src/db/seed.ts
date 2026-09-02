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
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/CAJA_MANUAL_PLASTIPAC.png",
        ],
        recommendedUsage:
          "Manual wrapping of extreme-weight pallets, steel drums, heavy machinery, bagged concrete/cement, and rough export freight.",
      })
      .returning();

    console.log(`Created product: ${forceFilm80.name} (ID: ${forceFilm80.id})`);

    // Insert 4 Tiers for 80 Gauge Hand Wrap
    await db.insert(productVariants).values([
      {
        productId: forceFilm80.id,
        sku: "PP-FRC-1880-1B",
        packageSize: "1 BOX WITH 4 ROLLS",
        widthInches: "18.00",
        gauge: 80,
        lengthFeet: 1000,
        rollsPerBox: 4,
        rollsPerPallet: 256,
        weightLbs: "19.20",
        priceUsd: "33.14",
        casePriceUsd: "33.14",
        palletPriceUsd: "1839.18",
        stockStatus: "in_stock",
      },
      {
        productId: forceFilm80.id,
        sku: "PP-FRC-1880-16B",
        packageSize: "16 BOXES = 64 ROLLS",
        widthInches: "18.00",
        gauge: 80,
        lengthFeet: 1000,
        rollsPerBox: 64,
        rollsPerPallet: 256,
        weightLbs: "307.20",
        priceUsd: "506.71",
        casePriceUsd: "506.71",
        palletPriceUsd: "1839.18",
        stockStatus: "in_stock",
      },
      {
        productId: forceFilm80.id,
        sku: "PP-FRC-1880-32B",
        packageSize: "32 BOXES = 128 ROLLS (HALF PALLET)",
        widthInches: "18.00",
        gauge: 80,
        lengthFeet: 1000,
        rollsPerBox: 128,
        rollsPerPallet: 256,
        weightLbs: "614.40",
        priceUsd: "966.51",
        casePriceUsd: "966.51",
        palletPriceUsd: "1839.18",
        stockStatus: "in_stock",
      },
      {
        productId: forceFilm80.id,
        sku: "PP-FRC-1880-64B",
        packageSize: "64 BOXES = 256 ROLLS (FULL PALLET)",
        widthInches: "18.00",
        gauge: 80,
        lengthFeet: 1000,
        rollsPerBox: 256,
        rollsPerPallet: 256,
        weightLbs: "1228.80",
        priceUsd: "1839.18",
        casePriceUsd: "1839.18",
        palletPriceUsd: "1839.18",
        stockStatus: "in_stock",
      },
    ]);

    // 5. FORCE HAND STRETCH FILM - 50 GAUGE X 1500FT
    const [forceFilm50_15] = await db
      .insert(products)
      .values({
        slug: "stretch-film-18-x-50-ga-x-1500ft",
        name: 'STRETCH FILM 18" X 50 GA X 1500FT',
        brand: "FORCE",
        application: "hand",
        filmType: "Cast Co-Extruded Multi-Layer",
        color: "Ultra Clear",
        shortDescription:
          "Extended-length 1500FT 50 Gauge industrial cast hand wrap delivering high roll yield, exceptional economy, and puncture resistance.",
        description:
          "Plastipac FORCE™ Standard 50 Gauge 1500FT Hand Stretch Film provides an extended 1500-foot roll length for maximum wrapping yield per roll and fewer changeovers. Engineered with multi-layer cast extrusion technology, it offers superior tensile stability, excellent corner cling, and effortless unwind.",
        features: [
          "Extended 1500 FT roll length for 50% more pallet wraps per roll",
          "High-yield 50 Gauge cast resin formulation for maximum economy",
          "Ultra-clear transparency for instantaneous barcode scanning",
          "Superior cling retention keeps pallet loads bonded without unraveling",
          "Whisper-quiet release minimizes warehouse operator fatigue",
        ],
        techSheetUrl: "/docs/plastipac-force-hand-film-specs.pdf",
        imageUrl:
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/productos_plastipac_manual.png",
        images: [
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/productos_plastipac_manual.png",
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/CAJA_MANUAL_PLASTIPAC.png",
        ],
        recommendedUsage:
          "Manual pallet wrapping in high-volume distribution centers, warehouse shipping, and general logistics.",
      })
      .returning();

    await db.insert(productVariants).values([
      {
        productId: forceFilm50_15.id,
        sku: "PP-FRC-1850-15-1B",
        packageSize: "1 BOX WITH 4 ROLLS",
        widthInches: "18.00",
        gauge: 50,
        lengthFeet: 1500,
        rollsPerBox: 4,
        rollsPerPallet: 256,
        weightLbs: "18.00",
        priceUsd: "31.06",
        casePriceUsd: "31.06",
        palletPriceUsd: "1724.23",
        stockStatus: "in_stock",
      },
      {
        productId: forceFilm50_15.id,
        sku: "PP-FRC-1850-15-16B",
        packageSize: "16 BOXES = 64 ROLLS",
        widthInches: "18.00",
        gauge: 50,
        lengthFeet: 1500,
        rollsPerBox: 64,
        rollsPerPallet: 256,
        weightLbs: "288.00",
        priceUsd: "475.04",
        casePriceUsd: "475.04",
        palletPriceUsd: "1724.23",
        stockStatus: "in_stock",
      },
      {
        productId: forceFilm50_15.id,
        sku: "PP-FRC-1850-15-32B",
        packageSize: "32 BOXES = 128 ROLLS (HALF PALLET)",
        widthInches: "18.00",
        gauge: 50,
        lengthFeet: 1500,
        rollsPerBox: 128,
        rollsPerPallet: 256,
        weightLbs: "576.00",
        priceUsd: "906.10",
        casePriceUsd: "906.10",
        palletPriceUsd: "1724.23",
        stockStatus: "in_stock",
      },
      {
        productId: forceFilm50_15.id,
        sku: "PP-FRC-1850-15-64B",
        packageSize: "64 BOXES = 256 ROLLS (FULL PALLET)",
        widthInches: "18.00",
        gauge: 50,
        lengthFeet: 1500,
        rollsPerBox: 256,
        rollsPerPallet: 256,
        weightLbs: "1152.00",
        priceUsd: "1724.23",
        casePriceUsd: "1724.23",
        palletPriceUsd: "1724.23",
        stockStatus: "in_stock",
      },
    ]);

    // 6. FORCE HAND STRETCH FILM - 60 GAUGE X 1500FT
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
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/CAJA_MANUAL_PLASTIPAC.png",
        ],
        recommendedUsage:
          "Manual wrapping of heavy industrial loads, irregular crate edges, beverage distribution, and cross-border transport.",
      })
      .returning();

    await db.insert(productVariants).values([
      {
        productId: forceFilm60_15.id,
        sku: "PP-FRC-1860-15-1B",
        packageSize: "1 BOX WITH 4 ROLLS",
        widthInches: "18.00",
        gauge: 60,
        lengthFeet: 1500,
        rollsPerBox: 4,
        rollsPerPallet: 256,
        weightLbs: "21.60",
        priceUsd: "37.28",
        casePriceUsd: "37.28",
        palletPriceUsd: "2069.08",
        stockStatus: "in_stock",
      },
      {
        productId: forceFilm60_15.id,
        sku: "PP-FRC-1860-15-16B",
        packageSize: "16 BOXES = 64 ROLLS",
        widthInches: "18.00",
        gauge: 60,
        lengthFeet: 1500,
        rollsPerBox: 64,
        rollsPerPallet: 256,
        weightLbs: "345.60",
        priceUsd: "570.05",
        casePriceUsd: "570.05",
        palletPriceUsd: "2069.08",
        stockStatus: "in_stock",
      },
      {
        productId: forceFilm60_15.id,
        sku: "PP-FRC-1860-15-32B",
        packageSize: "32 BOXES = 128 ROLLS (HALF PALLET)",
        widthInches: "18.00",
        gauge: 60,
        lengthFeet: 1500,
        rollsPerBox: 128,
        rollsPerPallet: 256,
        weightLbs: "691.20",
        priceUsd: "1087.32",
        casePriceUsd: "1087.32",
        palletPriceUsd: "2069.08",
        stockStatus: "in_stock",
      },
      {
        productId: forceFilm60_15.id,
        sku: "PP-FRC-1860-15-64B",
        packageSize: "64 BOXES = 256 ROLLS (FULL PALLET)",
        widthInches: "18.00",
        gauge: 60,
        lengthFeet: 1500,
        rollsPerBox: 256,
        rollsPerPallet: 256,
        weightLbs: "1382.40",
        priceUsd: "2069.08",
        casePriceUsd: "2069.08",
        palletPriceUsd: "2069.08",
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
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/CAJA_MANUAL_PLASTIPAC.png",
        ],
        recommendedUsage:
          "Manual wrapping of heavy industrial machinery, bricks/building materials, metal components, and heavy-duty logistics freight.",
      })
      .returning();

    await db.insert(productVariants).values([
      {
        productId: forceFilm70_15.id,
        sku: "PP-FRC-1870-15-1B",
        packageSize: "1 BOX WITH 4 ROLLS",
        widthInches: "18.00",
        gauge: 70,
        lengthFeet: 1500,
        rollsPerBox: 4,
        rollsPerPallet: 256,
        weightLbs: "25.20",
        priceUsd: "43.49",
        casePriceUsd: "43.49",
        palletPriceUsd: "2413.92",
        stockStatus: "in_stock",
      },
      {
        productId: forceFilm70_15.id,
        sku: "PP-FRC-1870-15-16B",
        packageSize: "16 BOXES = 64 ROLLS",
        widthInches: "18.00",
        gauge: 70,
        lengthFeet: 1500,
        rollsPerBox: 64,
        rollsPerPallet: 256,
        weightLbs: "403.20",
        priceUsd: "665.06",
        casePriceUsd: "665.06",
        palletPriceUsd: "2413.92",
        stockStatus: "in_stock",
      },
      {
        productId: forceFilm70_15.id,
        sku: "PP-FRC-1870-15-32B",
        packageSize: "32 BOXES = 128 ROLLS (HALF PALLET)",
        widthInches: "18.00",
        gauge: 70,
        lengthFeet: 1500,
        rollsPerBox: 128,
        rollsPerPallet: 256,
        weightLbs: "806.40",
        priceUsd: "1268.54",
        casePriceUsd: "1268.54",
        palletPriceUsd: "2413.92",
        stockStatus: "in_stock",
      },
      {
        productId: forceFilm70_15.id,
        sku: "PP-FRC-1870-15-64B",
        packageSize: "64 BOXES = 256 ROLLS (FULL PALLET)",
        widthInches: "18.00",
        gauge: 70,
        lengthFeet: 1500,
        rollsPerBox: 256,
        rollsPerPallet: 256,
        weightLbs: "1612.80",
        priceUsd: "2413.92",
        casePriceUsd: "2413.92",
        palletPriceUsd: "2413.92",
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
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/CAJA_MANUAL_PLASTIPAC.png",
        ],
        recommendedUsage:
          "Manual wrapping of extreme-weight pallets, steel drums, heavy machinery, bagged concrete/cement, and rough export freight.",
      })
      .returning();

    await db.insert(productVariants).values([
      {
        productId: forceFilm80_15.id,
        sku: "PP-FRC-1880-15-1B",
        packageSize: "1 BOX WITH 4 ROLLS",
        widthInches: "18.00",
        gauge: 80,
        lengthFeet: 1500,
        rollsPerBox: 4,
        rollsPerPallet: 256,
        weightLbs: "28.80",
        priceUsd: "49.70",
        casePriceUsd: "49.70",
        palletPriceUsd: "2758.77",
        stockStatus: "in_stock",
      },
      {
        productId: forceFilm80_15.id,
        sku: "PP-FRC-1880-15-16B",
        packageSize: "16 BOXES = 64 ROLLS",
        widthInches: "18.00",
        gauge: 80,
        lengthFeet: 1500,
        rollsPerBox: 64,
        rollsPerPallet: 256,
        weightLbs: "460.80",
        priceUsd: "760.07",
        casePriceUsd: "760.07",
        palletPriceUsd: "2758.77",
        stockStatus: "in_stock",
      },
      {
        productId: forceFilm80_15.id,
        sku: "PP-FRC-1880-15-32B",
        packageSize: "32 BOXES = 128 ROLLS (HALF PALLET)",
        widthInches: "18.00",
        gauge: 80,
        lengthFeet: 1500,
        rollsPerBox: 128,
        rollsPerPallet: 256,
        weightLbs: "921.60",
        priceUsd: "1449.76",
        casePriceUsd: "1449.76",
        palletPriceUsd: "2758.77",
        stockStatus: "in_stock",
      },
      {
        productId: forceFilm80_15.id,
        sku: "PP-FRC-1880-15-64B",
        packageSize: "64 BOXES = 256 ROLLS (FULL PALLET)",
        widthInches: "18.00",
        gauge: 80,
        lengthFeet: 1500,
        rollsPerBox: 256,
        rollsPerPallet: 256,
        weightLbs: "1843.20",
        priceUsd: "2758.77",
        casePriceUsd: "2758.77",
        palletPriceUsd: "2758.77",
        stockStatus: "in_stock",
      },
    ]);

    console.log(
      "✅ Seed completed successfully! Inserted all 8 FORCE Standard products (4x 1000FT and 4x 1500FT) with exact 4-tier package pricing."
    );
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  }
}

seed();
