import { roundMoney } from "@/lib/sales-tax";

export type DeliveryMethodId =
  | "ground"
  | "freight"
  | "rgv-express"
  | "houston-friday"
  | "san-antonio-tuesday";

export const SHIP_FROM_LOCATION = "Mission, TX";

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
    label: "RGV Local Express - FREE",
    description: "Local delivery from Mission, TX for Rio Grande Valley orders of 1 box or more.",
    scheduleNote: "Free local express delivery across the Rio Grande Valley.",
  },
  {
    id: "houston-friday",
    label: "Houston Scheduled Friday Route - FREE",
    description: "Weekly Friday route for Houston orders of a half pallet or more.",
    scheduleNote: "Free delivery on Fridays for Houston area.",
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

const RGV_CITIES = new Set([
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
  if (!isTexas(destination.state)) return false;
  const zip = zipNumber(destination.postalCode);
  if (zip !== null && zip >= 78501 && zip <= 78599) return true;
  return RGV_CITIES.has(normalizePlace(destination.city));
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
  return zip !== null && zip >= 77001 && zip <= 77598;
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
  const destination = {
    city: input.city,
    state: input.state,
    postalCode: input.postalCode,
  };

  if (isRioGrandeValley(destination) && boxes >= 1) {
    return {
      options: [methodById("rgv-express")],
      defaultMethodId: "rgv-express",
    };
  }

  if (isHoustonArea(destination) && boxes >= HALF_PALLET_BOXES) {
    return {
      options: [methodById("houston-friday")],
      defaultMethodId: "houston-friday",
    };
  }

  if (isSanAntonioArea(destination) && boxes >= HALF_PALLET_BOXES) {
    return {
      options: [methodById("san-antonio-tuesday")],
      defaultMethodId: "san-antonio-tuesday",
    };
  }

  return {
    options: [methodById("ground"), methodById("freight")],
    defaultMethodId: "ground",
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

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addBusinessDays(start: Date, days: number): Date {
  const date = startOfDay(start);
  let remaining = days;
  while (remaining > 0) {
    date.setDate(date.getDate() + 1);
    const weekday = date.getDay();
    if (weekday !== 0 && weekday !== 6) remaining -= 1;
  }
  return date;
}

function formatScheduleDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function buildShippingSchedule(now = new Date()): ShippingSchedule {
  const shippingDate = addBusinessDays(now, 1);
  const deliveryStart = addBusinessDays(shippingDate, 2);
  const deliveryEnd = addBusinessDays(shippingDate, 3);

  return {
    shippingLabel: "Next business day",
    shippingDate: formatScheduleDate(shippingDate),
    deliveryLabel: "2–3 business days",
    deliveryRange: `${formatScheduleDate(deliveryStart)} – ${formatScheduleDate(deliveryEnd)}`,
  };
}
