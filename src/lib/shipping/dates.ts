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
