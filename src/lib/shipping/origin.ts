import { WARP_ORIGIN_CITY, WARP_ORIGIN_STATE, WARP_ORIGIN_ZIP } from "@/lib/shipping/config";

/** Warehouse street. Server-side Warp calls only. Do not render this on the storefront. */
export const WARP_ORIGIN_STREET = "5801 George McVay Dr";

export const WARP_ORIGIN_COUNTRY = "US";

export interface WarpDestinationAddress {
  street?: string | null;
  city?: string | null;
  state?: string | null;
}

/** Pickup block for POST /freights/quote. The zip stays at the top level Warp requires. */
export function warpPickupInfo(): {
  zipcode: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipcode: string;
    country: string;
  };
} {
  return {
    zipcode: WARP_ORIGIN_ZIP,
    address: {
      street: WARP_ORIGIN_STREET,
      city: WARP_ORIGIN_CITY,
      state: WARP_ORIGIN_STATE,
      zipcode: WARP_ORIGIN_ZIP,
      country: WARP_ORIGIN_COUNTRY,
    },
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

/** Lane fields for POST /ltl/market-options. Origin is always the McAllen warehouse. */
export function warpOriginLane(destinationZip: string, address?: WarpDestinationAddress): Record<string, string> {
  const street = address?.street?.trim() || "";
  const city = address?.city?.trim() || "";
  const state = address?.state?.trim() || "";
  return {
    origin_zip: WARP_ORIGIN_ZIP,
    origin_street: WARP_ORIGIN_STREET,
    origin_city: WARP_ORIGIN_CITY,
    origin_state: WARP_ORIGIN_STATE,
    origin_country: WARP_ORIGIN_COUNTRY,
    destination_zip: destinationZip,
    ...(street ? { destination_street: street } : {}),
    ...(city ? { destination_city: city } : {}),
    ...(state ? { destination_state: state } : {}),
    destination_country: WARP_ORIGIN_COUNTRY,
  };
}
