import {
  EMPTY_CHECKOUT_SHIPPING,
  type CheckoutShippingAddress,
} from "@/lib/shipping-address";

export interface SavedShippingAddress {
  id: string;
  userId: string;
  fullName: string;
  companyName: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  phone: string;
  isDefault: boolean;
  createdAt: string;
}

export interface ShippingAddressInput {
  fullName: string;
  companyName?: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  phone: string;
  isDefault?: boolean;
}

export interface ShippingAddressRow {
  id: string;
  user_id: string;
  full_name: string;
  company_name: string | null;
  street_address: string;
  city: string;
  state: string;
  postal_code: string;
  phone: string;
  is_default: boolean;
  created_at: string;
}

export function mapShippingAddressRow(row: ShippingAddressRow): SavedShippingAddress {
  return {
    id: row.id,
    userId: row.user_id,
    fullName: row.full_name,
    companyName: row.company_name?.trim() || "",
    streetAddress: row.street_address,
    city: row.city,
    state: row.state,
    postalCode: row.postal_code,
    phone: row.phone,
    isDefault: Boolean(row.is_default),
    createdAt: row.created_at,
  };
}

export function savedAddressToCheckout(
  address: SavedShippingAddress
): CheckoutShippingAddress {
  return {
    ...EMPTY_CHECKOUT_SHIPPING,
    fullName: address.fullName,
    line1: address.streetAddress,
    line2: address.companyName,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    phone: address.phone,
    country: "US",
  };
}

export function validateShippingAddressInput(
  input: ShippingAddressInput
): string | null {
  if (!input.fullName.trim()) return "Full name is required.";
  if (!input.streetAddress.trim()) return "Street address is required.";
  if (!input.city.trim()) return "City is required.";
  if (!input.state.trim()) return "State is required.";
  if (!input.postalCode.trim()) return "Postal code is required.";
  const digits = input.phone.replace(/\D/g, "");
  if (digits.length < 10) return "A valid phone number is required.";
  return null;
}
