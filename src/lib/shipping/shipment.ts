import { createServerClient } from "@/lib/supabase/server";
import { packageTotalWeightLbs } from "@/lib/package-weight";
import { handFreightDimensions } from "@/lib/shipping/config";
import type { ShipmentFreight, ShippingQuoteLine } from "@/lib/shipping/types";

/** Hand film full pallet from the existing package ladder. */
const HAND_BOXES_PER_PALLET = 64;

export class ShipmentDataError extends Error {
  weightLbs = 0;
  rolls = 0;
  boxes = 0;

  constructor(
    readonly code: "missing_weight" | "missing_dims",
    message: string,
    totals?: { weightLbs?: number; rolls?: number; boxes?: number }
  ) {
    super(message);
    this.weightLbs = totals?.weightLbs ?? 0;
    this.rolls = totals?.rolls ?? 0;
    this.boxes = totals?.boxes ?? 0;
  }
}

function positive(value: unknown): number | null {
  const amount = typeof value === "number" ? value : parseFloat(String(value ?? ""));
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return amount;
}

export function parsePalletDimensions(value: unknown): {
  lengthIn: number;
  widthIn: number;
  heightIn: number;
} | null {
  const match = String(value || "").match(
    /(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)\s*[x×]\s*(\d+(?:\.\d+)?)/i
  );
  if (!match) return null;
  const lengthIn = Number(match[1]);
  const widthIn = Number(match[2]);
  const heightIn = Number(match[3]);
  if (lengthIn <= 0 || widthIn <= 0 || heightIn <= 0) return null;
  return { lengthIn, widthIn, heightIn };
}

interface FreightProduct {
  slug: string | null;
  roll_weight_lbs: number | null;
  pallet_weight_lbs: number | null;
  pallet_dimensions: string | null;
  rolls_per_box: number | null;
  width_inches: number | null;
  gauge: number | null;
  length_feet: number | null;
}

interface FreightVariant {
  sku: string | null;
  rolls_count: number | null;
  boxes_count: number | null;
  roll_weight_lbs: number | null;
  box_weight_lbs: number | null;
  pallet_weight_lbs: number | null;
  products: FreightProduct | FreightProduct[] | null;
}

function productOf(row: FreightVariant | undefined): FreightProduct | null {
  if (!row) return null;
  return Array.isArray(row.products) ? row.products[0] || null : row.products;
}

export async function buildShipmentFreight(
  lines: ShippingQuoteLine[]
): Promise<ShipmentFreight> {
  const requested = lines.filter((line) => Number(line.quantity) > 0);
  if (requested.length === 0) {
    throw new ShipmentDataError(
      "missing_weight",
      "Add a product before requesting a shipping quote."
    );
  }

  const supabase = await createServerClient();
  const skus = [...new Set(requested.map((line) => String(line.sku || "").trim()).filter(Boolean))];
  const slugs = [
    ...new Set(requested.map((line) => String(line.productSlug || "").trim()).filter(Boolean)),
  ];

  let rows: FreightVariant[] = [];
  if (skus.length > 0) {
    const { data, error } = await supabase
      .from("product_variants")
      .select(
        "sku, rolls_count, boxes_count, roll_weight_lbs, box_weight_lbs, pallet_weight_lbs, products(slug, roll_weight_lbs, pallet_weight_lbs, pallet_dimensions, rolls_per_box, width_inches, gauge, length_feet)"
      )
      .in("sku", skus);
    if (error) {
      console.error("MISSING_WEIGHT");
      throw new ShipmentDataError(
        "missing_weight",
        "We couldn't read product weights for this order."
      );
    }
    rows = (data || []) as FreightVariant[];
  }

  let productsBySlug = new Map<string, FreightProduct>();
  if (slugs.length > 0) {
    const { data, error } = await supabase
      .from("products")
      .select(
        "slug, roll_weight_lbs, pallet_weight_lbs, pallet_dimensions, rolls_per_box, width_inches, gauge, length_feet"
      )
      .in("slug", slugs);
    if (error) {
      console.error("MISSING_WEIGHT");
      throw new ShipmentDataError(
        "missing_weight",
        "We couldn't read product weights for this order."
      );
    }
    productsBySlug = new Map(
      ((data || []) as FreightProduct[])
        .filter((row) => row.slug)
        .map((row) => [String(row.slug), row])
    );
  }

  let weightLbs = 0;
  let palletCount = 0;
  let rolls = 0;
  let boxes = 0;
  let dimensions = handFreightDimensions(0);

  for (const line of requested) {
    const quantity = Math.max(1, Math.round(Number(line.quantity) || 1));
    const row = rows.find((item) => item.sku && item.sku === line.sku);
    const product =
      productOf(row) || productsBySlug.get(String(line.productSlug || "")) || null;
    const packageRolls = positive(line.totalRolls) ?? positive(row?.rolls_count) ?? 0;
    const packageBoxes = positive(line.totalBoxes) ?? positive(row?.boxes_count) ?? 0;
    const application = String(line.application || "").toLowerCase();
    const unitWeight = packageTotalWeightLbs({
      rolls: packageRolls,
      boxes: packageBoxes,
      rollWeightLbs: row?.roll_weight_lbs ?? product?.roll_weight_lbs,
      boxWeightLbs: row?.box_weight_lbs,
      palletWeightLbs: row?.pallet_weight_lbs ?? product?.pallet_weight_lbs,
      machine: application === "machine",
      widthInches: product?.width_inches,
      gauge: product?.gauge,
      lengthFeet: product?.length_feet,
    });

    if (unitWeight == null) {
      console.error("MISSING_WEIGHT");
      throw new ShipmentDataError(
        "missing_weight",
        "Product weight is missing, so shipping can't be calculated yet."
      );
    }

    const lineBoxes = packageBoxes * quantity;
    const dims =
      application === "machine"
        ? handFreightDimensions(64)
        : handFreightDimensions(lineBoxes);
    if (dims.heightIn > dimensions.heightIn) dimensions = dims;
    weightLbs += unitWeight * quantity;
    rolls += packageRolls * quantity;
    boxes += packageBoxes * quantity;
    palletCount +=
      application === "machine"
        ? quantity
        : Math.max(1, Math.ceil(Math.max(lineBoxes, 1) / HAND_BOXES_PER_PALLET));
  }

  if (weightLbs <= 0) {
    console.error("MISSING_WEIGHT");
    throw new ShipmentDataError(
      "missing_weight",
      "Product weight is missing, so shipping can't be calculated yet."
    );
  }

  return {
    weightLbs: Math.round(weightLbs * 10) / 10,
    palletCount: Math.max(1, palletCount),
    lengthIn: dimensions.lengthIn,
    widthIn: dimensions.widthIn,
    heightIn: dimensions.heightIn,
    rolls,
    boxes,
  };
}
