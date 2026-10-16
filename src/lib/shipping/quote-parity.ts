import { SHIPPING_MARKUP_PERCENT, WARP_ORIGIN_ZIP } from "@/lib/shipping/config";
import { nextBusinessPickupDate } from "@/lib/shipping/dates";
import {
  hideTruckloadForSmallShipment,
  marketItemsFromPieces,
  marketOptionsBody,
} from "@/lib/shipping/market-options";
import type { MarketOptionQuote } from "@/lib/shipping/market-options";
import type { ShipmentFreight } from "@/lib/shipping/types";

export { PRICE_DIFFERENCE_NOTES } from "@/lib/shipping/price-difference-notes";

export interface WarpPieceRequest {
  quantity: number;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  weightLbs: number;
}

export function warpPiecesFromFreight(freight: ShipmentFreight): WarpPieceRequest[] {
  return marketItemsFromPieces(freight.pieces).map((item) => ({
    quantity: item.qty,
    lengthIn: item.lengthIn,
    widthIn: item.widthIn,
    heightIn: item.heightIn,
    weightLbs: item.weightLbsPerPallet,
  }));
}

export function formatWarpRequest(input: {
  destinationZip: string;
  pickupDate?: string;
  freight: ShipmentFreight;
  accessorials?: string[];
}): string {
  const pickupDate = input.pickupDate || nextBusinessPickupDate();
  const pieces = warpPiecesFromFreight(input.freight);
  const accessorials = (input.accessorials ?? []).filter(Boolean);
  const lines = [
    `origin_zip: ${WARP_ORIGIN_ZIP}`,
    `destination_zip: ${input.destinationZip}`,
    `pickup_date: ${pickupDate}`,
    `pieces: ${pieces.length}`,
    ...pieces.map(
      (piece, index) =>
        `piece ${index + 1}: qty ${piece.quantity}, ${piece.lengthIn} L x ${piece.widthIn} W x ${piece.heightIn} H in, ${piece.weightLbs} lb each`
    ),
    `accessorials: ${accessorials.length > 0 ? accessorials.join(", ") : "none"}`,
    `markup_percent: ${SHIPPING_MARKUP_PERCENT}`,
  ];
  return lines.join("\n");
}

export function warpQuoteBody(input: {
  destinationZip: string;
  pickupDate?: string;
  freight: ShipmentFreight;
  accessorials?: string[];
}): Record<string, string | number | string[] | Array<Record<string, number>>> {
  const body = marketOptionsBody({
    originZip: WARP_ORIGIN_ZIP,
    destinationZip: input.destinationZip,
    pickupDate: input.pickupDate || nextBusinessPickupDate(),
    items: marketItemsFromPieces(input.freight.pieces),
  });
  const accessorials = (input.accessorials ?? []).map((item) => item.trim()).filter(Boolean);
  if (accessorials.length === 0) return body;
  return { ...body, delivery_services: accessorials };
}

export function checkoutOptionsFromMarket(
  options: MarketOptionQuote[],
  palletCount: number
): MarketOptionQuote[] {
  return hideTruckloadForSmallShipment(options, palletCount);
}

export interface PastedWarpPrice {
  carrier: string;
  service: string;
  price: number;
}

export interface PriceDiffRow {
  carrier: string;
  service: string;
  warpToolPrice: number | null;
  siteCarrierPrice: number | null;
  difference: number | null;
  status: "match" | "differ" | "only in Warp tool" | "only on site";
}

export function diffWarpPrices(site: MarketOptionQuote[], pasted: PastedWarpPrice[]): PriceDiffRow[] {
  const key = (carrier: string, service: string) =>
    `${carrier.trim().toLowerCase()}|${service.trim().toLowerCase()}`;
  const siteByKey = new Map(site.map((option) => [key(option.carrierName, option.serviceLevel), option]));
  const rows: PriceDiffRow[] = [];
  const seen = new Set<string>();
  for (const pastedRow of pasted) {
    const id = key(pastedRow.carrier, pastedRow.service);
    seen.add(id);
    const match = siteByKey.get(id);
    const sitePrice = match ? match.carrierPrice : null;
    const difference = sitePrice == null ? null : Math.round((sitePrice - pastedRow.price) * 100) / 100;
    rows.push({
      carrier: pastedRow.carrier,
      service: pastedRow.service,
      warpToolPrice: pastedRow.price,
      siteCarrierPrice: sitePrice,
      difference,
      status: sitePrice == null ? "only in Warp tool" : difference === 0 ? "match" : "differ",
    });
  }
  for (const option of site) {
    const id = key(option.carrierName, option.serviceLevel);
    if (seen.has(id)) continue;
    rows.push({
      carrier: option.carrierName,
      service: option.serviceLevel,
      warpToolPrice: null,
      siteCarrierPrice: option.carrierPrice,
      difference: null,
      status: "only on site",
    });
  }
  return rows;
}
