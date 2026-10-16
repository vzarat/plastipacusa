import type { SupabaseClient } from "@supabase/supabase-js";
import { FREE_LOCAL_DELIVERY_MIN_ROLLS, WARP_ORIGIN_ZIP, getWarpConfig } from "@/lib/shipping/config";
import { nextBusinessPickupDate } from "@/lib/shipping/dates";
import {
  QUOTE_PAYABLE_BUFFER_MS,
  fetchLtlMarketOptions,
  freightItemsHash,
  marketItemsFromPieces,
  quoteStillPayable,
  type MarketOptionQuote,
} from "@/lib/shipping/market-options";
import { isRioGrandeValley } from "@/lib/shipping-method";
import { buildShipmentFreight, ShipmentDataError } from "@/lib/shipping/shipment";
import type { ShippingQuoteLine } from "@/lib/shipping/types";
import { quoteWarpFreight } from "@/lib/shipping/warp";
import type { ShipmentFreight, ShippingOption } from "@/lib/shipping/types";
import { createServiceRoleClient } from "@/lib/supabase/admin";

const CACHE_MS = 10 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const FALLBACK_EXPIRY_MS = 10 * 60 * 1000;
const EXPIRY_ERROR = "This shipping quote expired. Review the updated price before paying.";
const MISMATCH_ERROR = "We couldn't confirm this shipping quote. Please choose it again.";

export type QuoteCacheSource = "market" | "freights";

interface CachedQuote {
  options: ShippingOption[];
  freight: ShipmentFreight;
  itemsHash: string;
  destinationZip: string;
  storedAt: number;
}

interface StoredQuote extends ShippingOption {
  freight: ShipmentFreight;
  itemsHash: string;
  storedAt: number;
}

interface ShippingQuoteRow {
  quote_id: string;
  carrier_name: string | null;
  carrier_key: string | null;
  service_level: string | null;
  service_name: string;
  description: string;
  shipping_mode: "LTL" | "truckload" | "local";
  price_cents: number;
  carrier_price_cents?: number | null;
  destination_zip: string;
  weight_lbs: number;
  pallet_count: number;
  transit_days: number;
  items_hash: string;
  expires_at: string;
}

export type StoredQuoteVerdict =
  | { status: "ok" }
  | { status: "missing" }
  | { status: "expired" }
  | { status: "mismatch" };

export function shouldDeleteStoredQuote(status: StoredQuoteVerdict["status"]): boolean {
  return status === "expired";
}

const responseCache = new Map<string, CachedQuote>();
const quotesById = new Map<string, StoredQuote>();

export function freightCacheKey(
  zip: string,
  freight: ShipmentFreight,
  source: QuoteCacheSource
): string {
  return [
    source,
    zip,
    freight.palletCount,
    freight.weightLbs,
    (freight.pieces || [])
      .map((piece) =>
        [piece.lengthIn, piece.widthIn, piece.heightIn, piece.weightLbs, piece.quantity].join("x")
      )
      .join(","),
    freightItemsHash(freight.pieces),
  ].join("|");
}

function remember(
  source: QuoteCacheSource,
  zip: string,
  freight: ShipmentFreight,
  itemsHash: string,
  options: ShippingOption[]
) {
  const key = freightCacheKey(zip, freight, source);
  responseCache.set(key, { options, freight, itemsHash, destinationZip: zip, storedAt: Date.now() });
  for (const option of options) {
    quotesById.set(option.id, { ...option, freight, itemsHash, storedAt: Date.now() });
  }
}

export function keepPayableOptions(options: ShippingOption[], now = Date.now()): ShippingOption[] {
  return options.filter((option) => quoteStillPayable(option.expiresAt, now));
}

function roundedWeight(value: number): number {
  return Math.round(value);
}

function withStoredExpiry(option: ShippingOption, now = Date.now()): ShippingOption {
  if (option.expiresAt && Number.isFinite(Date.parse(option.expiresAt))) return option;
  return { ...option, expiresAt: new Date(now + FALLBACK_EXPIRY_MS).toISOString() };
}

export function judgeStoredQuote(input: {
  found: boolean;
  expiresAt: string | null;
  destinationZip: string;
  weightLbs: number;
  palletCount: number;
  itemsHash: string;
  zip: string;
  freightWeightLbs: number;
  freightPalletCount: number;
  freightItemsHash: string;
  now?: number;
}): StoredQuoteVerdict {
  if (!input.found) return { status: "missing" };
  if (!quoteStillPayable(input.expiresAt, input.now)) return { status: "expired" };
  const sameCart =
    input.destinationZip === input.zip &&
    roundedWeight(input.weightLbs) === roundedWeight(input.freightWeightLbs) &&
    input.palletCount === input.freightPalletCount &&
    input.itemsHash === input.freightItemsHash;
  if (!sameCart) return { status: "mismatch" };
  return { status: "ok" };
}

export function missingQuoteColumn(message: string): string | null {
  const missing =
    message.match(/Could not find the ['"]([a-z0-9_]+)['"] column/i) ||
    message.match(/column ["']?([a-z0-9_]+)["']? of relation/i);
  const column = missing?.[1];
  if (!column) return null;
  if (!/does not exist|schema cache/i.test(message)) return null;
  return column;
}

export function safeStoreLog(error: unknown): void {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  let text = error instanceof Error ? error.message : "store failed";
  if (secret) text = text.split(secret).join("***");
  console.error("SHIPPING_QUOTE_STORE", text);
}

function isShippingMode(value: unknown): value is ShippingQuoteRow["shipping_mode"] {
  return value === "LTL" || value === "truckload" || value === "local";
}

function optionFromRow(row: ShippingQuoteRow): ShippingOption {
  return {
    id: row.quote_id,
    provider: "warp",
    mode: row.shipping_mode,
    serviceName: row.service_name,
    description: row.description,
    price: row.price_cents / 100,
    carrierPrice:
      typeof row.carrier_price_cents === "number" ? row.carrier_price_cents / 100 : row.price_cents / 100,
    transitDays: row.transit_days,
    expiresAt: row.expires_at,
    destinationZip: row.destination_zip,
    carrierName: row.carrier_name || undefined,
    carrierKey: row.carrier_key || undefined,
    serviceLevel: row.service_level || undefined,
  };
}

async function quoteTable(): Promise<SupabaseClient> {
  return createServiceRoleClient();
}

const QUOTE_SELECT_COLUMNS = [
  "quote_id",
  "carrier_name",
  "carrier_key",
  "service_level",
  "service_name",
  "description",
  "shipping_mode",
  "price_cents",
  "carrier_price_cents",
  "destination_zip",
  "weight_lbs",
  "pallet_count",
  "transit_days",
  "items_hash",
  "expires_at",
] as const;

async function upsertQuoteRows(
  supabase: SupabaseClient,
  rows: Record<string, unknown>[]
): Promise<void> {
  let next = rows.map((row) => ({ ...row }));
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const { error } = await supabase.from("shipping_quotes").upsert(next, { onConflict: "quote_id" });
    if (!error) return;
    const column = missingQuoteColumn(String(error.message || ""));
    if (!column || !next.some((row) => Object.prototype.hasOwnProperty.call(row, column))) throw error;
    next = next.map((row) => {
      const copy = { ...row };
      delete copy[column];
      return copy;
    });
  }
  throw new Error("Could not store the shipping quote.");
}

function quoteRowFromRecord(value: unknown): ShippingQuoteRow | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const priceCents = Number(row.price_cents);
  const carrierCents = Number(row.carrier_price_cents);
  if (
    typeof row.quote_id !== "string" ||
    typeof row.service_name !== "string" ||
    typeof row.description !== "string" ||
    !isShippingMode(row.shipping_mode) ||
    !Number.isFinite(priceCents) ||
    typeof row.destination_zip !== "string" ||
    typeof row.items_hash !== "string" ||
    typeof row.expires_at !== "string"
  ) {
    return null;
  }
  return {
    quote_id: row.quote_id,
    carrier_name: typeof row.carrier_name === "string" ? row.carrier_name : null,
    carrier_key: typeof row.carrier_key === "string" ? row.carrier_key : null,
    service_level: typeof row.service_level === "string" ? row.service_level : null,
    service_name: row.service_name,
    description: row.description,
    shipping_mode: row.shipping_mode,
    price_cents: priceCents,
    carrier_price_cents: Number.isFinite(carrierCents) ? carrierCents : null,
    destination_zip: row.destination_zip,
    weight_lbs: Number(row.weight_lbs) || 0,
    pallet_count: Number(row.pallet_count) || 0,
    transit_days: Number(row.transit_days) || 0,
    items_hash: row.items_hash,
    expires_at: row.expires_at,
  };
}

function shippingOptionFromMarket(option: MarketOptionQuote, zip: string): ShippingOption {
  const truckload = /FTL|TRUCKLOAD/.test(option.serviceLevel.toUpperCase());
  const level = option.serviceLevel;
  const description =
    level === "GUARANTEED"
      ? "Guaranteed freight service."
      : level === "ECONOMY"
        ? "Economy freight service."
        : level === "PRIORITY"
          ? "Priority freight service."
          : level === "STANDARD"
            ? "Standard freight service."
            : "Freight service.";
  return {
    id: option.quoteId,
    provider: "warp",
    mode: truckload ? "truckload" : "LTL",
    serviceName: option.carrierName || option.serviceLevel,
    description,
    price: option.price,
    transitDays: option.transitDays && option.transitDays > 0 ? option.transitDays : 1,
    expiresAt: option.expiresAt || null,
    destinationZip: zip,
    carrierName: option.carrierName || undefined,
    carrierKey: option.carrierKey,
    serviceLevel: option.serviceLevel,
    carrierPrice: option.carrierPrice,
  };
}

async function deleteStaleQuotes(supabase: SupabaseClient): Promise<void> {
  const nowIso = new Date().toISOString();
  const dayAgo = new Date(Date.now() - DAY_MS).toISOString();
  const payableEdge = new Date(Date.now() + QUOTE_PAYABLE_BUFFER_MS).toISOString();
  const expired = await supabase.from("shipping_quotes").delete().lt("expires_at", nowIso);
  if (expired.error) throw expired.error;
  const aged = await supabase
    .from("shipping_quotes")
    .delete()
    .lt("created_at", dayAgo)
    .lte("expires_at", payableEdge);
  if (aged.error) throw aged.error;
}

async function deleteQuote(quoteId: string): Promise<void> {
  quotesById.delete(quoteId);
  try {
    const supabase = await quoteTable();
    const { error } = await supabase.from("shipping_quotes").delete().eq("quote_id", quoteId);
    if (error) safeStoreLog(error);
  } catch (error) {
    safeStoreLog(error);
  }
}

export async function storeQuotedOptions(
  zip: string,
  freight: ShipmentFreight,
  options: ShippingOption[],
  source: QuoteCacheSource
): Promise<ShippingOption[]> {
  const itemsHash = freightItemsHash(freight.pieces);
  const storedOptions = options
    .filter((option) => option.id.trim() && option.price > 0)
    .map((option) => withStoredExpiry(option));
  const supabase = await quoteTable();
  await deleteStaleQuotes(supabase);
  if (storedOptions.length === 0) return [];
  await upsertQuoteRows(
    supabase,
    storedOptions.map((option) => ({
      quote_id: option.id,
      carrier_name: option.carrierName ?? null,
      carrier_key: option.carrierKey ?? null,
      service_level: option.serviceLevel ?? null,
      service_name: option.serviceName,
      description: option.description,
      shipping_mode: option.mode,
      price_cents: Math.round(option.price * 100),
      carrier_price_cents: Math.round((option.carrierPrice ?? option.price) * 100),
      destination_zip: zip,
      weight_lbs: freight.weightLbs,
      pallet_count: freight.palletCount,
      transit_days: option.transitDays,
      items_hash: itemsHash,
      expires_at: option.expiresAt,
    }))
  );
  remember(source, zip, freight, itemsHash, storedOptions);
  return storedOptions;
}

export async function getCachedWarpOptions(
  zip: string,
  freight: ShipmentFreight
): Promise<ShippingOption[]> {
  const key = freightCacheKey(zip, freight, "freights");
  const cached = responseCache.get(key);
  if (cached && Date.now() - cached.storedAt < CACHE_MS) {
    const live = keepPayableOptions(cached.options);
    if (live.length > 0) return live;
  }
  const options = keepPayableOptions(
    await quoteWarpFreight({
      originZip: WARP_ORIGIN_ZIP,
      destinationZip: zip,
      freight,
    })
  );
  try {
    return await storeQuotedOptions(zip, freight, options, "freights");
  } catch (error) {
    safeStoreLog(error);
    return [];
  }
}

export async function readStoredQuote(
  quoteId: string,
  zip: string,
  freight: ShipmentFreight
): Promise<{ option: ShippingOption } | { status: "missing" | "expired" | "mismatch" }> {
  const itemsHash = freightItemsHash(freight.pieces);
  const stored = quotesById.get(quoteId);
  const memoryVerdict = judgeStoredQuote({
    found: Boolean(stored),
    expiresAt: stored?.expiresAt ?? null,
    destinationZip: stored?.destinationZip ?? "",
    weightLbs: stored?.freight.weightLbs ?? 0,
    palletCount: stored?.freight.palletCount ?? 0,
    itemsHash: stored?.itemsHash ?? "",
    zip,
    freightWeightLbs: freight.weightLbs,
    freightPalletCount: freight.palletCount,
    freightItemsHash: itemsHash,
  });
  if (shouldDeleteStoredQuote(memoryVerdict.status)) {
    await deleteQuote(quoteId);
    return { status: "expired" };
  }
  if (memoryVerdict.status === "ok" && stored) return { option: stored };
  if (memoryVerdict.status === "mismatch") return { status: "mismatch" };

  let row: ShippingQuoteRow | null = null;
  try {
    const supabase = await quoteTable();
    try {
      await deleteStaleQuotes(supabase);
    } catch (error) {
      safeStoreLog(error);
    }
    let columns: string[] = [...QUOTE_SELECT_COLUMNS];
    let data: unknown = null;
    for (let attempt = 0; attempt < 6; attempt += 1) {
      const result = await supabase
        .from("shipping_quotes")
        .select(columns.join(", "))
        .eq("quote_id", quoteId)
        .maybeSingle();
      if (!result.error) {
        data = result.data;
        break;
      }
      const column = missingQuoteColumn(String(result.error.message || ""));
      if (!column || !columns.includes(column)) throw result.error;
      columns = columns.filter((name) => name !== column);
    }
    row = quoteRowFromRecord(data);
  } catch (error) {
    safeStoreLog(error);
    return { status: "missing" };
  }

  const verdict = judgeStoredQuote({
    found: Boolean(row),
    expiresAt: row?.expires_at ?? null,
    destinationZip: row?.destination_zip ?? "",
    weightLbs: Number(row?.weight_lbs ?? 0),
    palletCount: Number(row?.pallet_count ?? 0),
    itemsHash: row?.items_hash ?? "",
    zip,
    freightWeightLbs: freight.weightLbs,
    freightPalletCount: freight.palletCount,
    freightItemsHash: itemsHash,
  });
  if (shouldDeleteStoredQuote(verdict.status)) {
    await deleteQuote(quoteId);
    return { status: "expired" };
  }
  if (verdict.status === "mismatch") return { status: "mismatch" };
  if (verdict.status !== "ok" || !row) return { status: "missing" };
  const option = optionFromRow(row);
  quotesById.set(option.id, { ...option, freight, itemsHash, storedAt: Date.now() });
  return { option };
}

export async function resolveShippingCharge(input: {
  quoteId: string;
  postalCode: string;
  city?: string;
  state?: string;
  lines: ShippingQuoteLine[];
}): Promise<{ option: ShippingOption } | { error: string; expired: boolean }> {
  const zip = String(input.postalCode || "").match(/\d{5}/)?.[0];
  if (!zip) return { error: "Enter a valid ZIP code before payment.", expired: false };
  let freight;
  try {
    freight = await buildShipmentFreight(input.lines);
  } catch (error) {
    if (
      input.quoteId === "rgv-local" &&
      error instanceof ShipmentDataError &&
      error.code === "missing_dims" &&
      isRioGrandeValley({ postalCode: zip, city: input.city, state: input.state }) &&
      error.rolls >= FREE_LOCAL_DELIVERY_MIN_ROLLS
    ) {
      return {
        option: {
          id: "rgv-local",
          provider: "plastipac",
          mode: "local",
          serviceName: "Free Local Delivery (Plastipac Fleet)",
          description: "Plastipac fleet delivery for Rio Grande Valley orders of 16 boxes (64 rolls) or more.",
          price: 0,
          transitDays: 1,
          expiresAt: null,
          destinationZip: zip,
        },
      };
    }
    return { error: MISMATCH_ERROR, expired: false };
  }
  if (input.quoteId === "rgv-local") {
    const eligible =
      isRioGrandeValley({ postalCode: zip, city: input.city, state: input.state }) &&
      freight.rolls >= FREE_LOCAL_DELIVERY_MIN_ROLLS;
    if (!eligible) {
      return { error: "Free local delivery does not apply to this order.", expired: false };
    }
    return {
      option: {
        id: "rgv-local",
        provider: "plastipac",
        mode: "local",
        serviceName: "Free Local Delivery (Plastipac Fleet)",
        description: "Plastipac fleet delivery for Rio Grande Valley orders of 16 boxes (64 rolls) or more.",
        price: 0,
        transitDays: 1,
        expiresAt: null,
        destinationZip: zip,
      },
    };
  }

  const stored = await readStoredQuote(input.quoteId, zip, freight);
  if ("option" in stored) return { option: stored.option };
  const refreshed = await reverifyWarpQuote(input.quoteId, zip, freight);
  if (refreshed) return { option: refreshed };
  if (stored.status === "mismatch") return { error: MISMATCH_ERROR, expired: false };
  return { error: EXPIRY_ERROR, expired: true };
}

async function reverifyWarpQuote(
  quoteId: string,
  zip: string,
  freight: ShipmentFreight
): Promise<ShippingOption | null> {
  let apiKey = "";
  try {
    apiKey = getWarpConfig().apiKey;
  } catch (error) {
    safeStoreLog(error);
    return null;
  }
  try {
    const market = await fetchLtlMarketOptions({
      apiKey,
      originZip: WARP_ORIGIN_ZIP,
      destinationZip: zip,
      pickupDate: nextBusinessPickupDate(),
      items: marketItemsFromPieces(freight.pieces),
      timeoutMs: 45_000,
    });
    const match = market.options.find((option) => option.quoteId === quoteId);
    if (!match) return null;
    const option = shippingOptionFromMarket(match, zip);
    try {
      const stored = await storeQuotedOptions(zip, freight, [option], "market");
      return stored[0] || option;
    } catch (error) {
      safeStoreLog(error);
      return option;
    }
  } catch (error) {
    safeStoreLog(error);
    return null;
  }
}
