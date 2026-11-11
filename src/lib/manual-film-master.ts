/**
 * Verified Manual stretch film master sheet.
 * Roll weight is sourced in KG (with core). Box and pallet lbs are derived:
 *   box_lbs    = (roll_kg × 4 + 0.450 kg carton) × 2.20462
 *   pallet_lbs = (box_lbs × 48) + 40 lb wooden pallet
 */
import { HAND_FULL_PALLET_BOXES, HAND_FULL_PALLET_ROLLS, roundMoney } from "@/lib/pricing";
import {
  HAND_FULL_PALLET_DIMENSIONS_15,
  HAND_FULL_PALLET_DIMENSIONS_18,
} from "@/lib/shipping/hand-freight";

export const KG_TO_LB = 2.20462;
export const HAND_CARTON_KG = 0.45;
/** Manual full-pallet wooden deck tare (Excel master). */
export const HAND_WOODEN_PALLET_TARE_LBS = 40;
export const HAND_MASTER_ROLLS_PER_BOX = 4;
export const HAND_MASTER_BOXES_PER_PALLET = HAND_FULL_PALLET_BOXES;
export const HAND_MASTER_ROLLS_PER_PALLET = HAND_FULL_PALLET_ROLLS;

export interface ManualFilmDerivedWeights {
  rollWeightKg: number;
  rollWeightLbs: number;
  boxWeightLbs: number;
  fullPalletWeightLbs: number;
}

export function deriveManualFilmWeights(rollWeightKg: number): ManualFilmDerivedWeights {
  const kg = Number(rollWeightKg);
  if (!Number.isFinite(kg) || kg <= 0) {
    return { rollWeightKg: 0, rollWeightLbs: 0, boxWeightLbs: 0, fullPalletWeightLbs: 0 };
  }
  const rollWeightLbs = roundMoney(kg * KG_TO_LB);
  const boxWeightLbs = roundMoney((kg * HAND_MASTER_ROLLS_PER_BOX + HAND_CARTON_KG) * KG_TO_LB);
  const fullPalletWeightLbs = roundMoney(
    boxWeightLbs * HAND_MASTER_BOXES_PER_PALLET + HAND_WOODEN_PALLET_TARE_LBS
  );
  return { rollWeightKg: kg, rollWeightLbs, boxWeightLbs, fullPalletWeightLbs };
}

export interface ManualFilmMasterRow {
  slug: string;
  widthInches: 15 | 18;
  gauge: 40 | 60 | 70 | 80;
  lengthFeet: 1000 | 1500;
  /** Exact roll weight with core from the rate sheet (kg). */
  rollWeightKg: number;
  /** Null when the SKU is stocked for freight only and has no published box rate. */
  price1Box: number | null;
  priceFullPalletBox: number | null;
  fullPalletTotal: number | null;
  palletDimensions: string;
}

/**
 * KG values are the existing official roll lbs converted at 2.20462 so the published
 * roll-lb figures stay stable while box/pallet follow the Excel formulas.
 */
const MANUAL_FILM_SOURCE: readonly Omit<
  ManualFilmMasterRow,
  "palletDimensions"
>[] = [
  {
    slug: "stretch-film-15-x-40-ga-x-1500ft",
    widthInches: 15,
    gauge: 40,
    lengthFeet: 1500,
    rollWeightKg: 2.041,
    price1Box: null,
    priceFullPalletBox: null,
    fullPalletTotal: null,
  },
  {
    slug: "stretch-film-15-x-60-ga-x-1000ft",
    widthInches: 15,
    gauge: 60,
    lengthFeet: 1000,
    rollWeightKg: 2.458,
    price1Box: 21.32,
    priceFullPalletBox: 20.39,
    fullPalletTotal: 978.72,
  },
  {
    slug: "stretch-film-15-x-60-ga-x-1500ft",
    widthInches: 15,
    gauge: 60,
    lengthFeet: 1500,
    rollWeightKg: 2.849,
    price1Box: null,
    priceFullPalletBox: null,
    fullPalletTotal: null,
  },
  {
    slug: "stretch-film-15-x-70-ga-x-1500ft",
    widthInches: 15,
    gauge: 70,
    lengthFeet: 1500,
    rollWeightKg: 3.261,
    price1Box: 35.06,
    priceFullPalletBox: 33.42,
    fullPalletTotal: 1604.16,
  },
  {
    slug: "stretch-film-15-x-80-ga-x-1500ft",
    widthInches: 15,
    gauge: 80,
    lengthFeet: 1500,
    rollWeightKg: 3.67,
    price1Box: null,
    priceFullPalletBox: null,
    fullPalletTotal: null,
  },
  {
    slug: "stretch-film-18-x-60-ga-x-1000ft",
    widthInches: 18,
    gauge: 60,
    lengthFeet: 1000,
    rollWeightKg: 2.79,
    price1Box: 24.98,
    priceFullPalletBox: 23.86,
    fullPalletTotal: 1145.28,
  },
  {
    slug: "stretch-film-18-x-60-ga-x-1500ft",
    widthInches: 18,
    gauge: 60,
    lengthFeet: 1500,
    rollWeightKg: 3.452,
    price1Box: 35.98,
    priceFullPalletBox: 34.29,
    fullPalletTotal: 1645.92,
  },
  {
    slug: "stretch-film-18-x-70-ga-x-1000ft",
    widthInches: 18,
    gauge: 70,
    lengthFeet: 1000,
    rollWeightKg: 3.121,
    price1Box: 28.65,
    priceFullPalletBox: 27.34,
    fullPalletTotal: 1312.32,
  },
  {
    slug: "stretch-film-18-x-70-ga-x-1500ft",
    widthInches: 18,
    gauge: 70,
    lengthFeet: 1500,
    rollWeightKg: 3.942,
    price1Box: 41.47,
    priceFullPalletBox: 39.51,
    fullPalletTotal: 1896.48,
  },
  {
    slug: "stretch-film-18-x-80-ga-x-1000ft",
    widthInches: 18,
    gauge: 80,
    lengthFeet: 1000,
    rollWeightKg: 3.928,
    price1Box: 32.31,
    priceFullPalletBox: 30.82,
    fullPalletTotal: 1479.36,
  },
  {
    slug: "stretch-film-18-x-80-ga-x-1500ft",
    widthInches: 18,
    gauge: 80,
    lengthFeet: 1500,
    rollWeightKg: 4.432,
    price1Box: 46.97,
    priceFullPalletBox: 44.72,
    fullPalletTotal: 2146.56,
  },
] as const;

export type ManualFilmCatalogRow = ManualFilmMasterRow & ManualFilmDerivedWeights;

export const MANUAL_FILM_MASTER: readonly ManualFilmCatalogRow[] = MANUAL_FILM_SOURCE.map((row) => {
  const weights = deriveManualFilmWeights(row.rollWeightKg);
  return {
    ...row,
    ...weights,
    palletDimensions:
      row.widthInches === 15 ? HAND_FULL_PALLET_DIMENSIONS_15 : HAND_FULL_PALLET_DIMENSIONS_18,
  };
});

export function findManualFilmMaster(input: {
  widthInches?: number | string | null;
  gauge?: number | string | null;
  lengthFeet?: number | string | null;
  slug?: string | null;
}): ManualFilmCatalogRow | null {
  const slug = String(input.slug || "").trim().toLowerCase();
  if (slug) {
    const bySlug = MANUAL_FILM_MASTER.find((row) => row.slug === slug);
    if (bySlug) return bySlug;
  }
  const width = Math.round(Number(input.widthInches) || 0);
  const gauge = Math.round(Number(input.gauge) || 0);
  const length = Math.round(Number(input.lengthFeet) || 0);
  return (
    MANUAL_FILM_MASTER.find(
      (row) => row.widthInches === width && row.gauge === gauge && row.lengthFeet === length
    ) ?? null
  );
}

export function pricedManualFilmRows(): ManualFilmCatalogRow[] {
  return MANUAL_FILM_MASTER.filter(
    (row) => row.price1Box != null && row.priceFullPalletBox != null && row.fullPalletTotal != null
  );
}
