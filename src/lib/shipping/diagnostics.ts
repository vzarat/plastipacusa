import { WARP_ORIGIN_ZIP, shippingDebugVisible } from "@/lib/shipping/config";
import type { ShipmentFreight, ShippingQuoteDebug, ShippingQuoteErrorBody, ShippingQuoteErrorCode } from "@/lib/shipping/types";

export const WARP_QUOTE_PATH = "/freights/quote";

export function shippingRequestId(): string {
  return `sq_${Math.random().toString(36).slice(2, 10)}`;
}

export function redactSecrets(value: string): string {
  let text = value;
  for (const secret of [process.env.WARP_API_KEY_STAGING, process.env.WARP_API_KEY_PRODUCTION]) {
    if (secret && secret.length > 8) text = text.split(secret).join("[redacted]");
  }
  return text
    .replace(/apikey["']?\s*[:=]\s*\S+/gi, "apikey=[redacted]")
    .replace(/authorization["']?\s*[:=]\s*\S+/gi, "authorization=[redacted]")
    .replace(/bearer\s+\S+/gi, "bearer [redacted]")
    .slice(0, 500);
}

export function warpEnvironment(): ShippingQuoteDebug["environment"] {
  if (process.env.WARP_ENV === "staging" || process.env.WARP_ENV === "production") {
    return process.env.WARP_ENV;
  }
  return "unset";
}

export function freightSummary(
  freight: ShipmentFreight | null,
  destination: { zip: string | null; city?: string | null; state?: string | null }
): ShippingQuoteDebug["requestSummary"] {
  const pieces = freight?.pieces || [];
  return {
    originZip: WARP_ORIGIN_ZIP,
    destinationZip: destination.zip,
    city: destination.city || null,
    state: destination.state || null,
    pallets: freight?.palletCount ?? 0,
    weightLbs: freight?.weightLbs ?? 0,
    boxes: freight?.boxes ?? 0,
    rolls: freight?.rolls ?? 0,
    pieces: pieces.map((piece) => ({
      length: piece.lengthIn,
      width: piece.widthIn,
      height: piece.heightIn,
      weightLbs: piece.weightLbs,
      quantity: piece.quantity,
      packaging: piece.packaging,
    })),
  };
}

export function missingFreightFields(freight: ShipmentFreight | null, zip: string | null): string[] {
  const missing: string[] = [];
  if (!zip) missing.push("destinationZip");
  if (!WARP_ORIGIN_ZIP) missing.push("originZip");
  if (!freight) return missing;
  if (!(freight.weightLbs > 0)) missing.push("weightLbs");
  const pieces = freight.pieces.length > 0 ? freight.pieces : [freight];
  pieces.forEach((piece, index) => {
    const label = freight.pieces.length > 0 ? `pieces[${index}]` : "pallet";
    if (!(piece.lengthIn > 0)) missing.push(`${label}.length`);
    if (!(piece.widthIn > 0)) missing.push(`${label}.width`);
    if (!(piece.heightIn > 0)) missing.push(`${label}.height`);
  });
  return missing;
}

function explain(code: ShippingQuoteErrorCode, providerMessage?: string, httpStatus?: number): string {
  if (code === "MISSING_DIMS") {
    return "Pallet dimensions were not sent. Hand film uses 48 x 48 x 78 for a full pallet and 48 x 48 x 39 for a half pallet. Check the package size on the cart line.";
  }
  if (code === "CONFIG") {
    return providerMessage || 'Set WARP_ENV to "staging" or "production" and the matching WARP_API_KEY_STAGING or WARP_API_KEY_PRODUCTION value.';
  }
  if (code === "WARP_AUTH") {
    return "Warp rejected the API key. WARP_ENV must match the key: staging uses WARP_API_KEY_STAGING, production uses WARP_API_KEY_PRODUCTION.";
  }
  if (code === "WARP_TIMEOUT") {
    return "Warp did not answer within 12 seconds. Retry the quote.";
  }
  if (code === "WARP_HTTP_ERROR") {
    const status = httpStatus ? `HTTP ${httpStatus}` : "an HTTP error";
    return providerMessage
      ? `Warp returned ${status}: ${providerMessage}`
      : `Warp returned ${status} and no rate.`;
  }
  if (code === "INVALID_ZIP") return "Enter a valid 5-digit destination ZIP code.";
  if (code === "NO_OPTIONS") {
    return "Warp accepted the request but returned no priced option for this origin, destination, and pallet.";
  }
  if (code === "VALIDATION") {
    return providerMessage || "Product weight is missing. Add roll_weight_lbs, box_weight_lbs, or pallet_weight_lbs for this variant.";
  }
  return providerMessage || "The shipping quote failed before Warp returned a rate.";
}

export function buildQuoteFailure(input: {
  code: ShippingQuoteErrorCode;
  requestId: string;
  httpStatus?: number;
  providerMessage?: string;
  freight: ShipmentFreight | null;
  destination: { zip: string | null; city?: string | null; state?: string | null };
  missingFields?: string[];
}): { error: ShippingQuoteErrorBody; debug?: ShippingQuoteDebug; publicMessage: string } {
  const providerMessage = input.providerMessage ? redactSecrets(input.providerMessage) : undefined;
  const message = explain(input.code, providerMessage, input.httpStatus);
  const missingFields = input.missingFields ?? missingFreightFields(input.freight, input.destination.zip);
  const debug: ShippingQuoteDebug = {
    environment: warpEnvironment(),
    endpoint: WARP_QUOTE_PATH,
    requestSummary: freightSummary(input.freight, input.destination),
    missingFields,
  };
  console.error(
    JSON.stringify({
      source: "shipping-quote",
      requestId: input.requestId,
      code: input.code,
      httpStatus: input.httpStatus ?? null,
      providerMessage: providerMessage ?? null,
      environment: debug.environment,
      endpoint: debug.endpoint,
      requestSummary: debug.requestSummary,
      missingFields,
    })
  );
  const visible = shippingDebugVisible();
  const error: ShippingQuoteErrorBody = {
    code: input.code,
    message: visible ? message : "We couldn't calculate shipping automatically.",
    requestId: input.requestId,
  };
  if (visible) {
    if (input.httpStatus) error.httpStatus = input.httpStatus;
    if (providerMessage) error.providerMessage = providerMessage;
  } else {
    delete error.message;
  }
  return {
    error,
    debug: visible ? debug : undefined,
    publicMessage: "We couldn't calculate shipping automatically.",
  };
}
