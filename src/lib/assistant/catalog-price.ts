import { createServerClient } from "@/lib/supabase/server";
import type { CatalogPrice, PalletCalculatorInput } from "@/lib/assistant/pallet-calculator";

const PRODUCT_COLUMNS = "id, slug, gauge, width_inches, length_feet, roll_weight_lbs";
const VARIANT_COLUMNS = "price, rolls_count, boxes_count, sku, roll_weight_lbs";

type ProductRow = {
  id: string;
  slug: string | null;
  gauge: number | string | null;
  width_inches: number | string | null;
  length_feet: number | string | null;
  roll_weight_lbs: number | string | null;
};

type VariantRow = {
  price: number | string | null;
  rolls_count: number | string | null;
  boxes_count: number | string | null;
  sku: string | null;
  roll_weight_lbs: number | string | null;
};

function money(value: unknown): number | null {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function sameNumber(left: unknown, right: number) {
  return Math.round(Number(left)) === right;
}

function variantPrice(variants: VariantRow[], rolls: number, boxes?: number) {
  const match = variants.find((variant) => {
    if (sameNumber(variant.rolls_count, rolls)) return true;
    return boxes != null && sameNumber(variant.boxes_count, boxes);
  });
  return money(match?.price);
}

/**
 * Reads catalog prices with the signed-in user's Supabase session.
 * The service-role client is never used, and query failures stay on the server.
 */
export async function lookupCatalogPrice(
  input: Pick<PalletCalculatorInput, "widthInches" | "gauge" | "lengthFeet">
): Promise<CatalogPrice | null> {
  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return null;

    let query = supabase.from("products").select(PRODUCT_COLUMNS).limit(30);
    if (input.gauge != null) query = query.eq("gauge", Math.round(input.gauge));

    const { data, error } = await query;
    if (error || !data) {
      console.error("Assist AI catalog lookup failed");
      return null;
    }

    const width = Math.round(Number(input.widthInches));
    const length = input.lengthFeet != null ? Math.round(input.lengthFeet) : null;
    const rows = (data as ProductRow[]).filter((row) => sameNumber(row.width_inches, width));
    const matched =
      length == null ? rows[0] : rows.find((row) => sameNumber(row.length_feet, length));
    if (!matched) return null;

    const variantsResult = await supabase
      .from("product_variants")
      .select(VARIANT_COLUMNS)
      .eq("product_id", matched.id)
      .limit(12);
    if (variantsResult.error || !variantsResult.data) {
      console.error("Assist AI catalog lookup failed");
      return null;
    }

    const variants = variantsResult.data as VariantRow[];
    const rollWeight =
      money(matched.roll_weight_lbs) ??
      money(variants.find((variant) => money(variant.roll_weight_lbs))?.roll_weight_lbs);

    return {
      boxPrice: variantPrice(variants, 4, 1),
      halfPalletPrice: variantPrice(variants, 20),
      fullPalletPrice: variantPrice(variants, 40),
      rollWeightLbs: rollWeight,
      sku: variants.find((variant) => variant.sku)?.sku ?? matched.slug,
    };
  } catch (error) {
    console.error("Assist AI catalog lookup failed", error);
    return null;
  }
}
