import { ORDERS_EMAIL } from "@/lib/company-email";
import { freeRgvDelivery } from "@/lib/shipping/rgv-delivery";
import {
  FREE_LOCAL_DELIVERY_LABEL,
  FREE_LOCAL_DELIVERY_MIN_PALLETS,
  FREE_LOCAL_DELIVERY_PROMO,
  equivalentPalletCount,
  freeLocalDeliveryUnlockMessage,
  palletsShortOfFreeLocal,
  qualifiesForFreeLocalDelivery,
} from "@/lib/shipping/local-delivery";
import { HAND_FULL_PALLET_BOXES } from "@/lib/pricing";

/** Two Manual full pallets (48 boxes each). */
export const HOUSTON_FREE_DELIVERY_BOXES = HAND_FULL_PALLET_BOXES * FREE_LOCAL_DELIVERY_MIN_PALLETS;
/** Same 2-pallet rule as Houston for RGV (legacy box alias). */
export const RGV_FREE_DELIVERY_BOXES = HOUSTON_FREE_DELIVERY_BOXES;

export const RGV_FREE_DELIVERY_LABEL = FREE_LOCAL_DELIVERY_LABEL;
export const HOUSTON_FRIDAY_LABEL = FREE_LOCAL_DELIVERY_LABEL;
export const HOUSTON_FRIDAY_NOTE =
  "Free local delivery on the Houston Friday route for orders of 2+ pallets.";

export {
  FREE_LOCAL_DELIVERY_LABEL,
  FREE_LOCAL_DELIVERY_MIN_PALLETS,
  FREE_LOCAL_DELIVERY_PROMO,
  equivalentPalletCount,
  qualifiesForFreeLocalDelivery,
};

export const LOGISTICS_EMAIL = ORDERS_EMAIL;
export const LOGISTICS_PHONE_DISPLAY = "+1 (956) 400-3683";
export const LOGISTICS_PHONE_TEL = "+19564003683";

export type ShippingRegionId = "rgv" | "houston" | "out-of-region";

export type ShippingRuleMethodId =
  | "ground"
  | "freight"
  | "rgv-express"
  | "houston-friday"
  | "san-antonio-tuesday";

export interface ShippingRuleOption {
  id: ShippingRuleMethodId;
  label: string;
  description: string;
  scheduleNote: string | null;
}

export interface ShippingEligibility {
  region: ShippingRegionId;
  cartTotalBoxes: number;
  cartTotalPallets: number;
  freeDeliveryEligible: boolean;
  boxesToUnlock: number;
  palletsToUnlock: number;
  banner: string | null;
  badge: string | null;
  notice: string | null;
  showQuoteActions: boolean;
  options: ShippingRuleOption[];
  defaultMethodId: ShippingRuleMethodId;
}

const HOUSTON_ZIP_PREFIXES = new Set(["770", "771", "772"]);

function normalizePlace(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/\s+/g, " ");
}

function isTexas(state: string): boolean {
  const normalized = normalizePlace(state);
  return normalized === "tx" || normalized === "texas";
}

function zipDigits(postalCode: string): string | null {
  const match = postalCode.match(/\d{5}/);
  return match ? match[0] : null;
}

/** Preset unlock: Houston / RGV free local needs 2 full-pallet equivalents. */
export function qualifiesForHoustonFriday(boxes: number, rolls = 0): boolean {
  return qualifiesForFreeLocalDelivery(equivalentPalletCount({ boxes, rolls }));
}

/** Product-page promo badge (policy), not single-SKU unlock. */
export function houstonFridayPresetLabel(boxes: number, rolls: number): string | null {
  const boxCount = Math.floor(Number(boxes) || 0);
  const rollCount = Math.floor(Number(rolls) || 0);
  const isHandFull = boxCount >= HAND_FULL_PALLET_BOXES;
  const isMachinePallet = rollCount === 20 || rollCount === 40;
  if (!isHandFull && !isMachinePallet) return null;
  return FREE_LOCAL_DELIVERY_PROMO;
}

function isGreaterHouston(zipCode: string, city: string, state: string): boolean {
  const zip = zipDigits(zipCode);
  if (zip && HOUSTON_ZIP_PREFIXES.has(zip.slice(0, 3))) return true;
  return isTexas(state) && normalizePlace(city) === "houston";
}

const FREE_LOCAL_DESCRIPTION =
  "Plastipac fleet delivery for Houston & Rio Grande Valley orders of 2+ full pallets (Manual and/or Automatic).";

export function evalShippingEligibility(
  zipCode: string,
  city: string,
  state: string,
  cartTotalBoxes: number,
  cartTotalRolls = 0,
  cartTotalPallets?: number
): ShippingEligibility {
  const boxes = Math.max(0, Math.floor(Number(cartTotalBoxes) || 0));
  const rolls = Math.max(0, Math.round(Number(cartTotalRolls) || 0));
  const pallets = equivalentPalletCount({
    boxes,
    rolls,
    pallets: cartTotalPallets,
  });
  const palletsToUnlock = palletsShortOfFreeLocal(pallets);
  const boxesToUnlock = palletsToUnlock * HAND_FULL_PALLET_BOXES;
  const unlockBanner = freeLocalDeliveryUnlockMessage(pallets);
  const rgv = freeRgvDelivery({
    postalCode: zipCode,
    city,
    state,
    rolls,
    boxes,
    pallets,
  });

  if (rgv.inValley) {
    if (rgv.eligible) {
      return {
        region: "rgv",
        cartTotalBoxes: boxes,
        cartTotalPallets: pallets,
        freeDeliveryEligible: true,
        boxesToUnlock: 0,
        palletsToUnlock: 0,
        banner: null,
        badge: FREE_LOCAL_DELIVERY_PROMO,
        notice: null,
        showQuoteActions: false,
        defaultMethodId: "rgv-express",
        options: [
          {
            id: "rgv-express",
            label: FREE_LOCAL_DELIVERY_LABEL,
            description: FREE_LOCAL_DESCRIPTION,
            scheduleNote: null,
          },
        ],
      };
    }

    return {
      region: "rgv",
      cartTotalBoxes: boxes,
      cartTotalPallets: pallets,
      freeDeliveryEligible: false,
      boxesToUnlock,
      palletsToUnlock,
      banner: unlockBanner,
      badge: null,
      notice: null,
      showQuoteActions: false,
      defaultMethodId: "freight",
      options: [
        {
          id: "freight",
          label: "Standard Freight (Warp LTL)",
          description:
            "Standard Warp LTL rates apply until the cart reaches 2 full pallets for free local delivery.",
          scheduleNote: null,
        },
      ],
    };
  }

  if (isGreaterHouston(zipCode, city, state)) {
    const eligible = qualifiesForFreeLocalDelivery(pallets);
    if (eligible) {
      return {
        region: "houston",
        cartTotalBoxes: boxes,
        cartTotalPallets: pallets,
        freeDeliveryEligible: true,
        boxesToUnlock: 0,
        palletsToUnlock: 0,
        banner: null,
        badge: FREE_LOCAL_DELIVERY_PROMO,
        notice: null,
        showQuoteActions: false,
        defaultMethodId: "houston-friday",
        options: [
          {
            id: "houston-friday",
            label: HOUSTON_FRIDAY_LABEL,
            description: HOUSTON_FRIDAY_NOTE,
            scheduleNote: HOUSTON_FRIDAY_NOTE,
          },
        ],
      };
    }

    return {
      region: "houston",
      cartTotalBoxes: boxes,
      cartTotalPallets: pallets,
      freeDeliveryEligible: false,
      boxesToUnlock,
      palletsToUnlock,
      banner: unlockBanner,
      badge: null,
      notice: null,
      showQuoteActions: false,
      defaultMethodId: "freight",
      options: [
        {
          id: "freight",
          label: "Standard Freight (Warp LTL)",
          description:
            "Standard Warp LTL rates apply until the cart reaches 2 full pallets for free Houston local delivery.",
          scheduleNote: null,
        },
      ],
    };
  }

  return {
    region: "out-of-region",
    cartTotalBoxes: boxes,
    cartTotalPallets: pallets,
    freeDeliveryEligible: false,
    boxesToUnlock: 0,
    palletsToUnlock: 0,
    banner: null,
    badge: "Custom LTL Freight Delivery",
    notice: "Your order will be quoted using our Texas-to-US freight rate engine.",
    showQuoteActions: true,
    defaultMethodId: "freight",
    options: [
      {
        id: "freight",
        label: "Custom LTL Freight Delivery",
        description:
          "Estimated from the Texas-to-US freight rate engine. Request a quote to confirm the final rate.",
        scheduleNote: null,
      },
    ],
  };
}

export function labelForShippingMethod(
  methodId: string,
  zipCode: string,
  city: string,
  state: string,
  cartTotalBoxes: number,
  cartTotalRolls = 0,
  cartTotalPallets?: number
): string {
  const eligibility = evalShippingEligibility(
    zipCode,
    city,
    state,
    cartTotalBoxes,
    cartTotalRolls,
    cartTotalPallets
  );
  return (
    eligibility.options.find((option) => option.id === methodId)?.label ||
    eligibility.options[0]?.label ||
    "Shipping"
  );
}
