import { isHoustonArea, isRioGrandeValley } from "@/lib/shipping-method";

export const FRIDAY_FREE_DELIVERY_LABEL = "Houston / RGV Friday Free Delivery (Scheduled)";

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export interface FridayDeliveryAddress {
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
}

/** Houston, TX or the Rio Grande Valley. Quantity minimums are checked separately. */
export function fridayFreeDeliveryRegion(
  address: FridayDeliveryAddress
): "houston" | "rgv" | null {
  const destination = {
    city: address.city || "",
    state: address.state || "",
    postalCode: address.postalCode || "",
  };
  if (isRioGrandeValley(destination)) return "rgv";
  if (isHoustonArea(destination)) return "houston";
  return null;
}

function chicagoCalendar(now: Date): { year: number; month: number; day: number; weekday: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
  }).formatToParts(now);
  const value = (type: string) => parts.find((part) => part.type === type)?.value || "";
  const weekday = WEEKDAY_INDEX[value("weekday").slice(0, 3)] ?? 0;
  return {
    year: Number(value("year")),
    month: Number(value("month")),
    day: Number(value("day")),
    weekday,
  };
}

/**
 * Monday through Wednesday: Friday of the current week.
 * Thursday through Sunday: Friday of the following week.
 * The calendar day is America/Chicago.
 */
export function nextFridayDeliveryIso(now = new Date()): string {
  const { year, month, day, weekday } = chicagoCalendar(now);
  const daysUntilFriday =
    weekday >= 1 && weekday <= 3 ? 5 - weekday : weekday === 4 ? 8 : weekday === 5 ? 7 : weekday === 6 ? 6 : 5;
  const friday = new Date(Date.UTC(year, month - 1, day + daysUntilFriday, 12));
  return friday.toISOString().slice(0, 10);
}

export function formatFridayDeliveryDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function readFridayDeliveryIso(value: unknown): string | null {
  const text = String(value || "").trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) ? text : null;
}
