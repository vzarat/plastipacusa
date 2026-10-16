import { createHash } from "node:crypto";
import { SHIPPING_MARKUP_PERCENT } from "@/lib/shipping/config";
import { nextBusinessPickupDate } from "@/lib/shipping/dates";
import { redactSecrets } from "@/lib/shipping/diagnostics";
import { ShipmentDataError } from "@/lib/shipping/shipment-error";
import type { FreightPiece } from "@/lib/shipping/types";

/** Agent API host. The project quote client keeps using stg/gw for /freights/quote. */
export const LTL_MARKET_OPTIONS_URL = "https://www.wearewarp.com/api/v1/ltl/market-options";

/** Same request again. The OpenAPI spec has no parameter that forces a fresh spread. */
export const MARKET_RETRY_DELAYS_MS = [2_000, 4_000, 8_000] as const;

export function marketSpreadNeedsRetry(input: { retryable: boolean; bookableQuotes: number }): boolean {
  return input.retryable && input.bookableQuotes === 0;
}

export const QUOTE_OFFER_BUFFER_MS = 30 * 60 * 1000;
export const QUOTE_PAYABLE_BUFFER_MS = 5 * 60 * 1000;

const LEGAL_SUFFIXES = [
  "MOTOR FREIGHT SYSTEM",
  "FREIGHT SYSTEM",
  "FREIGHT LINE",
  "LTL FREIGHT",
  "LOGISTICS",
  "INCORPORATED",
  "INC",
  "LLC",
] as const;

export interface MarketOptionQuote {
  quoteId: string;
  carrierName: string;
  carrierKey: string;
  serviceLevel: string;
  /** Customer price after markup. */
  price: number;
  /** Warp price before markup. */
  carrierPrice: number;
  transitDays: number | null;
  expiresAt: string;
  isWarp: boolean;
}

interface RawMarketOption {
  carrier_name?: unknown;
  service_level?: unknown;
  price_usd?: unknown;
  transit_days?: unknown;
  bookable?: unknown;
  is_warp?: unknown;
  expires_at?: unknown;
  expires_in_seconds?: unknown;
  quote_id?: unknown;
}

export interface NormalizedCarrier {
  key: string;
  label: string;
}

function cleanName(name: string): string {
  let value = name
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toUpperCase()
    .replace(/&/g, " AND ")
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of LEGAL_SUFFIXES) {
      if (value === suffix) break;
      if (value.endsWith(` ${suffix}`)) {
        value = value.slice(0, -(suffix.length + 1)).trim();
        changed = true;
      }
    }
  }
  return value.replace(/\bFREIGHT\b/g, " ").replace(/\s+/g, " ").trim();
}

export function normalizeCarrier(name: string): NormalizedCarrier {
  const compact = cleanName(name);
  if (compact.startsWith("FORWARD AIR")) return { key: "forward-air", label: "Forward Air" };
  if (compact === "FORWARD" || compact.startsWith("FORWARD ")) return { key: "forward", label: "Forward" };
  if (compact.startsWith("XPO")) return { key: "xpo", label: "XPO" };
  if (/\bFEDEX\b/.test(compact) && /\bECONOMY\b/.test(compact)) {
    return { key: "fedex-economy", label: "FedEx Freight Economy" };
  }
  if (/\bFEDEX\b/.test(compact) && /\bPRIORITY\b/.test(compact)) {
    return { key: "fedex-priority", label: "FedEx Freight Priority" };
  }
  if (/\bFEDEX\b/.test(compact)) return { key: "fedex", label: "FedEx Freight" };
  if (compact.startsWith("AVERITT")) return { key: "averitt", label: "Averitt Express" };
  if (compact.startsWith("ABF")) return { key: "abf", label: "ABF Freight" };
  if (/\bSAIA\b/.test(compact)) return { key: "saia", label: "Saia" };
  if (compact.startsWith("ESTES")) return { key: "estes", label: "Estes" };
  if (compact === "RL" || compact.startsWith("RL ") || compact.startsWith("R L ")) {
    return { key: "rl", label: "RL Carriers" };
  }
  if (compact.startsWith("SOUTHWESTERN")) {
    return { key: "southwestern", label: "Southwestern Motor Transport" };
  }
  if (compact.startsWith("OLD DOMINION")) return { key: "old-dominion", label: "Old Dominion" };
  if (compact.startsWith("VOCAR")) return { key: "vocar", label: "Vocar Transportation" };
  if (compact.startsWith("CCFS")) return { key: "ccfs", label: "CCFS" };
  if (compact.startsWith("UNIS")) return { key: "unis", label: "UNIS Transportation" };

  const key = compact.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "carrier";
  const label = compact.toLowerCase().replace(/\b[a-z]/g, (letter) => letter.toUpperCase());
  return { key, label: label || "Carrier" };
}

export function normalizeServiceLevel(service: string, carrierName: string): string {
  const raw = service.toUpperCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  if (raw.includes("GUARANTEED")) return "GUARANTEED";
  const generic = raw === "" || raw === "STANDARD" || raw === "STND" || raw === "STD";
  const carrier = carrierName.toUpperCase();
  if (raw.includes("ECONOMY") || (generic && /\bECONOMY\b/.test(carrier))) return "ECONOMY";
  if (raw.includes("PRIORITY") || (generic && /\bPRIORITY\b/.test(carrier))) return "PRIORITY";
  if (generic) return "STANDARD";
  return raw;
}

function markedCents(amount: number): number | null {
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const marked = amount * (1 + SHIPPING_MARKUP_PERCENT / 100);
  return Math.round(marked * 100) / 100;
}

export function quoteStillOffered(expiresAt: string | null, now = Date.now()): boolean {
  if (!expiresAt) return true;
  const expires = Date.parse(expiresAt);
  return Number.isFinite(expires) && expires - now > QUOTE_OFFER_BUFFER_MS;
}

/** Payment window. A quote expiring inside 5 minutes cannot be charged. */
export function quoteStillPayable(expiresAt: string | null, now = Date.now()): boolean {
  if (!expiresAt) return false;
  const expires = Date.parse(expiresAt);
  return Number.isFinite(expires) && expires - now > QUOTE_PAYABLE_BUFFER_MS;
}

export interface MarketFreightItem {
  qty: number;
  weightLbsPerPallet: number;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
}

/** Whole pounds Warp accepts. Checkout, the quote API, and the parity tool all use this. */
export function ceilWarpWeightLbs(weightLbs: number): number {
  if (!Number.isFinite(weightLbs) || weightLbs <= 0) {
    throw new ShipmentDataError(
      "missing_weight",
      "Product weight is missing, so shipping can't be calculated yet."
    );
  }
  return Math.ceil(weightLbs);
}

function ceilPositive(value: number, kind: "weight" | "dimensions"): number {
  if (kind === "weight") return ceilWarpWeightLbs(value);
  if (!Number.isFinite(value) || value <= 0) {
    throw new ShipmentDataError(
      "missing_dims",
      "Pallet dimensions are missing, so shipping can't be calculated yet."
    );
  }
  return Math.ceil(value);
}

export function marketItemsFromPieces(pieces: FreightPiece[]): MarketFreightItem[] {
  return pieces.map((piece) => {
    const qty = Math.max(1, Math.round(piece.quantity));
    return {
      qty,
      weightLbsPerPallet: ceilPositive(piece.weightLbs / qty, "weight"),
      lengthIn: ceilPositive(piece.lengthIn, "dimensions"),
      widthIn: ceilPositive(piece.widthIn, "dimensions"),
      heightIn: ceilPositive(piece.heightIn, "dimensions"),
    };
  });
}

export function freightItemsHash(
  pieces: FreightPiece[],
  identity: { pickupDate?: string; accessorials?: string[] } = {}
): string {
  const pickupDate = identity.pickupDate || nextBusinessPickupDate();
  const accessorials = [...(identity.accessorials ?? [])].map((item) => item.trim()).filter(Boolean).sort();
  const canonical = [
    pickupDate,
    accessorials.join(","),
    marketItemsFromPieces(pieces)
      .map((item) =>
        [item.qty, item.weightLbsPerPallet, item.lengthIn, item.widthIn, item.heightIn].join("x")
      )
      .join("|"),
  ].join("||");
  return createHash("sha256").update(canonical).digest("hex");
}

function sameSize(left: MarketFreightItem, right: MarketFreightItem): boolean {
  return (
    left.weightLbsPerPallet === right.weightLbsPerPallet &&
    left.lengthIn === right.lengthIn &&
    left.widthIn === right.widthIn &&
    left.heightIn === right.heightIn
  );
}

export function marketOptionsBody(input: {
  originZip: string;
  destinationZip: string;
  pickupDate: string;
  items: MarketFreightItem[];
}): Record<string, string | number | Array<Record<string, number>>> {
  const lane = {
    origin_zip: input.originZip,
    destination_zip: input.destinationZip,
    pickup_date: input.pickupDate,
  };
  const [first, ...rest] = input.items;
  if (!first) {
    throw new ShipmentDataError(
      "missing_dims",
      "Pallet dimensions are missing, so shipping can't be calculated yet."
    );
  }
  if (rest.every((item) => sameSize(item, first))) {
    return {
      ...lane,
      pallets: input.items.reduce((sum, item) => sum + item.qty, 0),
      weight_lbs_per_pallet: first.weightLbsPerPallet,
      length_in: first.lengthIn,
      width_in: first.widthIn,
      height_in: first.heightIn,
    };
  }
  return {
    ...lane,
    items: input.items.map((item) => ({
      qty: item.qty,
      weight_lbs_per_pallet: item.weightLbsPerPallet,
      length_in: item.lengthIn,
      width_in: item.widthIn,
      height_in: item.heightIn,
    })),
  };
}

export function exceedsLtlLimits(raw: string): boolean {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object") {
      const record = parsed as Record<string, unknown>;
      const nested =
        record.error && typeof record.error === "object"
          ? (record.error as Record<string, unknown>).code
          : undefined;
      const code = record.code ?? nested ?? record.error;
      if (typeof code === "string" && code.includes("EXCEEDS_LTL_LIMITS")) return true;
    }
  } catch {
    return raw.includes("EXCEEDS_LTL_LIMITS");
  }
  return raw.includes("EXCEEDS_LTL_LIMITS");
}

function readRows(body: unknown): RawMarketOption[] {
  if (!body || typeof body !== "object") return [];
  const rows = (body as { market_options?: unknown }).market_options;
  if (!Array.isArray(rows)) return [];
  return rows.filter((row): row is RawMarketOption => Boolean(row) && typeof row === "object");
}

export interface MarketSpreadMeta {
  cached: boolean;
  retryable: boolean;
  note: string | null;
  pickupDate: string | null;
  rowCount: number;
  bookableQuotes: number;
}

function marketSpreadMeta(body: unknown): MarketSpreadMeta {
  const record = body && typeof body === "object" ? (body as Record<string, unknown>) : {};
  const rows = readRows(body);
  const bookableQuotes = rows.filter((row) => String(row.quote_id || "").trim()).length;
  const note = typeof record.note === "string" ? redactSecrets(record.note).slice(0, 500) : null;
  return {
    cached: record.cached === true,
    retryable: record.retryable === true,
    note,
    pickupDate: typeof record.pickup_date === "string" ? record.pickup_date : null,
    rowCount: rows.length,
    bookableQuotes,
  };
}

function logUnbookableSpread(meta: MarketSpreadMeta): void {
  if (meta.bookableQuotes > 0) return;
  console.log(
    `[warp market-options] no quote_id cached=${meta.cached} retryable=${meta.retryable} pickup_date=${meta.pickupDate ?? ""} rows=${meta.rowCount} note=${meta.note ?? ""}`
  );
}

function logMarketShape(body: unknown): void {
  if (!body || typeof body !== "object") {
    console.log("[warp market-options] response keys: (not an object)");
    return;
  }
  const record = body as Record<string, unknown>;
  const rows = Array.isArray(record.market_options) ? record.market_options : [];
  const sample = rows.find((row) => row && typeof row === "object") as Record<string, unknown> | undefined;
  const optionKeys = sample ? Object.keys(sample).sort().join(",") : "(none)";
  const seconds = rows
    .map((row) =>
      row && typeof row === "object" ? Number((row as { expires_in_seconds?: unknown }).expires_in_seconds) : NaN
    )
    .filter((value) => Number.isFinite(value))
    .sort((a, b) => a - b);
  const typical =
    seconds.length > 0 ? ` expires_in_seconds median=${seconds[Math.floor(seconds.length / 2)]} min=${seconds[0]} max=${seconds[seconds.length - 1]}` : "";
  console.log(
    `[warp market-options] response keys: ${Object.keys(record).sort().join(",")}; option keys: ${optionKeys}; count: ${rows.length};${typical}`
  );
}

/** Bookable quotes only. One row per carrier and service level, the cheapest of that pair. */
export function selectMarketOptions(body: unknown, _now = Date.now()): MarketOptionQuote[] {
  const best = new Map<string, MarketOptionQuote>();
  for (const row of readRows(body)) {
    if (row.bookable !== true) continue;
    const quoteId = String(row.quote_id || "").trim();
    const rawAmount = Number(row.price_usd);
    const price = markedCents(rawAmount);
    if (!quoteId || price == null) continue;
    const rawName = String(row.carrier_name || "").trim();
    const carrier = rawName ? normalizeCarrier(rawName) : null;
    const serviceLevel = normalizeServiceLevel(String(row.service_level || ""), rawName);
    const transit = Number(row.transit_days);
    const option: MarketOptionQuote = {
      quoteId,
      carrierName: carrier?.label || "",
      carrierKey: carrier?.key || serviceLevel.toLowerCase(),
      serviceLevel,
      price,
      carrierPrice: Math.round(rawAmount * 100) / 100,
      transitDays: Number.isFinite(transit) ? transit : null,
      expiresAt: String(row.expires_at || "").trim(),
      isWarp: row.is_warp === true || /FTL|TRUCKLOAD/.test(serviceLevel),
    };
    const key = `${option.carrierKey}|${serviceLevel}`;
    const current = best.get(key);
    if (!current || option.price < current.price) best.set(key, option);
  }
  return [...best.values()].sort(
    (a, b) => a.price - b.price || a.carrierName.localeCompare(b.carrierName) || a.quoteId.localeCompare(b.quoteId)
  );
}

export function isTruckloadQuote(option: { mode?: string; serviceLevel?: string; isWarp?: boolean }): boolean {
  if (option.isWarp) return true;
  if (option.mode === "truckload") return true;
  return /FTL|TRUCKLOAD/.test(String(option.serviceLevel || "").toUpperCase());
}

/** Keep LTL when the shipment is one or two pallets. Truckload stays only if nothing else came back. */
export function hideTruckloadForSmallShipment<T extends { mode?: string; serviceLevel?: string; isWarp?: boolean }>(
  options: T[],
  palletCount: number
): T[] {
  if (palletCount > 2) return options;
  const ltl = options.filter((option) => !isTruckloadQuote(option));
  return ltl.length > 0 ? ltl : options;
}

export { featuredCarrierOptions, type FeaturedOption } from "@/lib/shipping/featured-options";

export async function fetchLtlMarketOptions(input: {
  apiKey: string;
  originZip: string;
  destinationZip: string;
  pickupDate: string;
  items?: MarketFreightItem[];
  pallets?: number;
  weightLbsPerPallet?: number;
  lengthIn?: number;
  widthIn?: number;
  heightIn?: number;
  timeoutMs?: number;
  now?: number;
  accessorials?: string[];
}): Promise<{
  httpStatus: number;
  options: MarketOptionQuote[];
  limitExceeded: boolean;
  cached: boolean;
  retryable: boolean;
  note: string | null;
}> {
  const items =
    input.items && input.items.length > 0
      ? input.items
      : marketItemsFromPieces([
          {
            lengthIn: input.lengthIn || 0,
            widthIn: input.widthIn || 0,
            heightIn: input.heightIn || 0,
            weightLbs: input.weightLbsPerPallet || 0,
            quantity: input.pallets || 0,
            packaging: "pallet",
            dimensionLabel: "",
            weightLabel: "",
          },
        ]);
  const requestBody = JSON.stringify({
    ...marketOptionsBody({
      originZip: input.originZip,
      destinationZip: input.destinationZip,
      pickupDate: input.pickupDate,
      items,
    }),
    ...((input.accessorials ?? []).filter(Boolean).length > 0
      ? { delivery_services: (input.accessorials ?? []).filter(Boolean) }
      : {}),
  });

  const once = async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), input.timeoutMs ?? 45_000);
    try {
      const response = await fetch(LTL_MARKET_OPTIONS_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${input.apiKey}`,
        },
        body: requestBody,
        signal: controller.signal,
      });
      const raw = await response.text();
      if (!response.ok) {
        return {
          httpStatus: response.status,
          options: [] as MarketOptionQuote[],
          limitExceeded: exceedsLtlLimits(raw),
          cached: false,
          retryable: false,
          note: null as string | null,
        };
      }
      let parsed: unknown = null;
      try {
        parsed = JSON.parse(raw);
      } catch {
        parsed = null;
      }
      const meta = marketSpreadMeta(parsed);
      logMarketShape(parsed);
      logUnbookableSpread(meta);
      return {
        httpStatus: response.status,
        options: meta.cached ? [] : selectMarketOptions(parsed, input.now),
        limitExceeded: false,
        cached: meta.cached,
        retryable: meta.retryable,
        note: meta.note,
      };
    } finally {
      clearTimeout(timer);
    }
  };

  let result = await once();
  for (const delayMs of MARKET_RETRY_DELAYS_MS) {
    if (result.limitExceeded || !marketSpreadNeedsRetry({ retryable: result.retryable, bookableQuotes: result.options.length })) {
      break;
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    result = await once();
  }
  return result;
}
