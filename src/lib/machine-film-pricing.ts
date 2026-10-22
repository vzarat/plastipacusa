/**
 * Automatic 20" film is sold by the roll. There are no boxes.
 * Half pallet is 20 rolls. Full pallet is 40 rolls.
 * The heavier 5,000 ft film (15.45 lb on the price sheet) is 80 GA.
 */
export const MACHINE_FILM_ROLL_PRICES = [
  { width: 20, gauge: 51, length: 7000, halfPerRoll: 50.84, fullPerRoll: 42.53 },
  { width: 20, gauge: 51, length: 9000, halfPerRoll: 64.16, fullPerRoll: 54.39 },
  { width: 20, gauge: 70, length: 5000, halfPerRoll: 49.93, fullPerRoll: 41.71 },
  { width: 20, gauge: 80, length: 5000, halfPerRoll: 56.46, fullPerRoll: 47.53 },
] as const;

export function machineFilmPerRollPrice(input: {
  widthInches?: number | string | null;
  gauge?: number | string | null;
  lengthFeet?: number | string | null;
  rolls?: number | string | null;
}): number | null {
  const width = Math.round(Number(input.widthInches) || 0);
  const gauge = Math.round(Number(input.gauge) || 0);
  const length = Math.round(Number(input.lengthFeet) || 0);
  const rolls = Math.round(Number(input.rolls) || 0);
  const spec = MACHINE_FILM_ROLL_PRICES.find(
    (row) => row.width === width && row.gauge === gauge && row.length === length
  );
  if (!spec || (rolls !== 20 && rolls !== 40)) return null;
  return rolls === 40 ? spec.fullPerRoll : spec.halfPerRoll;
}

/** Pallet total charged for one half pallet or one full pallet. */
export function machineFilmPackagePrice(input: {
  widthInches?: number | string | null;
  gauge?: number | string | null;
  lengthFeet?: number | string | null;
  rolls?: number | string | null;
}): number | null {
  const perRoll = machineFilmPerRollPrice(input);
  const rolls = Math.round(Number(input.rolls) || 0);
  if (perRoll == null || (rolls !== 20 && rolls !== 40)) return null;
  return Math.round(perRoll * rolls * 100) / 100;
}

const PACKAGE_PRICE_BY_SKU: Record<string, number> = {
  "HPF-SF205170-HLP": 1016.8,
  "HPF-SF205170-FLP": 1701.2,
  "HPF-SF205190-HLP": 1283.2,
  "HPF-SF205190-FLP": 2175.6,
  "HPF-SF207050-HLP": 998.6,
  "HPF-SF207050-FLP": 1668.4,
  "HPF-SF208050-HLP": 1129.2,
  "HPF-SF208050-FLP": 1901.2,
};

export function machineFilmPackagePriceBySku(sku: string | null | undefined): number | null {
  const key = String(sku || "")
    .trim()
    .toUpperCase()
    .replace(/^HPFSF/, "HPF-SF");
  return PACKAGE_PRICE_BY_SKU[key] ?? null;
}
