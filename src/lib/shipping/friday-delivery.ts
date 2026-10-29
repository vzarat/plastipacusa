import { ORDER_PREP_BUSINESS_DAYS_MAX } from "@/lib/shipping/dates";
import { isHoustonArea, isRioGrandeValley } from "@/lib/shipping-method";

export type FridayDeliveryRegion = "houston" | "rgv";

export function fridayDeliveryTitle(region: FridayDeliveryRegion): string {
  return region === "houston"
    ? "Houston Friday Free Delivery (Scheduled)"
    : "RGV Friday Free Delivery (Scheduled)";
}

export function fridayRegionTag(region: FridayDeliveryRegion): "Houston" | "RGV" {
  return region === "houston" ? "Houston" : "RGV";
}

export function fridayRegionFromOptionId(id: string | null | undefined): FridayDeliveryRegion | null {
  if (id === "houston-friday") return "houston";
  if (id === "rgv-local") return "rgv";
  return null;
}

export function fridayDeliveryTitleForAddress(address: FridayDeliveryAddress): string | null {
  const region = fridayFreeDeliveryRegion(address);
  return region ? fridayDeliveryTitle(region) : null;
}

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
 * The soonest Friday the fleet can deliver after the office has 2–3 business days to prepare the order.
 * A Friday with fewer than 3 business days left is skipped. The calendar day is America/Chicago.
 */
export function nextFridayDeliveryIso(now = new Date()): string {
  const { year, month, day, weekday } = chicagoCalendar(now);
  const daysUntilThisFriday = (5 - weekday + 7) % 7;
  const today = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  let iso = addIsoDays(today, daysUntilThisFriday === 0 ? 7 : daysUntilThisFriday);
  while (businessDaysUntilDelivery(iso, now) < ORDER_PREP_BUSINESS_DAYS_MAX) {
    iso = addIsoDays(iso, 7);
  }
  return iso;
}

function addIsoDays(iso: string, days: number): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]) + days, 12));
  return date.toISOString().slice(0, 10);
}

/** The next two Fridays the fleet can deliver. The calendar day is America/Chicago. */
export function fridayDeliverySlots(now = new Date()): [string, string] {
  const first = nextFridayDeliveryIso(now);
  return [first, addIsoDays(first, 7)];
}

/** Keep a customer choice only when it is one of the two open Fridays. */
export function resolveFridayDeliveryIso(requested: unknown, now = new Date()): string {
  const slots = fridayDeliverySlots(now);
  const iso = readFridayDeliveryIso(requested);
  return iso && slots.includes(iso) ? iso : slots[0];
}

/** Business days after the Chicago order date, through the selected Friday. */
export function businessDaysUntilDelivery(iso: string, now = new Date()): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return 0;
  const start = chicagoCalendar(now);
  const startUtc = Date.UTC(start.year, start.month - 1, start.day);
  const endUtc = Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  let count = 0;
  for (let cursor = startUtc + 86_400_000; cursor <= endUtc; cursor += 86_400_000) {
    const weekday = new Date(cursor).getUTCDay();
    if (weekday !== 0 && weekday !== 6) count += 1;
  }
  return count;
}

export function fridayTransitLabel(iso: string, now = new Date()): string {
  const days = businessDaysUntilDelivery(iso, now);
  const noun = days === 1 ? "business day" : "business days";
  return `${days} ${noun} until delivery`;
}

export function fridaySelectionFields(
  iso: string,
  region: FridayDeliveryRegion,
  now = new Date()
) {
  return {
    serviceName: fridayDeliveryTitle(region),
    deliveryDate: iso,
    description: `Plastipac fleet delivery on ${formatFridayDeliveryDate(iso)}.`,
    transitDays: businessDaysUntilDelivery(iso, now),
  };
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
