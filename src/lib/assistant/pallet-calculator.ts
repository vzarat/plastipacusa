import { packageTotalWeightLbs } from "@/lib/package-weight";
import { roundMoney } from "@/lib/sales-tax";
import {
  HAND_PACKAGE_LADDER,
  validateCatalogSpec,
  validatePackageQuantity,
} from "@/lib/assistant/packaging-rules";
import { totalForBoxes, unitBoxPriceForCount, type BoxTierPrices } from "@/lib/pricing";
import type { AssistantResult, FilmKind, PackageTier } from "@/lib/assistant/types";

export interface PalletCalculatorInput {
  film: FilmKind;
  widthInches: number;
  tier: PackageTier;
  quantity: number;
  gauge?: number;
  lengthFeet?: number;
  series?: "standard" | "high_performance";
}

/** Prices loaded on the server from the catalog. Never accepted from the model. */
export interface CatalogPrice {
  /** price_1_box. Used only for the 1–15 box bracket. */
  boxPrice: number | null;
  price16Boxes?: number | null;
  price32Boxes?: number | null;
  price64Boxes?: number | null;
  halfPalletPrice: number | null;
  fullPalletPrice: number | null;
  rollWeightLbs: number | null;
  sku: string | null;
}

export interface PalletQuote {
  film: FilmKind;
  widthInches: number;
  tier: PackageTier;
  quantity: number;
  rolls: number;
  boxes: number;
  freightBoxCount: number;
  /** Catalog unit price, or "price_unavailable" when product_variants has no price. */
  price: number | "price_unavailable";
  unitPrice: number | null;
  totalPrice: number | null;
  weightLbs: number | null;
  sku: string | null;
}

function listedUnitPrice(amount: number | null | undefined): number | "price_unavailable" {
  return amount != null && amount > 0 ? amount : "price_unavailable";
}

export function palletCalculator(
  input: PalletCalculatorInput,
  catalog?: CatalogPrice | null
): AssistantResult<PalletQuote> {
  const validated = validatePackageQuantity(input);
  if (!validated.ok) return validated;
  const spec = validateCatalogSpec(input);
  if (!spec.ok) return spec;

  const gauge = spec.gauge;
  const lengthFeet = spec.lengthFeet;

  if (validated.film === "machine") {
    const listed =
      validated.tier === "half_pallet" ? catalog?.halfPalletPrice : catalog?.fullPalletPrice;
    const price = listedUnitPrice(listed);
    const unitPrice = price === "price_unavailable" ? null : price;
    const rollsEach = validated.tier === "half_pallet" ? 20 : 40;
    const weightEach = packageTotalWeightLbs({
      rolls: rollsEach,
      machine: true,
      widthInches: 20,
      gauge,
      lengthFeet,
      rollWeightLbs: catalog?.rollWeightLbs,
    });
    return {
      ok: true,
      film: "machine",
      widthInches: 20,
      tier: validated.tier,
      quantity: validated.quantity,
      rolls: validated.rolls,
      boxes: 0,
      freightBoxCount: validated.freightBoxCount,
      price,
      unitPrice,
      totalPrice: unitPrice != null ? roundMoney(unitPrice * validated.quantity) : null,
      weightLbs:
        weightEach != null && weightEach > 0 ? roundMoney(weightEach * validated.quantity) : null,
      sku: catalog?.sku ?? null,
    };
  }

  const ladder = HAND_PACKAGE_LADDER[validated.tier];
  const lineBoxes = ladder.boxes * validated.quantity;
  const tierPrices: BoxTierPrices = {
    price1Box: catalog?.boxPrice ?? null,
    price16Boxes: catalog?.price16Boxes ?? null,
    price32Boxes: catalog?.price32Boxes ?? null,
    price64Boxes: catalog?.price64Boxes ?? null,
  };
  const boxUnit = unitBoxPriceForCount(tierPrices, lineBoxes);
  const unitPrice = boxUnit != null ? totalForBoxes(boxUnit, ladder.boxes) : null;
  const price = listedUnitPrice(unitPrice);
  const weightEach = packageTotalWeightLbs({
    rolls: ladder.rolls,
    boxes: ladder.boxes,
    machine: false,
    widthInches: validated.widthInches,
    gauge,
    lengthFeet,
    rollWeightLbs: catalog?.rollWeightLbs,
  });

  return {
    ok: true,
    film: "hand",
    widthInches: validated.widthInches,
    tier: validated.tier,
    quantity: validated.quantity,
    rolls: validated.rolls,
    boxes: validated.boxes,
    freightBoxCount: validated.freightBoxCount,
    price,
    unitPrice,
    totalPrice: boxUnit != null ? totalForBoxes(boxUnit, lineBoxes) : null,
    weightLbs: weightEach != null ? roundMoney(weightEach * validated.quantity) : null,
    sku: catalog?.sku ?? null,
  };
}
