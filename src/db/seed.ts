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

    // 1. Force Hand Stretch Film
    const [forceFilm] = await db
      .insert(products)
      .values({
        slug: "force-hand-stretch-film",
        name: "Force™ Hand Stretch Film",
        brand: "Plastipac USA",
        application: "hand",
        filmType: "Cast Co-Extruded Multi-Layer",
        color: "Ultra Clear",
        shortDescription:
          "Premium industrial cast hand wrap engineered for high load retention, exceptional puncture resistance, and quiet unwind.",
        description:
          "Plastipac Force™ Hand Stretch Film is manufactured with cutting-edge multi-layer cast extrusion technology. Engineered specifically for manual pallet wrapping operations, it provides superior cling, maximum puncture resistance on sharp corners, and whisper-quiet release to protect operators from fatigue.",
        features: [
          "High optical clarity for barcode scanning through wrap",
          "One-side cling prevents pallets from sticking together during transit",
          "Differential slip release for effortless dispensing",
          "Ultra-strong puncture & tear resistance for irregular loads",
          "100% recyclable linear low-density polyethylene (LLDPE)",
        ],
        techSheetUrl: "/docs/plastipac-force-hand-film-specs.pdf",
        imageUrl: "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/productos_plastipac_manual.png",
        images: [
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/productos_plastipac_manual.png",
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/CAJA_MANUAL_PLASTIPAC.png",
        ],
        recommendedUsage: "Manual wrapping of B and C type pallet loads, distribution centers, and warehouse logistics.",
      })
      .returning();

    await db.insert(productVariants).values([
      {
        productId: forceFilm.id,
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
      },
      {
        productId: forceFilm.id,
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
      },
      {
        productId: forceFilm.id,
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
      },
      {
        productId: forceFilm.id,
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
      },
      {
        productId: forceFilm.id,
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
      },
    ]);

    // 2. Genesis High Performance Machine Film
    const [genesisFilm] = await db
      .insert(products)
      .values({
        slug: "genesis-high-performance-machine-film",
        name: "Genesis™ High Performance Machine Film",
        brand: "Plastipac USA",
        application: "machine",
        filmType: "Cast Nano-Layer Technology",
        color: "Crystal Clear",
        shortDescription:
          "Ultra-high yield high-speed machine stretch film delivering up to 300% pre-stretch and unyielding load containment.",
        description:
          "Genesis™ Machine Film represents Plastipac's pinnacle of automated packaging performance. Formulated with metallocene resins in a proprietary 55-layer nano-structure, Genesis allows automatic high-speed rotary turntables and orbital wrappers to run with zero tear-outs while cutting film consumption by up to 40%.",
        features: [
          "Pre-stretch elongation capability guaranteed up to 300%+",
          "Extreme containment force for heavy and unstable pallets",
          "Flawless optical clarity for high-speed automated warehouses",
          "Ultra-high puncture resistance against protruding pallet nails & sharp edges",
          "Consistent gauge profile minimizing machine downtime",
        ],
        techSheetUrl: "/docs/plastipac-genesis-machine-specs.pdf",
        imageUrl: "https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&w=1000&q=80",
        images: [
          "https://images.unsplash.com/photo-1616401784845-180882ba9ba8?auto=format&fit=crop&w=1000&q=80",
        ],
        recommendedUsage: "High-speed automated wrappers, rotary ring systems, heavy beverage & building materials.",
      })
      .returning();

    await db.insert(productVariants).values([
      {
        productId: genesisFilm.id,
        sku: "PP-GEN-2055-1R",
        widthInches: "20.00",
        gauge: 55,
        lengthFeet: 9000,
        rollsPerBox: 1,
        rollsPerPallet: 40,
        weightLbs: "39.60",
        priceUsd: "74.50",
        casePriceUsd: "74.50",
        palletPriceUsd: "2860.00",
        stockStatus: "in_stock",
      },
      {
        productId: genesisFilm.id,
        sku: "PP-GEN-2065-1R",
        widthInches: "20.00",
        gauge: 65,
        lengthFeet: 7500,
        rollsPerBox: 1,
        rollsPerPallet: 40,
        weightLbs: "39.00",
        priceUsd: "72.00",
        casePriceUsd: "72.00",
        palletPriceUsd: "2760.00",
        stockStatus: "in_stock",
      },
      {
        productId: genesisFilm.id,
        sku: "PP-GEN-2080-1R",
        widthInches: "20.00",
        gauge: 80,
        lengthFeet: 6000,
        rollsPerBox: 1,
        rollsPerPallet: 40,
        weightLbs: "38.40",
        priceUsd: "69.90",
        casePriceUsd: "69.90",
        palletPriceUsd: "2680.00",
        stockStatus: "in_stock",
      },
      {
        productId: genesisFilm.id,
        sku: "PP-GEN-3080-1R",
        widthInches: "30.00",
        gauge: 80,
        lengthFeet: 6000,
        rollsPerBox: 1,
        rollsPerPallet: 20,
        weightLbs: "57.60",
        priceUsd: "108.00",
        casePriceUsd: "108.00",
        palletPriceUsd: "2080.00",
        stockStatus: "in_stock",
      },
    ]);

    // 3. Stealth Heavy-Duty Puncture Machine Film
    const [stealthFilm] = await db
      .insert(products)
      .values({
        slug: "stealth-puncture-machine-film",
        name: "Stealth™ Puncture-Resistant Machine Film",
        brand: "Plastipac USA",
        application: "machine",
        filmType: "Hybrid Cast / High-Tack Blown Performance",
        color: "Clear Tint",
        shortDescription:
          "Heavy-duty industrial machine wrap designed for irregular, jagged, and maximum-weight freight loads.",
        description:
          "Plastipac Stealth™ is built for the harshest shipping environments. Combining the tensile strength of cast film with the puncture toughness of blown film, Stealth provides bulletproof hold for sharp steel parts, bricks, timber, and aggressive odd-shaped shipments.",
        features: [
          "Extreme two-sided load grip and holding power",
          "Resists tears even when punctured by jagged pallet corners",
          "Optimized for semi-automatic and automatic stretch wrappers",
          "Cold-temperature rated for freezer storage packaging",
        ],
        techSheetUrl: "/docs/plastipac-stealth-specs.pdf",
        imageUrl: "https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1000&q=80",
        images: [
          "https://images.unsplash.com/photo-1553413077-190dd305871c?auto=format&fit=crop&w=1000&q=80",
        ],
        recommendedUsage: "Heavy machinery, masonry, metal stamping, irregular pallet loads.",
      })
      .returning();

    await db.insert(productVariants).values([
      {
        productId: stealthFilm.id,
        sku: "PP-STL-2090-1R",
        widthInches: "20.00",
        gauge: 90,
        lengthFeet: 5000,
        rollsPerBox: 1,
        rollsPerPallet: 40,
        weightLbs: "36.00",
        priceUsd: "78.00",
        casePriceUsd: "78.00",
        palletPriceUsd: "2990.00",
        stockStatus: "in_stock",
      },
      {
        productId: stealthFilm.id,
        sku: "PP-STL-20115-1R",
        widthInches: "20.00",
        gauge: 115,
        lengthFeet: 4000,
        rollsPerBox: 1,
        rollsPerPallet: 40,
        weightLbs: "36.80",
        priceUsd: "84.50",
        casePriceUsd: "84.50",
        palletPriceUsd: "3250.00",
        stockStatus: "in_stock",
      },
    ]);

    // 4. Eco-Max Sustainable PCR Hand Film
    const [ecoFilm] = await db
      .insert(products)
      .values({
        slug: "eco-max-pcr-hand-film",
        name: "Eco-Max™ 30% PCR Sustainable Hand Film",
        brand: "Plastipac USA",
        application: "hand",
        filmType: "Post-Consumer Recycled LLDPE",
        color: "Eco Clear",
        shortDescription:
          "Sustainable high-tensile stretch film incorporating 30% certified Post-Consumer Recycled (PCR) resin without compromising holding strength.",
        description:
          "Help your enterprise meet corporate ESG and zero-waste targets with Plastipac Eco-Max™. Formulated with premium recycled resins, it delivers identical load holding power and tear resistance to virgin film while drastically lowering your carbon footprint.",
        features: [
          "Contains 30% certified post-consumer recycled plastic",
          "Meets enterprise ESG packaging sustainability standards",
          "Equivalent puncture resistance to virgin 80-gauge cast film",
          "High transparency for effortless inventory scanning",
        ],
        techSheetUrl: "/docs/plastipac-eco-max-specs.pdf",
        imageUrl: "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=1000&q=80",
        images: [
          "https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=1000&q=80",
          "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/CAJA_MANUAL_PLASTIPAC.png",
        ],
        recommendedUsage: "Eco-conscious supply chains, retail distribution, corporate ESG compliance.",
      })
      .returning();

    await db.insert(productVariants).values([
      {
        productId: ecoFilm.id,
        sku: "PP-ECO-1880-4B",
        widthInches: "18.00",
        gauge: 80,
        lengthFeet: 1500,
        rollsPerBox: 4,
        rollsPerPallet: 192,
        weightLbs: "34.50",
        priceUsd: "22.50",
        casePriceUsd: "90.00",
        palletPriceUsd: "4150.00",
        stockStatus: "in_stock",
      },
      {
        productId: ecoFilm.id,
        sku: "PP-ECO-1870-4B",
        widthInches: "18.00",
        gauge: 70,
        lengthFeet: 1500,
        rollsPerBox: 4,
        rollsPerPallet: 192,
        weightLbs: "30.20",
        priceUsd: "20.90",
        casePriceUsd: "83.60",
        palletPriceUsd: "3850.00",
        stockStatus: "in_stock",
      },
    ]);

    console.log("✅ Seed completed successfully! Inserted 4 core product families and 13 technical variants.");
    process.exit(0);
  } catch (error) {
    console.error("❌ Seed error:", error);
    process.exit(1);
  }
}

seed();
