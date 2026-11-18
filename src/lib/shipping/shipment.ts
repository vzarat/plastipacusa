import { catalogSkuCandidates, canonicalCatalogSku, catalogSkusMatch } from "@/lib/catalog-sku";
import { createServerClient } from "@/lib/supabase/server";
import {
  createServiceRoleClient,
  isServiceRoleConfigured,
} from "@/lib/supabase/admin";
import { findManualFilmMaster } from "@/lib/manual-film-master";
import { findMachineFilmMaster } from "@/lib/machine-film-master";
import { packageTotalWeightLbs } from "@/lib/package-weight";
import { HAND_FULL_PALLET_BOXES } from "@/lib/pricing";
import { groupLinesBySku } from "@/lib/shipping/catalog-freight";
import {
  formatFreightDimensions,
  formatFreightWeightLabel,
  formatHandMatrixDimensions,
  formatHandMatrixWeight,
  warpHandPieces,
} from "@/lib/shipping/hand-freight";
import { ShipmentDataError } from "@/lib/shipping/shipment-error";
import type { FreightPiece, ShipmentFreight, ShippingQuoteLine } from "@/lib/shipping/types";

export { ShipmentDataError };

const VARIANT_FREIGHT_SELECTS = [
  "sku, rolls_count, rolls_per_box, boxes_count, roll_weight_lbs, box_weight_lbs, pallet_weight_lbs, products(slug, application, roll_weight_lbs, pallet_weight_lbs, pallet_dimensions, rolls_per_box, width_inches, gauge, length_feet)",
  "sku, rolls_count, boxes_count, roll_weight_lbs, box_weight_lbs, pallet_weight_lbs, products(slug, application, roll_weight_lbs, pallet_weight_lbs, pallet_dimensions, rolls_per_box, width_inches, gauge, length_feet)",
  "sku, rolls_count, boxes_count, roll_weight_lbs, pallet_weight_lbs, products(slug, application, roll_weight_lbs, pallet_weight_lbs, pallet_dimensions, width_inches, gauge, length_feet)",
  "sku, rolls_count, boxes_count, roll_weight_lbs, pallet_weight_lbs, products(slug, application, roll_weight_lbs, pallet_weight_lbs, pallet_dimensions, width_inches, gauge, length_feet)",
] as const;

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
  /** Some live rows store package rolls here instead of rolls_count. */
  rolls_per_box?: number | null;
  boxes_count: number | null;
  roll_weight_lbs: number | null;
  box_weight_lbs: number | null;
  pallet_weight_lbs: number | null;
  products: FreightProduct | FreightProduct[] | null;
}

function looksLikeMachineFilm(input: {
  application?: string | null;
  sku?: string | null;
  slug?: string | null;
  widthInches?: number | string | null;
}): boolean {
  const application = String(input.application || "").toLowerCase();
  if (application === "machine") return true;
  if (application === "hand") return false;
  const sku = String(input.sku || "").toUpperCase();
  const slug = String(input.slug || "").toLowerCase();
  if (/-HLP$|-FLP$|-(20|40)R$/.test(sku) || /HPF-SF20|HPFSF20|GENESIS-MACHINE/.test(sku)) {
    return true;
  }
  if (slug.includes("genesis") || /stretch-film-20-/.test(slug)) return true;
  return Math.round(Number(input.widthInches) || 0) === 20;
}

/** Infer Automatic half/full from SKU when rolls_count is missing. */
function resolveMachinePackageRolls(input: {
  rolls: number;
  sku?: string | null;
}): number {
  if (input.rolls === 20 || input.rolls === 40) return input.rolls;
  const sku = String(input.sku || "").toUpperCase();
  if (/-HLP$|-(20)R$/.test(sku)) return 20;
  if (/-FLP$|-(40)R$/.test(sku) || /FULL/.test(sku)) return 40;
  return input.rolls > 0 ? input.rolls : 0;
}

/** Hand film: recover boxes/rolls when the catalog row only stores one of them. */
function resolveHandPackageCounts(input: {
  rolls: number;
  boxes: number;
  sku?: string | null;
}): { rolls: number; boxes: number } {
  let rolls = Math.max(0, Math.round(Number(input.rolls) || 0));
  let boxes = Math.max(0, Math.floor(Number(input.boxes) || 0));

  // rolls_per_box is often 4 on full-pallet rows; prefer boxes_count when both disagree.
  if (boxes >= HAND_FULL_PALLET_BOXES && rolls > 0 && rolls < boxes) {
    rolls = boxes * 4;
  } else if (boxes <= 0 && rolls > 0) {
    boxes = Math.max(1, Math.round(rolls / 4));
  } else if (rolls <= 0 && boxes > 0) {
    rolls = boxes * 4;
  }
  if (boxes > 0 && rolls > 0) return { rolls, boxes };

  // Live hand SKUs: -1B box, -64B/48B/FULL pallet (48 boxes / 192 rolls).
  const sku = String(input.sku || "").toUpperCase();
  if (/(FULL|48B|64B|192R)/.test(sku) || /-(48|64)B$/.test(sku)) {
    return { rolls: HAND_FULL_PALLET_BOXES * 4, boxes: HAND_FULL_PALLET_BOXES };
  }
  if (/-(16)B$/.test(sku)) return { rolls: 64, boxes: 16 };
  if (/-(32)B$/.test(sku)) return { rolls: 128, boxes: 32 };
  if (/-(1)B$/.test(sku) || /\b1B\b/.test(sku)) {
    return { rolls: 4, boxes: 1 };
  }
  return { rolls, boxes };
}

async function loadFreightVariantsBySku(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  skus: string[]
): Promise<FreightVariant[]> {
  if (skus.length === 0) return [];
  for (const select of VARIANT_FREIGHT_SELECTS) {
    const { data, error } = await supabase.from("product_variants").select(select).in("sku", skus);
    if (!error) return (data || []) as unknown as FreightVariant[];
    console.error(
      JSON.stringify({
        source: "shipping-quote",
        stage: "catalog-weights",
        message: error.message,
      })
    );
  }
  return [];
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

  const supabase = isServiceRoleConfigured()
    ? createServiceRoleClient()
    : await createServerClient();
  const skus = [
    ...new Set(
      requested.flatMap((line) => catalogSkuCandidates(String(line.sku || ""))).filter(Boolean)
    ),
  ];
  const slugs = [
    ...new Set(requested.map((line) => String(line.productSlug || "").trim()).filter(Boolean)),
  ];

  let rows: FreightVariant[] = await loadFreightVariantsBySku(supabase, skus);

  if (slugs.length > 0) {
    for (const select of [
      "sku, rolls_count, rolls_per_box, boxes_count, roll_weight_lbs, box_weight_lbs, pallet_weight_lbs, products!inner(slug, application, roll_weight_lbs, pallet_weight_lbs, pallet_dimensions, rolls_per_box, width_inches, gauge, length_feet)",
      "sku, rolls_count, boxes_count, roll_weight_lbs, box_weight_lbs, pallet_weight_lbs, products!inner(slug, application, roll_weight_lbs, pallet_weight_lbs, pallet_dimensions, width_inches, gauge, length_feet)",
      "sku, rolls_count, boxes_count, roll_weight_lbs, pallet_weight_lbs, products!inner(slug, application, roll_weight_lbs, pallet_weight_lbs, pallet_dimensions, width_inches, gauge, length_feet)",
    ]) {
      const { data, error } = await supabase
        .from("product_variants")
        .select(select)
        .in("products.slug", slugs);
      if (error) continue;
      const known = new Set(rows.map((row) => String(row.sku || "")));
      for (const row of (data || []) as unknown as FreightVariant[]) {
        const sku = String(row.sku || "");
        if (!sku || known.has(sku)) continue;
        known.add(sku);
        rows.push(row);
      }
      break;
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
      console.error(
        JSON.stringify({
          source: "shipping-quote",
          stage: "catalog-weights",
          message: error.message,
        })
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

function freightVariantFor(lineSku: string | null | undefined, rows: FreightVariant[]): FreightVariant | undefined {
  const requested = String(lineSku || "").trim();
  if (!requested) return undefined;
  const matches = rows.filter((item) => item.sku && catalogSkusMatch(requested, item.sku));
  const canonical = canonicalCatalogSku(requested);
  return (
    matches.find((item) => String(item.sku).trim().toUpperCase() === canonical) ||
    matches.find((item) => String(item.sku).trim().toUpperCase() === requested.toUpperCase()) ||
    matches[0]
  );
}

/** Catalog weights win. A positive line.weightLbs is the spec-matrix gross for one package when the catalog row has none. */
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
    const row = freightVariantFor(line.sku, rows);
    const product =
      productOf(row) || productsBySlug.get(String(line.productSlug || "")) || null;
    const sku = String(row?.sku || line.sku || "");
    const slug = String(product?.slug || line.productSlug || "");
    const clientWeight = positive(line.weightLbs);
    const machine = looksLikeMachineFilm({
      application: product?.application || line.application,
      sku,
      slug,
      widthInches: product?.width_inches,
    });
    const rollsCount = positive(row?.rolls_count);
    const rollsPerBoxField = positive(row?.rolls_per_box);
    // Prefer true package roll totals; rolls_per_box is often just "4" even on pallet rows.
    const rawRolls =
      rollsCount ??
      (rollsPerBoxField != null && rollsPerBoxField !== 4 ? rollsPerBoxField : null) ??
      positive(line.totalRolls) ??
      0;
    const rawBoxes = positive(row?.boxes_count) ?? positive(line.totalBoxes) ?? 0;

    let packageRolls = 0;
    let packageBoxes = 0;
    if (machine) {
      packageRolls = resolveMachinePackageRolls({ rolls: rawRolls, sku });
      packageBoxes = 0;
    } else {
      const resolved = resolveHandPackageCounts({ rolls: rawRolls, boxes: rawBoxes, sku });
      packageRolls = resolved.rolls;
      packageBoxes = resolved.boxes;
    }

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
    const handMaster = machine
      ? null
      : findManualFilmMaster({
          slug,
          widthInches: product?.width_inches,
          gauge: product?.gauge,
          lengthFeet: product?.length_feet,
        });
    const machineMaster = machine
      ? findMachineFilmMaster({
          slug,
          partNumber: sku,
          widthInches: product?.width_inches,
          gauge: product?.gauge,
          lengthFeet: product?.length_feet,
        })
      : null;

    if (machine && packageRolls !== 20 && packageRolls !== 40) {
      packageRolls = resolveMachinePackageRolls({ rolls: 0, sku });
      if (packageRolls !== 20 && packageRolls !== 40 && machineMaster) {
        // Official Automatic SKUs are only sold as half (20) or full (40).
        packageRolls = /HLP|20R/i.test(sku) ? 20 : 40;
      }
    }
    if (!machine && packageBoxes <= 0 && packageRolls <= 0) {
      const fromSku = resolveHandPackageCounts({ rolls: 0, boxes: 0, sku });
      packageRolls = fromSku.rolls;
      packageBoxes = fromSku.boxes;
    }

    const rollWeightLbs =
      positive(row?.roll_weight_lbs) ??
      siblingWeight("roll_weight_lbs") ??
      positive(product?.roll_weight_lbs) ??
      (handMaster ? handMaster.rollWeightLbs : null) ??
      (machineMaster ? machineMaster.rollWeightLbs : null);
    const boxWeightLbs =
      positive(row?.box_weight_lbs) ??
      siblingWeight("box_weight_lbs") ??
      (handMaster ? handMaster.boxWeightLbs : null);
    const palletWeightLbs =
      positive(row?.pallet_weight_lbs) ??
      siblingWeight("pallet_weight_lbs") ??
      positive(product?.pallet_weight_lbs) ??
      (handMaster ? handMaster.fullPalletWeightLbs : null) ??
      (machineMaster
        ? packageRolls === 20
          ? machineMaster.halfPalletWeightLbs
          : machineMaster.fullPalletWeightLbs
        : null);

    let unitWeight =
      packageTotalWeightLbs({
        rolls: packageRolls,
        boxes: packageBoxes,
        rollWeightLbs,
        boxWeightLbs,
        palletWeightLbs,
        weightLbs: clientWeight,
        machine,
        widthInches: product?.width_inches ?? machineMaster?.widthInches ?? handMaster?.widthInches,
        gauge: product?.gauge ?? machineMaster?.gauge ?? handMaster?.gauge,
        lengthFeet: product?.length_feet ?? machineMaster?.lengthFeet ?? handMaster?.lengthFeet,
      }) ?? clientWeight;

    if (unitWeight == null && machine && machineMaster && (packageRolls === 20 || packageRolls === 40)) {
      unitWeight =
        packageRolls === 20
          ? machineMaster.halfPalletWeightLbs
          : machineMaster.fullPalletWeightLbs;
    }
    if (unitWeight == null && handMaster) {
      unitWeight =
        packageBoxes >= HAND_FULL_PALLET_BOXES || packageRolls >= 192
          ? handMaster.fullPalletWeightLbs
          : handMaster.boxWeightLbs;
    }

    if (unitWeight == null || !(unitWeight > 0)) {
      console.error("MISSING_WEIGHT", { sku, slug, packageRolls, packageBoxes, machine });
      throw new ShipmentDataError(
        "missing_weight",
        `MISSING_WEIGHT: ${slug || sku || "product"} is missing package weight. Fill product_variants.box_weight_lbs and product_variants.pallet_weight_lbs.`
      );
    }

    const lineBoxes = packageBoxes * quantity;
    const lineRolls = packageRolls * quantity;
    const productLabel = slug || sku || "product";
    if (!machine) {
      const widthInches =
        product?.width_inches ?? handMaster?.widthInches ?? undefined;
      const palletDimensions =
        product?.pallet_dimensions ?? handMaster?.palletDimensions ?? null;
      const handPieces = warpHandPieces({
        boxes: Math.max(lineBoxes, packageBoxes > 0 ? packageBoxes * quantity : 0),
        widthInches,
        palletDimensions,
        boxWeightLbs,
        palletWeightLbs,
      }) ??
        (unitWeight > 0 && (lineBoxes > 0 || packageRolls >= 4)
          ? (() => {
              const dims =
                parsePalletDimensions(palletDimensions) ??
                (Math.round(Number(widthInches) || 0) === 15
                  ? { lengthIn: 48, widthIn: 40, heightIn: 68 }
                  : { lengthIn: 48, widthIn: 48, heightIn: 78 });
              const isFull = lineBoxes >= 48 || packageRolls >= 192 || packageBoxes >= 48;
              return [
                {
                  lengthIn: isFull ? dims.lengthIn : 11,
                  widthIn: isFull ? dims.widthIn : 11,
                  heightIn: isFull ? dims.heightIn : 19.5,
                  weightLbs: unitWeight * quantity,
                  quantity: isFull ? quantity : Math.max(1, lineBoxes || quantity),
                  packaging: (isFull ? "pallet" : "box") as "pallet" | "box",
                },
              ];
            })()
          : null);
      if (!handPieces) {
        throw new ShipmentDataError(
          "missing_weight",
          `MISSING_WEIGHT: ${productLabel} is missing box or pallet weight for its package tier. Fill product_variants.box_weight_lbs and product_variants.pallet_weight_lbs.`
        );
      }
      for (const handPiece of handPieces) {
        pieces.push({
          lengthIn: handPiece.lengthIn,
          widthIn: handPiece.widthIn,
          heightIn: handPiece.heightIn,
          weightLbs: handPiece.weightLbs,
          quantity: handPiece.quantity,
          packaging: handPiece.packaging,
          dimensionLabel: formatHandMatrixDimensions(handPiece),
          weightLabel: formatHandMatrixWeight(
            handPiece.quantity > 1 ? handPiece.weightLbs / handPiece.quantity : handPiece.weightLbs
          ),
        });
        weightLbs += handPiece.weightLbs;
        palletCount += handPiece.packaging === "pallet" ? handPiece.quantity : 0;
      }
    } else {
      if (packageRolls !== 20 && packageRolls !== 40) {
        throw new ShipmentDataError(
          "missing_dims",
          `MISSING_DIMS: ${productLabel} is not a half pallet (20 rolls) or full pallet (40 rolls).`
        );
      }
      // Automatic matrix: 48" L × 40" W × 46" H. Use packageTotalWeightLbs
      // (master scale half/full weights with tare) — never full÷2.
      const unit = {
        lengthIn: 48,
        widthIn: 40,
        heightIn: 46,
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
