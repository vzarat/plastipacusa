/**
 * Quotes a 64-box full pallet to Houston, Chicago, and Los Angeles.
 * Run: node --env-file=.env.local ./node_modules/.bin/tsx scripts/test-shipping.ts
 */
import { packageTotalWeightLbs } from "../src/lib/package-weight";
import { HAND_FREIGHT_DIMENSIONS_IN, WARP_ORIGIN_ZIP } from "../src/lib/shipping/config";
import { quoteWarpFreight } from "../src/lib/shipping/warp";

const DESTINATIONS = [
  { label: "Houston, TX", zip: "77002" },
  { label: "Chicago, IL", zip: "60601" },
  { label: "Los Angeles, CA", zip: "90001" },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error("Supabase URL and anon key are required.");
    process.exit(1);
  }

  const response = await fetch(
    `${url}/rest/v1/product_variants?select=rolls_count,boxes_count,roll_weight_lbs,box_weight_lbs,pallet_weight_lbs,products(width_inches,gauge,length_feet,roll_weight_lbs,pallet_weight_lbs)&limit=80`,
    {
      headers: {
        apikey: key,
        authorization: `Bearer ${key}`,
      },
    }
  );
  if (!response.ok) {
    console.error("Could not read product weights.");
    process.exit(1);
  }
  const data = (await response.json()) as Array<{
    rolls_count: number | null;
    boxes_count: number | null;
    roll_weight_lbs: number | null;
    box_weight_lbs: number | null;
    pallet_weight_lbs: number | null;
    products:
      | {
          width_inches: number | null;
          gauge: number | null;
          length_feet: number | null;
          roll_weight_lbs: number | null;
          pallet_weight_lbs: number | null;
        }
      | Array<{
          width_inches: number | null;
          gauge: number | null;
          length_feet: number | null;
          roll_weight_lbs: number | null;
          pallet_weight_lbs: number | null;
        }>
      | null;
  }>;

  const row = (data || []).find((item) => {
    const boxes = Number(item.boxes_count || 0);
    const rolls = Number(item.rolls_count || 0);
    return boxes >= 64 || rolls >= 256;
  }) || (data || [])[0];

  const product = row && (Array.isArray(row.products) ? row.products[0] : row.products);
  const weight = packageTotalWeightLbs({
    rolls: 256,
    boxes: 64,
    rollWeightLbs: row?.roll_weight_lbs ?? product?.roll_weight_lbs,
    boxWeightLbs: row?.box_weight_lbs,
    palletWeightLbs: row?.pallet_weight_lbs ?? product?.pallet_weight_lbs,
    widthInches: product?.width_inches,
    gauge: product?.gauge,
    lengthFeet: product?.length_feet,
  });

  if (weight == null) {
    console.log(
      "Product weights are empty in the database. Using the official 18 in x 80 ga x 1500 ft full-pallet weight from update_product_weights.sql."
    );
  }
  const shipmentWeight = weight ?? 2522.3;

  const dims = HAND_FREIGHT_DIMENSIONS_IN.full;
  const freight = {
    weightLbs: shipmentWeight,
    palletCount: 1,
    lengthIn: dims.lengthIn,
    widthIn: dims.widthIn,
    heightIn: dims.heightIn,
    rolls: 256,
    boxes: 64,
  };

  console.log(
    `64-box full pallet from ${WARP_ORIGIN_ZIP}: ${freight.weightLbs.toLocaleString("en-US")} lbs, ${freight.lengthIn} x ${freight.widthIn} x ${freight.heightIn} in`
  );

  for (const destination of DESTINATIONS) {
    try {
      const options = await quoteWarpFreight({
        originZip: WARP_ORIGIN_ZIP,
        destinationZip: destination.zip,
        freight,
      });
      console.log(`\n${destination.label} ${destination.zip}`);
      if (options.length === 0) {
        console.log("  No options returned.");
        continue;
      }
      for (const option of [...options].sort((a, b) => a.price - b.price)) {
        console.log(
          `  ${option.serviceName} (${option.mode}) $${option.price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · ${option.transitDays} business days`
        );
      }
    } catch (error) {
      const code = error instanceof Error ? error.message : "unavailable";
      console.log(`\n${destination.label} ${destination.zip}`);
      console.log(`  Quote failed (${code}).`);
    }
  }
}

void main();
