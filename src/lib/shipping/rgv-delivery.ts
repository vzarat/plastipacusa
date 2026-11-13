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

function zipDigits(postalCode: string | undefined): string | null {
  const match = String(postalCode || "").match(/\d{5}/);
  return match ? match[0] : null;
}

/** Valley ZIPs are 785xx. City alone without a matching ZIP is rejected. */
export function isRgvZip(postalCode: string | undefined): boolean {
  const zip = zipDigits(postalCode);
  return Boolean(zip && zip.startsWith("785"));
}

export function freeRgvDelivery(input: {
  postalCode?: string;
  city?: string;
  state?: string;
  rolls?: number;
  boxes?: number;
  pallets?: number;
}): { inValley: boolean; eligible: boolean; pallets: number } {
  const cityOk = RGV_CITIES.has(normalizePlace(input.city));
  const inValley = isTexas(input.state) && cityOk && isRgvZip(input.postalCode);
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
