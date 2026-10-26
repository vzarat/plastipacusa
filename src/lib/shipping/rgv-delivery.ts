/** Client-safe Rio Grande Valley free-delivery rule. No server imports. */

export const RGV_FREE_DELIVERY_ROLLS = 64;

/** The only cities that qualify for RGV Friday Free Delivery. */
export const RGV_CITIES = new Set([
  "alamo",
  "mcallen",
  "mission",
  "hidalgo",
  "edinburg",
  "mercedes",
  "weslaco",
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

export function freeRgvDelivery(input: {
  postalCode?: string;
  city?: string;
  state?: string;
  rolls: number;
}): { inValley: boolean; eligible: boolean } {
  const inValley = isTexas(input.state) && RGV_CITIES.has(normalizePlace(input.city));
  const rolls = Math.max(0, Number(input.rolls) || 0);
  return { inValley, eligible: inValley && rolls >= RGV_FREE_DELIVERY_ROLLS };
}
