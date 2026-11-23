export type CartSessionStatus = "active" | "abandoned" | "converted";

export type CartFunnelEventName =
  | "add_to_cart"
  | "checkout_started"
  | "credit_auth_prompted"
  | "order_completed";

export interface CartSessionItemSnapshot {
  sku: string;
  productName: string;
  productSlug?: string;
  application?: "hand" | "machine" | string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  totalBoxes?: number;
  rollsPerBox?: number;
  widthInches?: string | number;
  gauge?: number;
  lengthFeet?: number;
}

export interface CartSessionContact {
  email?: string;
  companyName?: string;
  contactName?: string;
  phone?: string;
  shippingZip?: string;
  shippingCity?: string;
  shippingState?: string;
}

export interface CartSessionRecord {
  id: string;
  guestKey: string | null;
  userId: string | null;
  email: string;
  companyName: string;
  contactName: string;
  phone: string;
  shippingZip: string;
  shippingCity: string;
  shippingState: string;
  items: CartSessionItemSnapshot[];
  itemCount: number;
  subtotalUsd: number;
  totalPallets: number;
  status: CartSessionStatus;
  lastActivityAt: string;
  abandonedAt: string | null;
  convertedAt: string | null;
  convertedOrderId: string | null;
  checkoutStartedAt: string | null;
  creditAuthPromptedAt: string | null;
  source: string;
  createdAt: string;
  updatedAt: string;
}

export interface CartSessionMetrics {
  abandonedCount: number;
  abandonedValueUsd: number;
  abandonedPallets: number;
  activeCount: number;
  convertedCount: number;
  /** Abandoned / (abandoned + converted) over the lookback window. */
  abandonmentRate: number;
  lookbackHours: number;
  abandonAfterHours: number;
}

export interface UpsertCartSessionInput extends CartSessionContact {
  guestKey?: string | null;
  items: CartSessionItemSnapshot[];
  subtotalUsd: number;
  totalPallets: number;
  source?: string;
}
