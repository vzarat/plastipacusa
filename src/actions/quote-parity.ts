"use server";

import { getCurrentUser } from "@/actions/auth";
import { getWarpConfig, SHIPPING_MARKUP_PERCENT, WARP_ORIGIN_ZIP } from "@/lib/shipping/config";
import { nextBusinessPickupDate } from "@/lib/shipping/dates";
import { fetchLtlMarketOptions, hideTruckloadForSmallShipment, marketItemsFromPieces } from "@/lib/shipping/market-options";
import { diffWarpPrices, formatWarpRequest, type PriceDiffRow } from "@/lib/shipping/quote-parity";
import { ShipmentDataError, buildShipmentFreight } from "@/lib/shipping/shipment";

export interface QuoteParityResult {
  pickupDate: string;
  requestText: string;
  markupPercent: number;
  cached: boolean;
  retryable: boolean;
  note: string | null;
  warpOptions: Array<{
    carrier: string;
    service: string;
    price: number;
    transitDays: number | null;
    bookable: boolean;
  }>;
  checkoutOptions: Array<{
    quoteId: string;
    carrierName: string;
    serviceLevel: string;
    price: number;
    carrierPrice: number;
    transitDays: number | null;
  }>;
  diff: PriceDiffRow[];
}

function pastedPrices(text: string) {
  return text
    .split("\n")
    .map((line) => line.split(",").map((part) => part.trim()))
    .filter((parts) => parts.length >= 3 && parts[0] && parts[1])
    .map((parts) => ({
      carrier: parts[0],
      service: parts[1],
      price: Number(parts[2].replace(/[$,]/g, "")),
    }))
    .filter((row) => Number.isFinite(row.price) && row.price > 0);
}

export async function runQuoteParity(input: {
  destinationZip: string;
  sku: string;
  quantity: number;
  pickupDate: string;
  accessorials: string;
  pasted: string;
}): Promise<QuoteParityResult | { error: string }> {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.profile.role !== "admin") {
    return { error: "Admin access is required." };
  }
  const zip = String(input.destinationZip || "").match(/\d{5}/)?.[0];
  if (!zip) return { error: "Enter a 5-digit destination ZIP." };
  const sku = input.sku.trim();
  if (!sku) return { error: "Enter a product SKU." };
  const pickupDate = /^\d{4}-\d{2}-\d{2}$/.test(input.pickupDate) ? input.pickupDate : nextBusinessPickupDate();
  const accessorials = input.accessorials.split(",").map((item) => item.trim()).filter(Boolean);
  try {
    const freight = await buildShipmentFreight([{ sku, quantity: Math.max(1, Math.round(input.quantity) || 1) }]);
    const config = getWarpConfig();
    const quoted = await fetchLtlMarketOptions({
      apiKey: config.apiKey,
      originZip: WARP_ORIGIN_ZIP,
      destinationZip: zip,
      pickupDate,
      items: marketItemsFromPieces(freight.pieces),
      accessorials,
      timeoutMs: 45_000,
    });
    const checkout = hideTruckloadForSmallShipment(quoted.options, freight.palletCount);
    return {
      pickupDate,
      requestText: formatWarpRequest({ destinationZip: zip, pickupDate, freight, accessorials }),
      markupPercent: SHIPPING_MARKUP_PERCENT,
      cached: quoted.cached,
      retryable: quoted.retryable,
      note: quoted.note,
      warpOptions: quoted.options.map((option) => ({
        carrier: option.carrierName || option.serviceLevel,
        service: option.serviceLevel,
        price: option.carrierPrice,
        transitDays: option.transitDays,
        bookable: true,
      })),
      checkoutOptions: checkout.map((option) => ({
        quoteId: option.quoteId,
        carrierName: option.carrierName,
        serviceLevel: option.serviceLevel,
        price: option.price,
        carrierPrice: option.carrierPrice,
        transitDays: option.transitDays,
      })),
      diff: diffWarpPrices(checkout, pastedPrices(input.pasted)),
    };
  } catch (error) {
    if (error instanceof ShipmentDataError) return { error: error.message };
    return { error: "Warp quote failed." };
  }
}
