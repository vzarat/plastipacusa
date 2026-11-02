import {
  WARP_ORIGIN_COUNTRY,
  getWarehouseOrigin,
  warpOriginAddressPayload,
  type WarehouseOriginAddress,
} from "@/lib/shipping/warehouse-origin";

export { WARP_ORIGIN_COUNTRY } from "@/lib/shipping/warehouse-origin";

/** @deprecated Prefer getWarehouseOrigin().street — kept for older imports/tests. */
export const WARP_ORIGIN_STREET = "5801 George McVay Dr";

export interface WarpDestinationAddress {
  street?: string | null;
  city?: string | null;
  state?: string | null;
}

/** Pickup block for POST /freights/quote. The zip stays at the top level Warp requires. */
export function warpPickupInfo(origin?: WarehouseOriginAddress): {
  zipcode: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipcode: string;
    country: string;
  };
} {
  const resolved = origin ?? getWarehouseOrigin();
  const address = warpOriginAddressPayload(resolved);
  return {
    zipcode: address.zipcode,
    address,
  };
}

/** Delivery block. The customer's checkout address fills this; the warehouse never does. */
export function warpDeliveryInfo(zip: string, address?: WarpDestinationAddress): {
  zipcode: string;
  address: {
    street?: string;
    city?: string;
    state?: string;
    zipcode: string;
    country: string;
  };
} {
  const street = address?.street?.trim() || "";
  const city = address?.city?.trim() || "";
  const state = address?.state?.trim() || "";
  return {
    zipcode: zip,
    address: {
      ...(street ? { street } : {}),
      ...(city ? { city } : {}),
      ...(state ? { state } : {}),
      zipcode: zip,
      country: WARP_ORIGIN_COUNTRY,
    },
  };
}

/** Lane fields for POST /ltl/market-options. Origin is always the structured warehouse. */
export function warpOriginLane(
  destinationZip: string,
  address?: WarpDestinationAddress,
  origin?: WarehouseOriginAddress
): Record<string, string> {
  const resolved = origin ?? getWarehouseOrigin();
  const pickup = warpOriginAddressPayload(resolved);
  const street = address?.street?.trim() || "";
  const city = address?.city?.trim() || "";
  const state = address?.state?.trim() || "";
  return {
    origin_zip: pickup.zipcode,
    origin_street: pickup.street,
    origin_city: pickup.city,
    origin_state: pickup.state,
    origin_country: pickup.country,
    destination_zip: destinationZip,
    ...(street ? { destination_street: street } : {}),
    ...(city ? { destination_city: city } : {}),
    ...(state ? { destination_state: state } : {}),
    destination_country: WARP_ORIGIN_COUNTRY,
  };
}
