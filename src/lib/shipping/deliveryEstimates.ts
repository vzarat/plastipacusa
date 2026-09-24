/** Shared USA delivery estimate bands from the South Texas plant. */

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

export const LEAD_TIME_TEXAS = "1 - 2 Business Days";
export const LEAD_TIME_REGIONAL = "6 - 7 Business Days";
export const LEAD_TIME_DISTANT = "7 - 8 Business Days";

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
