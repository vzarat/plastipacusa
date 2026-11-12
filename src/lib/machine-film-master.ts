/**
 * Official Automatic (GENESIS) stretch film matrix.
 * Sold by the roll on wooden pallets — no boxes.
 *   Half pallet (Tarima con 20 Rolls) = 20 rolls
 *   Full pallet (Tarima c/40 Rolls)   = 40 rolls
 * Dimensions: 48" L × 40" W × 46" H (including wooden pallet).
 */
import { machineFilmTierSku } from "@/lib/machine-film-sku";

export const MACHINE_HALF_PALLET_ROLLS = 20;
export const MACHINE_FULL_PALLET_ROLLS = 40;
export const MACHINE_PALLET_DIMENSIONS = "48 x 40 x 46";
export const MACHINE_PALLET_LENGTH_IN = 48;
export const MACHINE_PALLET_WIDTH_IN = 40;
export const MACHINE_PALLET_HEIGHT_IN = 46;

export interface MachineFilmMasterRow {
  slug: string;
  partNumber: string;
  widthInches: 20;
  gauge: 51 | 70 | 80;
  lengthFeet: 5000 | 7000 | 9000;
  title: string;
  /** Single roll with core (scale). */
  rollWeightLbs: number;
  /** Half pallet gross weight including wooden tare (scale). */
  halfPalletWeightLbs: number;
  /** Full pallet gross weight including wooden tare (scale). */
  fullPalletWeightLbs: number;
  /** Optional explicit tare when published on the scale sheet. */
  palletTareLbs?: number;
  /** USD per roll on the half-pallet tier. */
  halfPerRoll: number;
  /** USD per roll on the full-pallet tier. */
  fullPerRoll: number;
}

export const MACHINE_FILM_MASTER: readonly MachineFilmMasterRow[] = [
  {
    slug: "stretch-film-20-x-51-ga-x-7000ft",
    partNumber: "HPF-SF205170",
    widthInches: 20,
    gauge: 51,
    lengthFeet: 7000,
    title: 'STRETCH FILM 20" X 51 GA X 7000 FT',
    rollWeightLbs: 30.600162,
    halfPalletWeightLbs: 638.0,
    fullPalletWeightLbs: 1250.01,
    palletTareLbs: 25.99352,
    halfPerRoll: 50.84,
    fullPerRoll: 42.53,
  },
  {
    slug: "stretch-film-20-x-51-ga-x-9000ft",
    partNumber: "HPF-SF205190",
    widthInches: 20,
    gauge: 51,
    lengthFeet: 9000,
    title: 'STRETCH FILM 20" X 51 GA X 9000 FT',
    rollWeightLbs: 38.779312,
    halfPalletWeightLbs: 802.13,
    fullPalletWeightLbs: 1577.71,
    halfPerRoll: 64.16,
    fullPerRoll: 54.39,
  },
  {
    slug: "stretch-film-20-x-70-ga-x-5000ft",
    partNumber: "HPF-SF207050",
    widthInches: 20,
    gauge: 70,
    lengthFeet: 5000,
    title: 'STRETCH FILM 20" X 70 GA X 5000 FT',
    rollWeightLbs: 30.049006,
    halfPalletWeightLbs: 627.19,
    fullPalletWeightLbs: 1228.17,
    halfPerRoll: 49.93,
    fullPerRoll: 41.71,
  },
  {
    slug: "stretch-film-20-x-80-ga-x-5000ft",
    partNumber: "HPF-SF208050",
    widthInches: 20,
    gauge: 80,
    lengthFeet: 5000,
    title: 'STRETCH FILM 20" X 80 GA X 5000 FT',
    rollWeightLbs: 34.06142,
    halfPalletWeightLbs: 707.28,
    fullPalletWeightLbs: 1288.51,
    halfPerRoll: 56.46,
    fullPerRoll: 47.53,
  },
] as const;

export function machineFilmPackageTotal(
  row: Pick<MachineFilmMasterRow, "halfPerRoll" | "fullPerRoll">,
  rolls: 20 | 40
): number {
  const perRoll = rolls === 40 ? row.fullPerRoll : row.halfPerRoll;
  return Math.round(perRoll * rolls * 100) / 100;
}

export function findMachineFilmMaster(input: {
  widthInches?: number | string | null;
  gauge?: number | string | null;
  lengthFeet?: number | string | null;
  slug?: string | null;
  partNumber?: string | null;
}): MachineFilmMasterRow | null {
  const slug = String(input.slug || "").trim().toLowerCase();
  if (slug) {
    const bySlug = MACHINE_FILM_MASTER.find((row) => row.slug === slug);
    if (bySlug) return bySlug;
  }
  const part = String(input.partNumber || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
  if (part) {
    const byPart = MACHINE_FILM_MASTER.find(
      (row) => row.partNumber.replace(/[^A-Z0-9]/g, "") === part
    );
    if (byPart) return byPart;
  }
  const width = Math.round(Number(input.widthInches) || 0);
  const gauge = Math.round(Number(input.gauge) || 0);
  const length = Math.round(Number(input.lengthFeet) || 0);
  return (
    MACHINE_FILM_MASTER.find(
      (row) => row.widthInches === width && row.gauge === gauge && row.lengthFeet === length
    ) ?? null
  );
}

export function machineFilmTierSkuFor(
  row: Pick<MachineFilmMasterRow, "widthInches" | "gauge" | "lengthFeet">,
  rolls: 20 | 40
): string {
  return (
    machineFilmTierSku({
      widthInches: row.widthInches,
      gauge: row.gauge,
      lengthFeet: row.lengthFeet,
      rolls,
    }) || `${row.widthInches}${row.gauge}${row.lengthFeet}-${rolls}`
  );
}

/** Weight specs consumed by packageTotalWeightLbs / freight. */
export const MACHINE_FILM_WEIGHT_SPECS = MACHINE_FILM_MASTER.map((row) => ({
  width: row.widthInches,
  gauge: row.gauge,
  length: row.lengthFeet,
  roll: row.rollWeightLbs,
  half: row.halfPalletWeightLbs,
  full: row.fullPalletWeightLbs,
  ...(row.palletTareLbs != null ? { tare: row.palletTareLbs } : {}),
}));
