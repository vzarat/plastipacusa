import { roundMoney } from "@/lib/sales-tax";
import { ORDER_PREP_LABEL, addBusinessDays, formatScheduleDate } from "@/lib/shipping/dates";
import { freeRgvDelivery } from "@/lib/shipping/rgv-delivery";
import { evalShippingEligibility } from "@/lib/shippingRules";

export type DeliveryMethodId =
  | "ground"
  | "freight"
  | "rgv-express"
  | "houston-friday"
  | "san-antonio-tuesday";

export const SHIP_FROM_LOCATION = "McAllen, TX";

export const WAREHOUSE_ORIGIN = SHIP_FROM_LOCATION;

export const HALF_PALLET_BOXES = 12;

export interface DeliveryMethod {
  id: DeliveryMethodId;
  label: string;
  description: string;
  scheduleNote: string | null;
}

export const DELIVERY_METHODS: DeliveryMethod[] = [
  {
    id: "ground",
    label: "Standard Ground Shipping",
    description: "Parcel delivery priced from shipment weight and box count.",
    scheduleNote: null,
  },
  {
    id: "freight",
    label: "Freight / LTL Shipping",
    description: "Pallet freight priced from shipment weight and box count.",
    scheduleNote: null,
  },
  {
    id: "rgv-express",
    label: "Free Local Delivery (Plastipac Fleet)",
    description: "Plastipac fleet delivery for Rio Grande Valley orders of 16 boxes (64 rolls) or more.",
    scheduleNote: "Free local express delivery across the Rio Grande Valley.",
  },
  {
    id: "houston-friday",
    label: "Free Houston Delivery (Fridays Only)",
    description: "Free Houston Delivery — Friday Route Only",
    scheduleNote: "Free Houston Delivery — Friday Route Only",
  },
  {
    id: "san-antonio-tuesday",
    label: "San Antonio Scheduled Tuesday Route - FREE",
    description: "Weekly Tuesday route for San Antonio orders of a half pallet or more.",
    scheduleNote: "Free delivery on Tuesdays for San Antonio area.",
  },
];

export interface ShippingCartLine {
  quantity: number;
  totalBoxes?: number;
  packageSize?: string;
  pricingTier?: string;
}

export interface ShippingDestination {
  city?: string;
  state?: string;
  postalCode?: string;
  boxCount: number;
  weightLbs: number;
}

export interface ShippingOffer {
  options: DeliveryMethod[];
  defaultMethodId: DeliveryMethodId;
}

function normalizePlace(value: string | undefined): string {
  return String(value || "")
    .trim()
    .toLowerCase()
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

function boxesFromLabel(label: string): number {
  const match = label.toUpperCase().match(/(\d+)\s*BOX/);
  if (!match) return 0;
  const boxes = Number(match[1]);
  return Number.isFinite(boxes) && boxes > 0 ? boxes : 0;
}

export function countCartBoxes(items: ShippingCartLine[]): number {
  return items.reduce((total, item) => {
    const labeled = boxesFromLabel(
      `${item.packageSize || ""} ${item.pricingTier || ""}`
    );
    const perPackage =
      item.totalBoxes && item.totalBoxes > 0 ? item.totalBoxes : labeled;
    const quantity = Math.max(0, Number(item.quantity) || 0);
    return total + perPackage * quantity;
  }, 0);
}

export function isRioGrandeValley(destination: {
  city?: string;
  state?: string;
  postalCode?: string;
}): boolean {
  return freeRgvDelivery({
    postalCode: destination.postalCode,
    city: destination.city,
    state: destination.state,
    rolls: 0,
  }).inValley;
}

export function isHoustonArea(destination: {
  city?: string;
  state?: string;
  postalCode?: string;
}): boolean {
  if (!isTexas(destination.state)) return false;
  const city = normalizePlace(destination.city);
  if (city === "houston" || city.startsWith("houston ")) return true;
  const zip = zipNumber(destination.postalCode);
  return zip !== null && zip >= 77001 && zip <= 77299;
}

export function isSanAntonioArea(destination: {
  city?: string;
  state?: string;
  postalCode?: string;
}): boolean {
  if (!isTexas(destination.state)) return false;
  const city = normalizePlace(destination.city);
  if (city === "san antonio" || city.includes("san antonio")) return true;
  const zip = zipNumber(destination.postalCode);
  return zip !== null && zip >= 78201 && zip <= 78299;
}

function methodById(id: DeliveryMethodId): DeliveryMethod {
  const method = DELIVERY_METHODS.find((entry) => entry.id === id);
  if (!method) {
    return DELIVERY_METHODS[0];
  }
  return method;
}

export function deliveryMethodLabel(method: DeliveryMethodId): string {
  return methodById(method).label;
}

/**
 * Placeholder weight and volume rate until the RXO API is connected.
 * TODO: Plug custom weight and distance dynamic matrix formula
 */
export function estimateShippingCost(
  method: DeliveryMethodId,
  weightLbs: number,
  boxCount = 0
): number {
  if (
    method === "rgv-express" ||
    method === "houston-friday" ||
    method === "san-antonio-tuesday"
  ) {
    return 0;
  }

  const weight = Math.max(0, Number(weightLbs) || 0);
  const boxes = Math.max(0, Number(boxCount) || 0);

  if (method === "freight") {
    const extraWeight = Math.max(0, weight - 250);
    const extraBoxes = Math.max(0, boxes - HALF_PALLET_BOXES);
    return roundMoney(185 + extraWeight * 0.4 + extraBoxes * 6);
  }

  const extraWeight = Math.max(0, weight - 40);
  const extraBoxes = Math.max(0, boxes - 1);
  return roundMoney(49 + extraWeight * 0.75 + extraBoxes * 4);
}

export function buildShippingOffer(input: ShippingDestination): ShippingOffer {
  const boxes = Math.max(0, input.boxCount || 0);
  const eligibility = evalShippingEligibility(
    input.postalCode || "",
    input.city || "",
    input.state || "",
    boxes
  );

  return {
    options: eligibility.options.map((option) => ({
      id: option.id,
      label: option.label,
      description: option.description,
      scheduleNote: option.scheduleNote,
    })),
    defaultMethodId: eligibility.defaultMethodId,
  };
}

export function activeShippingMethod(
  requested: DeliveryMethodId,
  offer: ShippingOffer
): DeliveryMethodId {
  if (offer.options.some((option) => option.id === requested)) return requested;
  return offer.defaultMethodId;
}

export interface ShippingSchedule {
  shippingLabel: string;
  shippingDate: string;
  deliveryLabel: string;
  deliveryRange: string;
}

export function buildShippingSchedule(now = new Date()): ShippingSchedule {
  const earliest = addBusinessDays(now, 2);
  const latest = addBusinessDays(now, 3);

  return {
    shippingLabel: ORDER_PREP_LABEL,
    shippingDate: `${formatScheduleDate(earliest)} – ${formatScheduleDate(latest)}`,
    deliveryLabel: "Prepared before carrier transit",
    deliveryRange: `${formatScheduleDate(earliest)} – ${formatScheduleDate(latest)}`,
  };
}
