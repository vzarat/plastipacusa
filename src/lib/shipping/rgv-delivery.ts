/** Client-safe Rio Grande Valley free-delivery rule. No server imports. */

export const RGV_FREE_DELIVERY_ROLLS = 64;

/** Cities only. County names are not delivery areas. */
export const RGV_CITIES = new Set([
  "mcallen",
  "mission",
  "edinburg",
  "pharr",
  "weslaco",
  "mercedes",
  "donna",
  "alamo",
  "san juan",
  "hidalgo",
  "palmview",
  "penitas",
  "la joya",
  "sullivan city",
  "brownsville",
  "harlingen",
  "san benito",
  "los fresnos",
  "port isabel",
  "south padre island",
  "laguna vista",
  "la feria",
  "rio hondo",
  "combes",
  "santa rosa",
  "primera",
  "palm valley",
  "raymondville",
  "lyford",
  "sebastian",
  "rio grande city",
  "roma",
  "la grulla",
  "escobares",
  "olmito",
  "los indios",
  "progreso",
  "progreso lakes",
  "elsa",
  "edcouch",
  "la villa",
  "monte alto",
  "granjeno",
  "alton",
]);

function normalizePlace(value: string | undefined): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\./g, "")
    .replace(/\s+/g, " ");
}

function isTexas(state: string | undefined): boolean {
  const normalized = normalizePlace(state);
  return normalized === "tx" || normalized === "texas";
}

function zipNumber(postalCode: string | undefined): number | null {
  const match = String(postalCode || "").match(/\d{5}/);
  if (!match) return null;
  const value = Number(match[0]);
  return Number.isFinite(value) ? value : null;
}

export function freeRgvDelivery(input: {
  postalCode?: string;
  city?: string;
  state?: string;
  rolls: number;
}): { inValley: boolean; eligible: boolean } {
  const zip = zipNumber(input.postalCode);
  const inValley =
    isTexas(input.state) &&
    ((zip !== null && zip >= 78501 && zip <= 78599) || RGV_CITIES.has(normalizePlace(input.city)));
  const rolls = Math.max(0, Number(input.rolls) || 0);
  return { inValley, eligible: inValley && rolls >= RGV_FREE_DELIVERY_ROLLS };
}
