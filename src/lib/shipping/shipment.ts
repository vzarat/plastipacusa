import { createServerClient } from "@/lib/supabase/server";
import { packageTotalWeightLbs, packHandShippingUnits } from "@/lib/package-weight";
import { groupLinesBySku, handTierName } from "@/lib/shipping/catalog-freight";
import { LOOSE_BOX_MODE, resolveFullPalletHeight, tierInchesFromFullHeight } from "@/lib/shipping/tier-height";
import { formatFreightDimensions, formatFreightWeightLabel, handHandlingUnit } from "@/lib/shipping/hand-freight";
import { ShipmentDataError } from "@/lib/shipping/shipment-error";
import type { FreightPiece, ShipmentFreight, ShippingQuoteLine } from "@/lib/shipping/types";

export { ShipmentDataError };

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

export interface FreightProduct {
  slug: string | null;
  application: string | null;
  roll_weight_lbs: number | null;
  pallet_weight_lbs: number | null;
  pallet_dimensions: string | null;
  pallet_length_in?: number | null;
  pallet_width_in?: number | null;
  pallet_height_in?: number | null;
  box_length_in?: number | null;
  box_width_in?: number | null;
  box_height_in?: number | null;
  layer_length_in?: number | null;
  layer_width_in?: number | null;
  layer_height_in?: number | null;
  half_pallet_length_in?: number | null;
  half_pallet_width_in?: number | null;
  half_pallet_height_in?: number | null;
  rolls_per_box: number | null;
  width_inches: number | null;
  gauge: number | null;
  length_feet: number | null;
}

export interface FreightVariant {
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
        "sku, rolls_count, boxes_count, roll_weight_lbs, box_weight_lbs, pallet_weight_lbs, products(slug, application, roll_weight_lbs, pallet_weight_lbs, pallet_dimensions, rolls_per_box, width_inches, gauge, length_feet)"
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

  if (slugs.length > 0) {
    const { data } = await supabase
      .from("product_variants")
      .select(
        "sku, rolls_count, boxes_count, roll_weight_lbs, box_weight_lbs, pallet_weight_lbs, products!inner(slug, application, roll_weight_lbs, pallet_weight_lbs, pallet_dimensions, rolls_per_box, width_inches, gauge, length_feet)"
      )
      .in("products.slug", slugs);
    const known = new Set(rows.map((row) => String(row.sku || "")));
    for (const row of (data || []) as FreightVariant[]) {
      const sku = String(row.sku || "");
      if (!sku || known.has(sku)) continue;
      known.add(sku);
      rows.push(row);
    }
  }

  let productsBySlug = new Map<string, FreightProduct>();
  if (slugs.length > 0) {
    const { data, error } = await supabase
      .from("products")
      .select(
        "slug, application, roll_weight_lbs, pallet_weight_lbs, pallet_dimensions, rolls_per_box, width_inches, gauge, length_feet"
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

  return shipmentFreightFromCatalog(requested, rows, productsBySlug);
}

/** Weight, pallets, and rolls come from the catalog row for the sku. Client box, roll, and weight fields are ignored. */
export function shipmentFreightFromCatalog(
  lines: ShippingQuoteLine[],
  rows: FreightVariant[],
  productsBySlug: Map<string, FreightProduct>
): ShipmentFreight {
  const requested = groupLinesBySku(lines.filter((line) => Number(line.quantity) > 0));
  if (requested.length === 0) {
    throw new ShipmentDataError(
      "missing_weight",
      "Add a product before requesting a shipping quote."
    );
  }

  let weightLbs = 0;
  let palletCount = 0;
  let rolls = 0;
  let boxes = 0;
  const pieces: FreightPiece[] = [];

  for (const line of requested) {
    const quantity = Math.max(1, Math.round(Number(line.quantity) || 1));
    const row = rows.find((item) => item.sku && item.sku === line.sku);
    const product =
      productOf(row) || productsBySlug.get(String(line.productSlug || "")) || null;
    const packageRolls = positive(row?.rolls_count) ?? 0;
    const packageBoxes = positive(row?.boxes_count) ?? 0;
    const application = String(product?.application || "").toLowerCase();
    const slug = String(product?.slug || line.productSlug || "");
    const siblings = rows.filter((item) => {
      const itemSlug = productOf(item)?.slug;
      return slug && itemSlug === slug;
    });
    const siblingWeight = (field: "roll_weight_lbs" | "box_weight_lbs" | "pallet_weight_lbs") => {
      for (const item of siblings) {
        const amount = positive(item[field]);
        if (amount != null) return amount;
      }
      return null;
    };
    const rollWeightLbs =
      positive(row?.roll_weight_lbs) ?? siblingWeight("roll_weight_lbs") ?? positive(product?.roll_weight_lbs);
    const boxWeightLbs = positive(row?.box_weight_lbs) ?? siblingWeight("box_weight_lbs");
    const palletWeightLbs =
      positive(row?.pallet_weight_lbs) ??
      siblingWeight("pallet_weight_lbs") ??
      positive(product?.pallet_weight_lbs);
    const unitWeight = packageTotalWeightLbs({
      rolls: packageRolls,
      boxes: packageBoxes,
      rollWeightLbs,
      boxWeightLbs,
      palletWeightLbs,
      machine: application === "machine",
      widthInches: product?.width_inches,
      gauge: product?.gauge,
      lengthFeet: product?.length_feet,
    });

    if (unitWeight == null) {
      console.error("MISSING_WEIGHT");
      throw new ShipmentDataError(
        "missing_weight",
        `MISSING_WEIGHT: ${product?.slug || row?.sku || "product"} is missing package weight. Fill product_variants.box_weight_lbs and product_variants.pallet_weight_lbs.`
      );
    }

    const lineBoxes = packageBoxes * quantity;
    const lineRolls = packageRolls * quantity;
    const packed =
      application === "machine"
        ? null
        : packHandShippingUnits({
            boxes: lineBoxes,
            boxWeightLbs,
            palletWeightLbs,
          });
    const productLabel = product?.slug || row?.sku || "product";
    const fullHeight = resolveFullPalletHeight({
      palletDimensions: product?.pallet_dimensions,
      palletHeightIn: product?.pallet_height_in,
      application,
      widthInches: product?.width_inches,
    });
    if (packed) {
      for (const part of packed) {
        const tier = handTierName(part.tier);
        const inches = fullHeight
          ? tierInchesFromFullHeight({
              fullHeightIn: fullHeight.heightIn,
              tier,
              looseBoxes: part.tier === "loose" ? part.boxes : 1,
              box: product
                ? {
                    lengthIn: product.box_length_in ?? null,
                    widthIn: product.box_width_in ?? null,
                    heightIn: product.box_height_in ?? null,
                  }
                : null,
            })
          : null;
        if (!inches) {
          throw new ShipmentDataError(
            "missing_dims",
            `MISSING_DIMS: ${productLabel} ${tier} has no full-pallet height. products.pallet_dimensions needs LENGTH x WIDTH x HEIGHT.`
          );
        }
        const loosePallet = part.tier === "loose" && LOOSE_BOX_MODE === "pallet";
        const pieceWeight = part.weightLbs;
        if (!(pieceWeight > 0)) {
          throw new ShipmentDataError(
            "missing_weight",
            `MISSING_WEIGHT: ${productLabel} ${tier} has no package weight.`
          );
        }
        const pieceQuantity = loosePallet ? 1 : part.tier === "loose" || part.tier === "full" ? part.quantity : 1;
        const packaging = part.tier === "full" || part.tier === "half" || loosePallet ? "pallet" : "box";
        const shownBoxes =
          part.tier === "loose"
            ? part.boxes
            : part.tier === "full"
              ? 64 * part.quantity
              : part.tier === "half"
                ? 32
                : 16;
        pieces.push({
          lengthIn: inches.lengthIn,
          widthIn: inches.widthIn,
          heightIn: inches.heightIn,
          weightLbs: pieceWeight,
          quantity: pieceQuantity,
          packaging,
          dimensionLabel: formatFreightDimensions(inches),
          weightLabel: formatFreightWeightLabel(pieceWeight, handHandlingUnit(shownBoxes)),
        });
        weightLbs += pieceWeight;
        palletCount += packaging === "pallet" ? pieceQuantity : 0;
      }
    } else if (application !== "machine") {
      throw new ShipmentDataError(
        "missing_weight",
        `MISSING_WEIGHT: ${productLabel} is missing box or pallet weight for its package tier. Fill product_variants.box_weight_lbs and product_variants.pallet_weight_lbs.`
      );
    } else {
      if (packageRolls !== 20 && packageRolls !== 40) {
        throw new ShipmentDataError(
          "missing_dims",
          `MISSING_DIMS: ${productLabel} is not a half pallet (20 rolls) or full pallet (40 rolls).`
        );
      }
      const machineTier = packageRolls === 40 ? "full" : "half";
      const machineInches = fullHeight
        ? tierInchesFromFullHeight({ fullHeightIn: fullHeight.heightIn, tier: machineTier })
        : null;
      if (!machineInches) {
        throw new ShipmentDataError(
          "missing_dims",
          `MISSING_DIMS: ${productLabel} ${machineTier === "full" ? "full pallet" : "half pallet"} has no full-pallet height. products.pallet_dimensions needs LENGTH x WIDTH x HEIGHT.`
        );
      }
      const unit = {
        ...machineInches,
        quantity,
        includesPalletTare: true,
        packaging: "pallet" as const,
      };
      const lineWeight = Math.round(unitWeight * quantity * 100) / 100;
      if (!(lineWeight > 0)) {
        throw new ShipmentDataError(
          "missing_weight",
          `MISSING_WEIGHT: ${productLabel} has no package weight.`
        );
      }
      pieces.push({
        lengthIn: unit.lengthIn,
        widthIn: unit.widthIn,
        heightIn: unit.heightIn,
        weightLbs: lineWeight,
        quantity: unit.quantity,
        packaging: unit.packaging,
        dimensionLabel: formatFreightDimensions(unit),
        weightLabel: formatFreightWeightLabel(lineWeight, unit),
      });
      weightLbs += lineWeight;
      palletCount += unit.packaging === "pallet" ? unit.quantity : 0;
    }
    rolls += lineRolls;
    boxes += lineBoxes;
  }

  if (weightLbs <= 0) {
    console.error("MISSING_WEIGHT");
    throw new ShipmentDataError(
      "missing_weight",
      "Product weight is missing, so shipping can't be calculated yet."
    );
  }

  const primary = pieces[0];
  return {
    weightLbs: Math.round(weightLbs * 100) / 100,
    palletCount: Math.max(1, palletCount || pieces.length),
    lengthIn: primary?.lengthIn ?? 0,
    widthIn: primary?.widthIn ?? 0,
    heightIn: primary?.heightIn ?? 0,
    rolls,
    boxes,
    pieces,
  };
}
