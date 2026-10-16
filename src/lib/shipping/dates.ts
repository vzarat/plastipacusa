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

/**
 * Pickup date sent to Warp. The next business day after `now`, in the local calendar, as YYYY-MM-DD.
 * Saturday and Sunday are skipped. Checkout, the quote API, and the parity tool all call this.
 */
export function nextBusinessPickupDate(now = new Date()): string {
  const ship = addBusinessDays(now, 1);
  const month = String(ship.getMonth() + 1).padStart(2, "0");
  const day = String(ship.getDate()).padStart(2, "0");
  return `${ship.getFullYear()}-${month}-${day}`;
}

export function scheduleFromTransitDays(transitDays: number, now = new Date()) {
  const ship = addBusinessDays(now, 1);
  const delivery = addBusinessDays(ship, Math.max(1, transitDays));
  const dayLabel =
    transitDays === 1 ? "1 business day" : `${transitDays} business days`;
  return {
    shippingLabel: "Next business day",
    shippingDate: formatScheduleDate(ship),
    deliveryLabel: dayLabel,
    deliveryDate: formatScheduleDate(delivery),
  };
}
