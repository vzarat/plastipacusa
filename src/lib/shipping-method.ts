export type DeliveryMethodId = "ground" | "freight";

export const SHIP_FROM_LOCATION = "Mission, TX";

export const WAREHOUSE_ORIGIN = SHIP_FROM_LOCATION;

export interface DeliveryMethod {
  id: DeliveryMethodId;
  label: string;
  description: string;
}

export const DELIVERY_METHODS: DeliveryMethod[] = [
  {
    id: "ground",
    label: "Standard Ground Shipping",
    description: "Default parcel delivery for roll orders.",
  },
  {
    id: "freight",
    label: "Freight / LTL Shipping",
    description: "For bulk pallet orders.",
  },
];

/**
 * Placeholder rates until a weight and distance matrix is connected.
 * Ground is the default method.
 */
export function deliveryMethodLabel(method: DeliveryMethodId): string {
  return (
    DELIVERY_METHODS.find((entry) => entry.id === method)?.label ||
    "Standard Ground Shipping"
  );
}

export function estimateShippingCost(
  method: DeliveryMethodId,
  weightLbs: number
): number {
  // TODO: Plug custom weight and distance dynamic matrix formula
  void weightLbs;
  if (method === "freight") return 185;
  return 49;
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
