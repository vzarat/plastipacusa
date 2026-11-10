/**
 * Official Manual / hand stretch film box rates (per box).
 * Full pallet = 48 boxes / 192 rolls. Line total = rate × boxes.
 */
import { HAND_FULL_PALLET_BOXES, HAND_FULL_PALLET_ROLLS, quoteTierPrice, roundMoney } from "@/lib/pricing";

export interface ManualFilmRateRow {
  widthInches: 15 | 18;
  gauge: 60 | 70 | 80;
  lengthFeet: 1000 | 1500;
  /** Per-box rate for the 1 Box tier. */
  price1Box: number;
  /** Discounted per-box rate for Full Pallet (48 boxes). */
  priceFullPalletBox: number;
  /** Convenience: priceFullPalletBox × 48. */
  fullPalletTotal: number;
  slug: string;
}

export const MANUAL_FILM_OFFICIAL_RATES: readonly ManualFilmRateRow[] = [
  {
    widthInches: 15,
    gauge: 60,
    lengthFeet: 1000,
    price1Box: 21.32,
    priceFullPalletBox: 20.39,
    fullPalletTotal: 978.72,
    slug: "stretch-film-15-x-60-ga-x-1000ft",
  },
  {
    widthInches: 15,
    gauge: 70,
    lengthFeet: 1500,
    price1Box: 35.06,
    priceFullPalletBox: 33.42,
    fullPalletTotal: 1604.16,
    slug: "stretch-film-15-x-70-ga-x-1500ft",
  },
  {
    widthInches: 18,
    gauge: 60,
    lengthFeet: 1000,
    price1Box: 24.98,
    priceFullPalletBox: 23.86,
    fullPalletTotal: 1145.28,
    slug: "stretch-film-18-x-60-ga-x-1000ft",
  },
  {
    widthInches: 18,
    gauge: 60,
    lengthFeet: 1500,
    price1Box: 35.98,
    priceFullPalletBox: 34.29,
    fullPalletTotal: 1645.92,
    slug: "stretch-film-18-x-60-ga-x-1500ft",
  },
  {
    widthInches: 18,
    gauge: 70,
    lengthFeet: 1000,
    price1Box: 28.65,
    priceFullPalletBox: 27.34,
    fullPalletTotal: 1312.32,
    slug: "stretch-film-18-x-70-ga-x-1000ft",
  },
  {
    widthInches: 18,
    gauge: 70,
    lengthFeet: 1500,
    price1Box: 41.47,
    priceFullPalletBox: 39.51,
    fullPalletTotal: 1896.48,
    slug: "stretch-film-18-x-70-ga-x-1500ft",
  },
  {
    widthInches: 18,
    gauge: 80,
    lengthFeet: 1000,
    price1Box: 32.31,
    priceFullPalletBox: 30.82,
    fullPalletTotal: 1479.36,
    slug: "stretch-film-18-x-80-ga-x-1000ft",
  },
  {
    widthInches: 18,
    gauge: 80,
    lengthFeet: 1500,
    price1Box: 46.97,
    priceFullPalletBox: 44.72,
    fullPalletTotal: 2146.56,
    slug: "stretch-film-18-x-80-ga-x-1500ft",
  },
] as const;

export function findManualFilmRate(input: {
  widthInches?: number | string | null;
  gauge?: number | string | null;
  lengthFeet?: number | string | null;
  slug?: string | null;
}): ManualFilmRateRow | null {
  const slug = String(input.slug || "").trim().toLowerCase();
  if (slug) {
    const bySlug = MANUAL_FILM_OFFICIAL_RATES.find((row) => row.slug === slug);
    if (bySlug) return bySlug;
  }
  const width = Math.round(Number(input.widthInches) || 0);
  const gauge = Math.round(Number(input.gauge) || 0);
  const length = Math.round(Number(input.lengthFeet) || 0);
  return (
    MANUAL_FILM_OFFICIAL_RATES.find(
      (row) => row.widthInches === width && row.gauge === gauge && row.lengthFeet === length
    ) ?? null
  );
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
