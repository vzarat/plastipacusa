import { canonicalCatalogSku } from "@/lib/catalog-sku";
import {
  findMachineFilmMaster,
  MACHINE_FILM_MASTER,
  machineFilmPackageTotal,
  machineFilmTierSkuFor,
} from "@/lib/machine-film-master";

/**
 * Automatic 20" film is sold by the roll. There are no boxes.
 * Half pallet is 20 rolls. Full pallet is 40 rolls.
 */
export const MACHINE_FILM_ROLL_PRICES = MACHINE_FILM_MASTER.map((row) => ({
  width: row.widthInches,
  gauge: row.gauge,
  length: row.lengthFeet,
  halfPerRoll: row.halfPerRoll,
  fullPerRoll: row.fullPerRoll,
}));

export function machineFilmPerRollPrice(input: {
  widthInches?: number | string | null;
  gauge?: number | string | null;
  lengthFeet?: number | string | null;
  rolls?: number | string | null;
}): number | null {
  const rolls = Math.round(Number(input.rolls) || 0);
  if (rolls !== 20 && rolls !== 40) return null;
  const row = findMachineFilmMaster(input);
  if (!row) return null;
  return rolls === 40 ? row.fullPerRoll : row.halfPerRoll;
}

/** Pallet total charged for one half pallet or one full pallet. */
export function machineFilmPackagePrice(input: {
  widthInches?: number | string | null;
  gauge?: number | string | null;
  lengthFeet?: number | string | null;
  rolls?: number | string | null;
}): number | null {
  const rolls = Math.round(Number(input.rolls) || 0);
  if (rolls !== 20 && rolls !== 40) return null;
  const row = findMachineFilmMaster(input);
  if (!row) return null;
  return machineFilmPackageTotal(row, rolls);
}

const PACKAGE_PRICE_BY_SKU: Record<string, number> = Object.fromEntries(
  MACHINE_FILM_MASTER.flatMap((row) => {
    const halfSku = machineFilmTierSkuFor(row, 20);
    const fullSku = machineFilmTierSkuFor(row, 40);
    return [
      [canonicalCatalogSku(halfSku), machineFilmPackageTotal(row, 20)],
      [canonicalCatalogSku(fullSku), machineFilmPackageTotal(row, 40)],
    ];
  })
);

export function machineFilmPackagePriceBySku(sku: string | null | undefined): number | null {
  const key = canonicalCatalogSku(String(sku || ""));
  return PACKAGE_PRICE_BY_SKU[key] ?? null;
}
