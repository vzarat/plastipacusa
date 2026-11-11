/**
 * Official Manual / hand stretch film box rates (per box).
 * Full pallet = 48 boxes / 192 rolls. Line total = rate × boxes.
 * Weights live in manual-film-master.ts (Excel formulas).
 */
import {
  MANUAL_FILM_MASTER,
  findManualFilmMaster,
  pricedManualFilmRows,
  type ManualFilmCatalogRow,
} from "@/lib/manual-film-master";
import { HAND_FULL_PALLET_BOXES, HAND_FULL_PALLET_ROLLS, quoteTierPrice, roundMoney } from "@/lib/pricing";

export interface ManualFilmRateRow {
  widthInches: 15 | 18;
  gauge: 40 | 60 | 70 | 80;
  lengthFeet: 1000 | 1500;
  /** Per-box rate for the 1 Box tier. */
  price1Box: number;
  /** Discounted per-box rate for Full Pallet (48 boxes). */
  priceFullPalletBox: number;
  /** Convenience: priceFullPalletBox × 48. */
  fullPalletTotal: number;
  slug: string;
  rollWeightKg: number;
  rollWeightLbs: number;
  boxWeightLbs: number;
  fullPalletWeightLbs: number;
  palletDimensions: string;
}

function toRateRow(row: ManualFilmCatalogRow): ManualFilmRateRow | null {
  if (row.price1Box == null || row.priceFullPalletBox == null || row.fullPalletTotal == null) {
    return null;
  }
  return {
    widthInches: row.widthInches,
    gauge: row.gauge,
    lengthFeet: row.lengthFeet,
    price1Box: row.price1Box,
    priceFullPalletBox: row.priceFullPalletBox,
    fullPalletTotal: row.fullPalletTotal,
    slug: row.slug,
    rollWeightKg: row.rollWeightKg,
    rollWeightLbs: row.rollWeightLbs,
    boxWeightLbs: row.boxWeightLbs,
    fullPalletWeightLbs: row.fullPalletWeightLbs,
    palletDimensions: row.palletDimensions,
  };
}

export const MANUAL_FILM_OFFICIAL_RATES: readonly ManualFilmRateRow[] = pricedManualFilmRows()
  .map(toRateRow)
  .filter((row): row is ManualFilmRateRow => row != null);

export function findManualFilmRate(input: {
  widthInches?: number | string | null;
  gauge?: number | string | null;
  lengthFeet?: number | string | null;
  slug?: string | null;
}): ManualFilmRateRow | null {
  const master = findManualFilmMaster(input);
  return master ? toRateRow(master) : null;
}

/** Validate published totals match per-box × 48. */
export function assertManualFilmRateTotals(): void {
  for (const row of MANUAL_FILM_OFFICIAL_RATES) {
    const expected = roundMoney(row.priceFullPalletBox * HAND_FULL_PALLET_BOXES);
    if (expected !== row.fullPalletTotal) {
      throw new Error(
        `${row.slug}: full pallet total ${row.fullPalletTotal} != ${row.priceFullPalletBox} × ${HAND_FULL_PALLET_BOXES}`
      );
    }
  }
}

export function quoteManualFilmLine(
  row: ManualFilmRateRow,
  tier: "box" | "full",
  quantity = 1
): { pricePerBox: number; boxes: number; rolls: number; packageTotal: number; lineTotal: number } {
  const qty = Math.max(1, Math.floor(Number(quantity) || 1));
  if (tier === "box") {
    const packageTotal = roundMoney(row.price1Box);
    return {
      pricePerBox: row.price1Box,
      boxes: 1,
      rolls: 4,
      packageTotal,
      lineTotal: roundMoney(packageTotal * qty),
    };
  }
  const quote = quoteTierPrice(row.priceFullPalletBox, HAND_FULL_PALLET_BOXES, qty);
  return {
    pricePerBox: quote.pricePerBox,
    boxes: HAND_FULL_PALLET_BOXES,
    rolls: HAND_FULL_PALLET_ROLLS,
    packageTotal: roundMoney(row.priceFullPalletBox * HAND_FULL_PALLET_BOXES),
    lineTotal: quote.total,
  };
}

export { MANUAL_FILM_MASTER, findManualFilmMaster };
