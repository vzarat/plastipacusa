/**
 * Quotes one 64-box hand-film pallet to Mission, Houston, Chicago, and Los Angeles.
 * Run: node --env-file=.env.local ./node_modules/.bin/tsx scripts/quote-shipping.ts
 * Does not print API keys.
 */
import { createClient } from "@supabase/supabase-js";
import { packageTotalWeightLbs } from "../src/lib/package-weight";
import { WARP_ORIGIN_ZIP } from "../src/lib/shipping/config";
import { quoteWarpFreight } from "../src/lib/shipping/warp";

const DESTINATIONS = [
  { label: "Mission, TX", zip: "78572" },
  { label: "Houston, TX", zip: "77002" },
  { label: "Chicago, IL", zip: "60601" },
  { label: "Los Angeles, CA", zip: "90058" },
];

function parsePalletDimensions(value: unknown) {
  const match = String(value || "").match(
    /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i
  );
  if (!match) return null;
  return {
    lengthIn: Number(match[1]),
    widthIn: Number(match[2]),
    heightIn: Number(match[3]),
  };
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    console.error("NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are required.");
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const { data, error } = await supabase
    .from("product_variants")
    .select(
      "sku, rolls_count, boxes_count, roll_weight_lbs, box_weight_lbs, pallet_weight_lbs, products(slug, roll_weight_lbs, pallet_weight_lbs, pallet_dimensions, width_inches, gauge, length_feet)"
    )
    .limit(40);

  if (error) {
    console.error("Could not read product weights.");
    process.exit(1);
  }

  const row = (data || []).find((item) => {
    const boxes = Number(item.boxes_count || 0);
    const rolls = Number(item.rolls_count || 0);
    return boxes === 64 || rolls === 256 || boxes === 1;
  });

  if (!row) {
    console.error("No hand-film variant with box or pallet counts was found.");
    process.exit(1);
  }

  const product = Array.isArray(row.products) ? row.products[0] : row.products;
  const dims = parsePalletDimensions(product?.pallet_dimensions);
  if (!dims) {
    console.error("MISSING_DIMS");
    console.error(
      "products.pallet_dimensions is empty or not LENGTH x WIDTH x HEIGHT. Run supabase/migrations/order_shipping_quote.sql and fill pallet_length_in, pallet_width_in, pallet_height_in, or set pallet_dimensions."
    );
    process.exit(1);
  }

  const unitWeight = packageTotalWeightLbs({
    rolls: 256,
    boxes: 64,
    rollWeightLbs: row.roll_weight_lbs ?? product?.roll_weight_lbs,
    boxWeightLbs: row.box_weight_lbs,
    palletWeightLbs: row.pallet_weight_lbs ?? product?.pallet_weight_lbs,
    widthInches: product?.width_inches,
    gauge: product?.gauge,
    lengthFeet: product?.length_feet,
  });

  if (unitWeight == null) {
    console.error("MISSING_WEIGHT");
    console.error(
      "Need roll_weight_lbs, box_weight_lbs, or pallet_weight_lbs. Run supabase/migrations/update_product_weights.sql."
    );
    process.exit(1);
  }

  const freight = {
    weightLbs: unitWeight,
    palletCount: 1,
    lengthIn: dims.lengthIn,
    widthIn: dims.widthIn,
    heightIn: dims.heightIn,
    rolls: 256,
    boxes: 64,
    pieces: [],
  };

  console.log(
    `64-box shipment: ${freight.weightLbs} lbs, ${freight.palletCount} pallet, ${freight.lengthIn} x ${freight.widthIn} x ${freight.heightIn} in`
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
      for (const option of options.sort((a, b) => a.price - b.price)) {
        console.log(
          `  ${option.serviceName} (${option.mode}) $${option.price.toFixed(2)} · ${option.transitDays} business days · ${option.id}`
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
