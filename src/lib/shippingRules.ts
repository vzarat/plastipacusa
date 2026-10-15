import { freeRgvDelivery, RGV_FREE_DELIVERY_ROLLS } from "@/lib/shipping/rgv-delivery";

export const RGV_FREE_DELIVERY_BOXES = 16;
export const HOUSTON_FREE_DELIVERY_BOXES = 64;

export const LOGISTICS_EMAIL = "sales@plastipacusa.com";
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
  freeDeliveryEligible: boolean;
  boxesToUnlock: number;
  banner: string | null;
  badge: string | null;
  notice: string | null;
  showQuoteActions: boolean;
  options: ShippingRuleOption[];
  defaultMethodId: ShippingRuleMethodId;
}

const HOUSTON_ZIP_PREFIXES = new Set(["770", "772", "773", "774", "775"]);

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

/** Preset box count comes from the catalog. The Houston Friday minimum is 64 of those boxes. */
export function qualifiesForHoustonFriday(boxes: number): boolean {
  return Math.floor(Number(boxes) || 0) >= HOUSTON_FREE_DELIVERY_BOXES;
}

/** Product-page label. Rolls and boxes are the variant's catalog counts. */
export function houstonFridayPresetLabel(boxes: number, rolls: number): string | null {
  const rollCount = Math.floor(Number(rolls) || 0);
  if (!qualifiesForHoustonFriday(boxes) || rollCount < 1) return null;
  return `${rollCount} Rolls included · Houston Friday Freight Eligible`;
}

function isGreaterHouston(zipCode: string, city: string, state: string): boolean {
  const zip = zipDigits(zipCode);
  if (zip && HOUSTON_ZIP_PREFIXES.has(zip.slice(0, 3))) return true;
  return isTexas(state) && normalizePlace(city) === "houston";
}

export function evalShippingEligibility(
  zipCode: string,
  city: string,
  state: string,
  cartTotalBoxes: number,
  cartTotalRolls = 0
): ShippingEligibility {
  const boxes = Math.max(0, Math.floor(Number(cartTotalBoxes) || 0));
  const rolls = Math.max(0, Math.round(Number(cartTotalRolls) || 0));
  const rgv = freeRgvDelivery({ postalCode: zipCode, city, state, rolls });

  if (rgv.inValley) {
    if (rgv.eligible) {
      return {
        region: "rgv",
        cartTotalBoxes: boxes,
        freeDeliveryEligible: true,
        boxesToUnlock: 0,
        banner: null,
        badge: null,
        notice: null,
        showQuoteActions: false,
        defaultMethodId: "rgv-express",
        options: [
          {
            id: "rgv-express",
            label: "Free Local RGV Delivery (Included)",
            description: "Included for Rio Grande Valley orders of 64 rolls or more.",
            scheduleNote: null,
          },
        ],
      };
    }

    const rollsToUnlock = Math.max(0, RGV_FREE_DELIVERY_ROLLS - rolls);
    return {
      region: "rgv",
      cartTotalBoxes: boxes,
      freeDeliveryEligible: false,
      boxesToUnlock: rollsToUnlock,
      banner: `Add ${rollsToUnlock} more roll(s) to unlock FREE RGV Local Delivery.`,
      badge: null,
      notice: null,
      showQuoteActions: false,
      defaultMethodId: "ground",
      options: [
        {
          id: "ground",
          label: "Standard Local Courier",
          description: "Local courier fee based on shipment weight and box count.",
          scheduleNote: null,
        },
      ],
    };
  }

  if (isGreaterHouston(zipCode, city, state)) {
    const eligible = qualifiesForHoustonFriday(boxes);
    const boxesToUnlock = Math.max(0, HOUSTON_FREE_DELIVERY_BOXES - boxes);
    if (eligible) {
      return {
        region: "houston",
        cartTotalBoxes: boxes,
        freeDeliveryEligible: true,
        boxesToUnlock: 0,
        banner: null,
        badge: null,
        notice: null,
        showQuoteActions: false,
        defaultMethodId: "houston-friday",
        options: [
          {
            id: "houston-friday",
            label: "Free Friday Houston Corridor Freight (Direct Dock Delivery)",
            description: "Direct dock delivery on the Houston corridor route.",
            scheduleNote: "Scheduled delivery every Friday.",
          },
        ],
      };
    }

    return {
      region: "houston",
      cartTotalBoxes: boxes,
      freeDeliveryEligible: false,
      boxesToUnlock,
      banner: `🚛 Houston Freight requires a minimum of 1 Full Pallet (64 Boxes). Add ${boxesToUnlock} more box(es) to qualify for Free Friday Freight.`,
      badge: null,
      notice: null,
      showQuoteActions: false,
      defaultMethodId: "freight",
      options: [
        {
          id: "freight",
          label: "Standard Freight",
          description: "Freight fee based on shipment weight and box count until the full-pallet minimum is met.",
          scheduleNote: null,
        },
      ],
    };
  }

  return {
    region: "out-of-region",
    cartTotalBoxes: boxes,
    freeDeliveryEligible: false,
    boxesToUnlock: 0,
    banner: null,
    badge: "Custom LTL Freight Delivery",
    notice: "Your order will be quoted using our Texas-to-US freight rate engine.",
    showQuoteActions: true,
    defaultMethodId: "freight",
    options: [
      {
        id: "freight",
        label: "Custom LTL Freight Delivery",
        description: "Estimated from the Texas-to-US freight rate engine. Request a quote to confirm the final rate.",
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
  cartTotalRolls = 0
): string {
  const eligibility = evalShippingEligibility(zipCode, city, state, cartTotalBoxes, cartTotalRolls);
  return (
    eligibility.options.find((option) => option.id === methodId)?.label ||
    eligibility.options[0]?.label ||
    "Shipping"
  );
}
