/** Client-safe Rio Grande Valley free-delivery rule. No server imports. */

import {
  FREE_LOCAL_DELIVERY_MIN_PALLETS,
  equivalentPalletCount,
  qualifiesForFreeLocalDelivery,
} from "@/lib/shipping/local-delivery";

/** @deprecated Use FREE_LOCAL_DELIVERY_MIN_PALLETS (2 full-pallet equivalents). */
export const RGV_FREE_DELIVERY_ROLLS = FREE_LOCAL_DELIVERY_MIN_PALLETS * 192;

/** The only cities that qualify for RGV Free Local Delivery. */
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
  rolls?: number;
  boxes?: number;
  pallets?: number;
}): { inValley: boolean; eligible: boolean; pallets: number } {
  const inValley = isTexas(input.state) && RGV_CITIES.has(normalizePlace(input.city));
  const pallets = equivalentPalletCount({
    boxes: input.boxes,
    rolls: input.rolls,
    pallets: input.pallets,
  });
  return {
    inValley,
    eligible: inValley && qualifiesForFreeLocalDelivery(pallets),
    pallets,
  };
}
