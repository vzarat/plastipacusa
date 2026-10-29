function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addBusinessDays(start: Date, days: number): Date {
  const date = startOfDay(start);
  let remaining = Math.max(0, days);
  while (remaining > 0) {
    date.setDate(date.getDate() + 1);
    const weekday = date.getDay();
    if (weekday !== 0 && weekday !== 6) remaining -= 1;
  }
  return date;
}

export function formatScheduleDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/** Office time before any order, of any product, can leave for a carrier or a scheduled route. */
export const ORDER_PREP_BUSINESS_DAYS_MIN = 2;
export const ORDER_PREP_BUSINESS_DAYS_MAX = 3;
export const ORDER_PREP_LABEL = "2–3 business days";
export const ORDER_PREP_SENTENCE =
  "Every order is prepared in 2–3 business days before it leaves our office.";

export function carrierTimingLabel(transitDays: number): string {
  const transit = Math.max(1, Math.round(Number(transitDays) || 1));
  const transitText = transit === 1 ? "1 business day" : `${transit} business days`;
  return `${ORDER_PREP_LABEL} to prepare, then ${transitText} in transit`;
}

/**
 * Pickup date sent to Warp. Three business days after `now`, so the carrier quote matches
 * an order the office can actually have ready. Saturday and Sunday are skipped.
 */
export function nextBusinessPickupDate(now = new Date()): string {
  const ship = addBusinessDays(now, ORDER_PREP_BUSINESS_DAYS_MAX);
  const month = String(ship.getMonth() + 1).padStart(2, "0");
  const day = String(ship.getDate()).padStart(2, "0");
  return `${ship.getFullYear()}-${month}-${day}`;
}

/** Customer-facing window: ready for Warp pickup 3 business days after purchase, then carrier transit. */
export function estimatedShipmentWindow(transitDays: number, now = new Date()) {
  const transit = Math.max(1, Math.round(Number(transitDays) || 1));
  const ready = addBusinessDays(now, ORDER_PREP_BUSINESS_DAYS_MAX);
  const delivery = addBusinessDays(ready, transit);
  const transitText = transit === 1 ? "1 business day" : `${transit} business days`;
  const readyLabel = formatScheduleDate(ready);
  const deliveryLabel = formatScheduleDate(delivery);
  return {
    readyLabel,
    deliveryLabel,
    summary: `Estimated delivery: ${deliveryLabel}`,
    detail: `Ready for pickup ${readyLabel}, 3 business days after purchase, then ${transitText} in transit.`,
  };
}

export function scheduleFromTransitDays(transitDays: number, now = new Date()) {
  const transit = Math.max(1, Math.round(Number(transitDays) || 1));
  const shipStart = addBusinessDays(now, ORDER_PREP_BUSINESS_DAYS_MIN);
  const shipEnd = addBusinessDays(now, ORDER_PREP_BUSINESS_DAYS_MAX);
  const deliveryStart = addBusinessDays(shipStart, transit);
  const deliveryEnd = addBusinessDays(shipEnd, transit);
  return {
    shippingLabel: ORDER_PREP_LABEL,
    shippingDate: `${formatScheduleDate(shipStart)} – ${formatScheduleDate(shipEnd)}`,
    deliveryLabel: carrierTimingLabel(transit),
    deliveryDate: formatScheduleDate(deliveryStart),
    deliveryRange: `${formatScheduleDate(deliveryStart)} – ${formatScheduleDate(deliveryEnd)}`,
  };
}
