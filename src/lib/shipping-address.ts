export const CHECKOUT_SHIPPING_STORAGE_KEY = "plastipac_checkout_shipping";

export interface CheckoutShippingAddress {
  fullName: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  phone: string;
  country: string;
}

export const EMPTY_CHECKOUT_SHIPPING: CheckoutShippingAddress = {
  fullName: "",
  line1: "",
  line2: "",
  city: "",
  state: "",
  postalCode: "",
  phone: "",
  country: "US",
};

export function validateCheckoutShipping(
  address: CheckoutShippingAddress
): string | null {
  if (!address.fullName.trim()) return "Full name is required for delivery.";
  if (!address.line1.trim()) return "Street address is required.";
  if (!address.city.trim()) return "City is required.";
  if (!address.state.trim()) return "State / region is required.";
  if (!address.postalCode.trim()) return "Postal code is required.";
  const digits = address.phone.replace(/\D/g, "");
  if (digits.length < 10) return "A valid delivery phone number is required.";
  return null;
}

export function persistCheckoutShipping(address: CheckoutShippingAddress) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(
    CHECKOUT_SHIPPING_STORAGE_KEY,
    JSON.stringify(address)
  );
}

export function readCheckoutShipping(): CheckoutShippingAddress | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(CHECKOUT_SHIPPING_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CheckoutShippingAddress>;
    return {
      ...EMPTY_CHECKOUT_SHIPPING,
      ...parsed,
      country: parsed.country || "US",
    };
  } catch {
    return null;
  }
}

export function clearCheckoutShipping() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(CHECKOUT_SHIPPING_STORAGE_KEY);
}

/** JSONB shape stored on public.orders.shipping_address */
export function toOrderShippingAddress(
  address: CheckoutShippingAddress,
  extras?: Record<string, unknown>
) {
  return {
    full_name: address.fullName.trim(),
    name: address.fullName.trim(),
    line1: address.line1.trim(),
    street: address.line1.trim(),
    line2: address.line2.trim() || null,
    city: address.city.trim(),
    state: address.state.trim(),
    postal_code: address.postalCode.trim(),
    zip: address.postalCode.trim(),
    phone: address.phone.trim(),
    country: address.country.trim() || "US",
    ...(extras || {}),
  };
}
