export const REQUOTE_REMAINING_MS = 7 * 60 * 1000;
export const PAYABLE_BUFFER_MS = 5 * 60 * 1000;
export const AUTO_REQUOTE_CAP = 2;

export interface RequoteOption {
  id: string;
  price: number;
  carrierKey?: string;
  serviceLevel?: string;
  transitDays: number;
}

export type RequoteDecision =
  | { type: "stale" }
  | { type: "cap" }
  | { type: "keep" }
  | { type: "clear" }
  | { type: "replace"; quoteId: string; priceUpdated: boolean };

export function isQuotePayable(expiresAt: string | null, now = Date.now()): boolean {
  if (!expiresAt) return false;
  const expires = Date.parse(expiresAt);
  return Number.isFinite(expires) && expires - now > PAYABLE_BUFFER_MS;
}

/** Dated quotes inside the 5-minute buffer cannot open the card step. A missing expiry does not. */
export function blocksCardStep(expiresAt: string | null, now = Date.now()): boolean {
  if (!expiresAt) return false;
  return !isQuotePayable(expiresAt, now);
}

export function shouldAutoRequote(input: {
  expiresAt: string | null;
  now: number;
  autoRequotes: number;
  stepVisible: boolean;
}): boolean {
  if (!input.stepVisible) return false;
  if (input.autoRequotes >= AUTO_REQUOTE_CAP) return false;
  if (!input.expiresAt) return false;
  const expires = Date.parse(input.expiresAt);
  if (!Number.isFinite(expires)) return false;
  const remaining = expires - input.now;
  return remaining <= REQUOTE_REMAINING_MS && remaining > PAYABLE_BUFFER_MS;
}

function sameCents(left: number, right: number): boolean {
  return Math.round(left * 100) === Math.round(right * 100);
}

export function decideRequote(input: {
  requestId: number;
  responseRequestId: number;
  autoRequotes: number;
  failed: boolean;
  manual?: boolean;
  selected: RequoteOption | null;
  options: RequoteOption[];
}): RequoteDecision {
  if (input.responseRequestId !== input.requestId) return { type: "stale" };
  if (!input.manual && input.autoRequotes >= AUTO_REQUOTE_CAP) return { type: "cap" };
  if (input.failed || !input.selected) return { type: "keep" };

  const selected = input.selected;
  const matches = input.options.filter(
    (option) =>
      option.carrierKey === selected.carrierKey && option.serviceLevel === selected.serviceLevel
  );
  let chosen: RequoteOption | undefined;
  if (matches.length === 1) {
    chosen = matches[0];
  } else if (matches.length > 1) {
    const sameTransit = matches.filter((option) => option.transitDays === selected.transitDays);
    if (sameTransit.length === 1) chosen = sameTransit[0];
  }
  if (!chosen) return { type: "clear" };
  return {
    type: "replace",
    quoteId: chosen.id,
    priceUpdated: !sameCents(chosen.price, selected.price),
  };
}
