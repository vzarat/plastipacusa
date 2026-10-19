import { createClient } from "@supabase/supabase-js";
import { WARP_ORIGIN_ZIP, getWarpConfig } from "../src/lib/shipping/config";
import { nextBusinessPickupDate } from "../src/lib/shipping/dates";
import { auditCatalogProduct } from "../src/lib/shipping/catalog-freight";
import { fetchLtlMarketOptions, hideTruckloadForSmallShipment, marketItemsFromPieces } from "../src/lib/shipping/market-options";
import { formatWarpRequest } from "../src/lib/shipping/quote-parity";
import { ShipmentDataError, shipmentFreightFromCatalog, type FreightProduct, type FreightVariant } from "../src/lib/shipping/shipment";
import type { ShippingQuoteLine } from "../src/lib/shipping/types";

const ZIPS = ["32801", "77002", "90001"];

interface ProductRow extends FreightProduct {
  id: string;
  name?: string | null;
}

function usableUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  if (!usableUrl(url) || !key) {
    console.log("Live catalog was not read. Using package-table weights and the height shown on the product specs.");
    printRepoAudit();
    await quotePackageTableSamples();
    return;
  }
  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const productsResult = await supabase.from("products").select("*");
  const variantsResult = await supabase.from("product_variants").select("*");
  if (productsResult.error || variantsResult.error) {
    console.log(`Catalog was not read: ${productsResult.error?.message || variantsResult.error?.message}`);
    return;
  }
  const products = (productsResult.data || []) as ProductRow[];
  const variants = (variantsResult.data || []) as Array<FreightVariant & { product_id?: string }>;
  const byProduct = new Map<string, Array<FreightVariant & { product_id?: string }>>();
  for (const variant of variants) {
    const id = String(variant.product_id || "");
    const list = byProduct.get(id) || [];
    list.push(variant);
    byProduct.set(id, list);
  }

  console.log("product\tapplication\ttier\tweight\tboxes/rolls\tdimensions\tfields to fill");
  const quotable: Array<{ product: ProductRow; variant: FreightVariant; tier: string; boxes: number }> = [];
  for (const product of products) {
    const rows = byProduct.get(product.id) || [];
    const box = rows.find((row) => Number(row.boxes_count) === 1) || rows[0];
    const audit = auditCatalogProduct({
      name: String(product.name || product.slug || product.id),
      slug: String(product.slug || ""),
      application: String(product.application || ""),
      boxWeightLbs: numberOrNull(box?.box_weight_lbs),
      palletWeightLbs: numberOrNull(box?.pallet_weight_lbs ?? product.pallet_weight_lbs),
      boxesCount: numberOrNull(box?.boxes_count),
      rollsCount: numberOrNull(box?.rolls_count),
      dimensions: product as FreightProduct,
    });
    for (const row of audit) {
      console.log([row.product, row.application, row.tier, row.weight, row.boxesOrRolls, row.dimensions, row.fieldsToFill || "—"].join("\t"));
    }
    if (String(product.application) === "machine") continue;
    for (const boxes of [1, 16, 32, 64]) {
      const variant = rows.find((row) => Number(row.boxes_count) === boxes);
      if (variant && audit.find((row) => row.boxesOrRolls.startsWith(String(boxes)) && row.weight === "present" && row.dimensions === "present")) {
        quotable.push({ product, variant, tier: String(boxes), boxes });
      }
    }
  }

  const pickupDate = nextBusinessPickupDate();
  console.log(`\nPickup date from nextBusinessPickupDate: ${pickupDate}`);
  const samples = pickSamples(quotable);
  if (samples.length === 0) {
    console.log("No product/tier has both package weight and stored inches, so no Warp request was sent.");
    return;
  }
  let config: { apiKey: string };
  try {
    config = getWarpConfig();
  } catch {
    console.log("Warp key is not configured, so live quotes were not requested.");
    return;
  }

  for (const sample of samples) {
    for (const zip of ZIPS) {
      await quoteSample(config.apiKey, sample.label, sample.lines, sample.rows, products, zip, pickupDate);
    }
  }
}

function pickSamples(
  quotable: Array<{ product: ProductRow; variant: FreightVariant; tier: string; boxes: number }>
) {
  const byBoxes = (boxes: number) => quotable.filter((item) => item.boxes === boxes);
  const firstTwo = (boxes: number) => byBoxes(boxes).slice(0, 2);
  const samples: Array<{ label: string; lines: ShippingQuoteLine[]; rows: FreightVariant[] }> = [];
  for (const boxes of [1, 16, 32, 64]) {
    for (const item of firstTwo(boxes)) {
      samples.push({
        label: `${item.product.slug} ${item.tier}`,
        lines: [{ sku: String(item.variant.sku), productSlug: String(item.product.slug), quantity: 1 }],
        rows: [{ ...item.variant, products: item.product }],
      });
    }
  }
  const full = byBoxes(64).slice(0, 2);
  if (full.length === 2) {
    samples.push({
      label: `mixed ${full[0].product.slug} + ${full[1].product.slug}`,
      lines: full.map((item) => ({ sku: String(item.variant.sku), productSlug: String(item.product.slug), quantity: 1 })),
      rows: full.map((item) => ({ ...item.variant, products: item.product })),
    });
  }
  return samples;
}

async function quoteSample(
  apiKey: string,
  label: string,
  lines: ShippingQuoteLine[],
  rows: FreightVariant[],
  products: FreightProduct[],
  zip: string,
  pickupDate: string
) {
  const productsBySlug = new Map<string, FreightProduct>(
    products.map((product) => [String(product.slug), product])
  );
  try {
    const freight = shipmentFreightFromCatalog(lines, rows, productsBySlug);
    const request = formatWarpRequest({ destinationZip: zip, pickupDate, freight });
    const quoted = await fetchLtlMarketOptions({
      apiKey,
      originZip: WARP_ORIGIN_ZIP,
      destinationZip: zip,
      pickupDate,
      items: marketItemsFromPieces(freight.pieces),
      timeoutMs: 45_000,
    });
    const shown = hideTruckloadForSmallShipment(quoted.options, freight.palletCount)
      .slice()
      .sort((a, b) => a.carrierPrice - b.carrierPrice)
      .slice(0, 3);
    console.log(`\n${label} -> ${zip}`);
    console.log(request);
    if (shown.length === 0) {
      console.log(`No bookable options. cached=${quoted.cached} retryable=${quoted.retryable} note=${quoted.note || "none"}`);
      return;
    }
    for (const option of shown) {
      console.log(`${option.carrierName || option.serviceLevel} | ${option.serviceLevel} | $${option.carrierPrice.toFixed(2)} | ${option.transitDays ?? "?"} days`);
    }
  } catch (error) {
    const reason = error instanceof ShipmentDataError ? error.message : "quote failed";
    console.log(`\n${label} -> ${zip}\nCould not quote: ${reason}`);
  }
}

function printRepoAudit() {
  console.log("Audit source: supabase/migrations/update_product_weights.sql. No tier inches are stored there.");
  console.log("product\tapplication\ttier\tweight\tboxes/rolls\tdimensions\tfields to fill");
  const hand = [
    ["stretch-film-18-x-60-ga-x-1000ft", 24.6, 1596.7],
    ["stretch-film-18-x-70-ga-x-1000ft", 27.51, 1783],
    ["stretch-film-18-x-80-ga-x-1000ft", 34.65, 2240.2],
    ["stretch-film-18-x-60-ga-x-1500ft", 30.42, 1969.2],
    ["stretch-film-18-x-70-ga-x-1500ft", 34.74, 2245.8],
    ["stretch-film-18-x-80-ga-x-1500ft", 39.07, 2522.3],
    ["stretch-film-15-x-40-ga-x-1500ft", 18, 1173.5],
    ["stretch-film-15-x-60-ga-x-1000ft", 25.13, 1637.5],
    ["stretch-film-15-x-60-ga-x-1500ft", 25.13, 1630.5],
    ["stretch-film-15-x-70-ga-x-1500ft", 28.75, 1862],
    ["stretch-film-15-x-80-ga-x-1500ft", 32.36, 2093.3],
  ] as const;
  for (const [slug, box, pallet] of hand) {
    for (const row of auditCatalogProduct({
      name: slug,
      slug,
      application: "hand",
      boxWeightLbs: box,
      palletWeightLbs: pallet,
      boxesCount: 1,
      rollsCount: 4,
      dimensions: {},
    })) {
      console.log([row.product, row.application, row.tier, row.weight, row.boxesOrRolls, row.dimensions, row.fieldsToFill || "—"].join("\t"));
    }
  }
  const machine: Array<[string, number | null]> = [
    ["stretch-film-20-x-51-ga-x-7000ft", 1246.1],
    ["stretch-film-20-x-51-ga-x-9000ft", 1573.3],
    ["stretch-film-20-x-60-ga-x-5000ft", 1058],
    ["stretch-film-20-x-70-ga-x-5000ft", 1224.1],
    ["stretch-film-20-x-80-ga-x-5000ft", 1384.5],
    ["stretch-film-20-x-60-ga-x-6000ft", null],
    ["stretch-film-20-x-70-ga-x-6000ft", null],
    ["stretch-film-20-x-80-ga-x-6000ft", null],
  ];
  for (const [slug, pallet] of machine) {
    for (const row of auditCatalogProduct({
      name: slug,
      slug,
      application: "machine",
      boxWeightLbs: null,
      palletWeightLbs: pallet,
      boxesCount: null,
      rollsCount: 20,
      widthInches: 20,
      dimensions: {},
    })) {
      console.log([row.product, row.application, row.tier, row.weight, row.boxesOrRolls, row.dimensions, row.fieldsToFill || "—"].join("\t"));
    }
  }
  console.log("\nNot quotable: stretch-film-20-x-60/70/80-ga-x-6000ft half and full pallet. Reason: MISSING_WEIGHT (roll and pallet weight are 0 on the live product).");
  console.log("Loose boxes use LOOSE_BOX_MODE in src/lib/shipping/tier-height.ts.");
}

async function quotePackageTableSamples() {
  let config: { apiKey: string };
  try {
    config = getWarpConfig();
  } catch {
    console.log("Warp key is not configured, so live quotes were not requested.");
    return;
  }
  const pickupDate = nextBusinessPickupDate();
  console.log(`Pickup date from nextBusinessPickupDate: ${pickupDate}`);
  const films = [
    handFilm("stretch-film-18-x-80-ga-x-1000ft", 8.66, 2240.2, 80),
    handFilm("stretch-film-18-x-60-ga-x-1000ft", 6.15, 1596.7, 60),
  ];
  for (const film of films) {
    for (const boxes of [1, 16, 32, 64]) {
      const row = handVariant(film, boxes, film.slug?.includes("80") ? 34.65 : 24.6);
      for (const zip of ZIPS) {
        await quoteSample(
          config.apiKey,
          `${film.slug} ${boxes} boxes`,
          [{ sku: row.sku || "", productSlug: film.slug || "", quantity: 1 }],
          [row],
          [film],
          zip,
          pickupDate
        );
      }
    }
  }
  const mixed = films.map((film) => handVariant(film, 64, film.slug?.includes("80") ? 34.65 : 24.6));
  for (const zip of ZIPS) {
    await quoteSample(
      config.apiKey,
      "mixed 18x80 full + 18x60 full",
      mixed.map((row) => ({ sku: row.sku || "", productSlug: String(row.products && !Array.isArray(row.products) ? row.products.slug : ""), quantity: 1 })),
      mixed,
      films,
      zip,
      pickupDate
    );
  }
}

function handFilm(slug: string, roll: number, pallet: number, gauge: number): FreightProduct {
  return {
    slug,
    application: "hand",
    roll_weight_lbs: roll,
    pallet_weight_lbs: pallet,
    pallet_dimensions: null,
    rolls_per_box: 4,
    width_inches: 18,
    gauge,
    length_feet: 1000,
  };
}

function handVariant(product: FreightProduct, boxes: number, boxWeight: number): FreightVariant {
  return {
    sku: `${product.slug}-${boxes}`,
    rolls_count: boxes * 4,
    boxes_count: boxes,
    roll_weight_lbs: product.roll_weight_lbs,
    box_weight_lbs: boxWeight,
    pallet_weight_lbs: product.pallet_weight_lbs,
    products: product,
  };
}

function numberOrNull(value: unknown): number | null {
  const amount = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

main().catch((error: unknown) => {
  console.log(error instanceof Error ? error.message : "quote parity failed");
  process.exitCode = 1;
});
