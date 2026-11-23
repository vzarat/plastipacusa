import type {
  CartSessionItemSnapshot,
  CartSessionRecord,
  CartSessionStatus,
} from "./types";

function money(value: unknown): number {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount * 100) / 100 : 0;
}

export function mapCartSessionRow(row: Record<string, unknown>): CartSessionRecord {
  const items = Array.isArray(row.items)
    ? (row.items as CartSessionItemSnapshot[])
    : [];
  return {
    id: String(row.id),
    guestKey: row.guest_key ? String(row.guest_key) : null,
    userId: row.user_id ? String(row.user_id) : null,
    email: String(row.email || ""),
    companyName: String(row.company_name || ""),
    contactName: String(row.contact_name || ""),
    phone: String(row.phone || ""),
    shippingZip: String(row.shipping_zip || ""),
    shippingCity: String(row.shipping_city || ""),
    shippingState: String(row.shipping_state || ""),
    items,
    itemCount: Number(row.item_count) || items.length,
    subtotalUsd: money(row.subtotal_usd),
    totalPallets: money(row.total_pallets),
    status: String(row.status || "active") as CartSessionStatus,
    lastActivityAt: String(row.last_activity_at || ""),
    abandonedAt: row.abandoned_at ? String(row.abandoned_at) : null,
    convertedAt: row.converted_at ? String(row.converted_at) : null,
    convertedOrderId: row.converted_order_id ? String(row.converted_order_id) : null,
    checkoutStartedAt: row.checkout_started_at ? String(row.checkout_started_at) : null,
    creditAuthPromptedAt: row.credit_auth_prompted_at
      ? String(row.credit_auth_prompted_at)
      : null,
    source: String(row.source || "web"),
    createdAt: String(row.created_at || ""),
    updatedAt: String(row.updated_at || ""),
  };
}

export function snapshotItemsFromCart(
  items: Array<{
    sku: string;
    productName: string;
    productSlug?: string;
    application?: string;
    quantity: number;
    unitPrice: number;
    totalPrice?: number;
    totalBoxes?: number;
    rollsPerBox?: number;
    widthInches?: string | number;
    gauge?: number;
    lengthFeet?: number;
  }>
): CartSessionItemSnapshot[] {
  return items.map((item) => ({
    sku: String(item.sku || ""),
    productName: String(item.productName || item.sku || "Item"),
    productSlug: item.productSlug,
    application: item.application,
    quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
    unitPrice: money(item.unitPrice),
    totalPrice: money(
      item.totalPrice ?? Number(item.unitPrice || 0) * Number(item.quantity || 1)
    ),
    totalBoxes: item.totalBoxes,
    rollsPerBox: item.rollsPerBox,
    widthInches: item.widthInches,
    gauge: item.gauge,
    lengthFeet: item.lengthFeet,
  }));
}
