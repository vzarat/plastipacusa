/**
 * USA delivery estimate bands from the South Texas plant, including 2–3 business days
 * to prepare the order before carrier transit.
 */

const TEXAS_STATES = new Set<string>(["TX"]);

const REGIONAL_STATES = new Set<string>([
  "NM",
  "OK",
  "AR",
  "LA",
  "MS",
  "AL",
  "GA",
  "TN",
  "KS",
  "MO",
  "CO",
]);

export const LEAD_TIME_TEXAS = "3 - 5 Business Days";
export const LEAD_TIME_REGIONAL = "8 - 10 Business Days";
export const LEAD_TIME_DISTANT = "9 - 11 Business Days";

export type DeliveryZone = "texas" | "regional" | "distant";

export function getDeliveryZone(abbr: string): DeliveryZone {
  const code = abbr.toUpperCase();
  if (TEXAS_STATES.has(code)) return "texas";
  if (REGIONAL_STATES.has(code)) return "regional";
  return "distant";
}

export function getDeliveryLeadTime(abbr: string): string {
  const zone = getDeliveryZone(abbr);
  if (zone === "texas") return LEAD_TIME_TEXAS;
  if (zone === "regional") return LEAD_TIME_REGIONAL;
  return LEAD_TIME_DISTANT;
}

export function isTexasState(abbr: string): boolean {
  return TEXAS_STATES.has(abbr.toUpperCase());
}

export function isRegionalState(abbr: string): boolean {
  return REGIONAL_STATES.has(abbr.toUpperCase());
}
