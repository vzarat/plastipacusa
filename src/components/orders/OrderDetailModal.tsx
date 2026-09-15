import React, { useEffect } from "react";
import { CalendarDays, CheckCircle2, Mail, MapPin, Package, Phone, ShieldCheck, Truck, User, X } from "lucide-react";
import { formatCurrency, formatOrderId } from "@/lib/utils";

export interface OrderDetailAddress {
  full_name?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  zip?: string | null;
  country?: string | null;
  street?: string | null;
}

export interface OrderDetailItem {
  productImage?: string | null;
  productImageUrl?: string | null;
  productName?: string | null;
  product_name?: string | null;
  name?: string | null;
  unitPrice?: number | string | null;
  unit_price?: number | string | null;
  quantity?: number | null;
  gauge?: number | string | null;
  packageSize?: string | null;
  package_size?: string | null;
  widthInches?: string | null;
  totalPrice?: number | string | null;
  total_price?: number | string | null;
}

export interface OrderDetailLike {
  id?: string;
  createdAt?: string;
  date?: string;
  customerName?: string;
  customerEmail?: string;
  customerCompany?: string;
  customerPhone?: string;
  shippingAddress?: OrderDetailAddress;
  items?: OrderDetailItem[];
  itemsSummary?: string;
  totalUsd?: number | string;
  status?: string;
  paymentStatus?: string;
  trackingNumber?: string;
  shippingFee?: number | string;
  taxes?: number | string;
}

interface OrderDetailModalProps {
  open: boolean;
  order: OrderDetailLike | null;
  onClose: () => void;
}

const statusStyles: Record<string, string> = {
  paid: "bg-emerald-50 text-emerald-700 border-emerald-200",
  completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  delivered: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  cancelled: "bg-rose-50 text-rose-700 border-rose-200",
  failed: "bg-rose-50 text-rose-700 border-rose-200",
  in_transit: "bg-blue-50 text-blue-700 border-blue-200",
  shipped: "bg-blue-50 text-blue-700 border-blue-200",
};

const statusLabels: Record<string, string> = {
  paid: "Paid",
  completed: "Completed",
  delivered: "Delivered",
  pending: "Pending",
  cancelled: "Cancelled",
  failed: "Failed",
  in_transit: "In Transit",
  shipped: "Shipped",
};

function getOrderStatus(order: OrderDetailLike | null): string {
  if (!order) return "pending";
  return order.paymentStatus || order.status || "pending";
}

function getLinePrice(item: OrderDetailItem): number {
  const unitPrice = Number(item.unitPrice ?? item.unit_price ?? 0);
  const quantity = Number(item.quantity ?? 1);
  return Number((unitPrice * quantity).toFixed(2));
}

function getTitle(item: OrderDetailItem): string {
  return item.productName || item.product_name || item.name || "Plastipac Product";
}

function getImageSrc(item: OrderDetailItem): string | undefined {
  return item.productImage || item.productImageUrl || undefined;
}

export default function OrderDetailModal({ open, order, onClose }: OrderDetailModalProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onClose]);

  if (!open || !order) {
    return null;
  }

  const orderId = formatOrderId({
    id: order.id,
    createdAt: order.createdAt,
    items: order.items,
  } as any);

  const shipping = order.shippingAddress || {};
  const orderStatus = getOrderStatus(order);
  const orderDate = order.createdAt
    ? new Date(order.createdAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : order.date || "—";

  const itemSubtotal = (order.items || []).reduce((sum, item) => sum + getLinePrice(item), 0);
  const shippingFee = Number(order.shippingFee ?? 0);
  const taxes = Number(order.taxes ?? 0);
  const total = Number(order.totalUsd ?? itemSubtotal + shippingFee + taxes);

  const recipientName = order.customerName || shipping.full_name || shipping.name || "Customer";
  const recipientEmail = order.customerEmail || shipping.email || "—";
  const recipientPhone = order.customerPhone || shipping.phone || "—";
  const streetAddress = shipping.street || shipping.line1 || "—";
  const addressLine2 = shipping.line2 || "";
  const city = shipping.city || "—";
  const state = shipping.state || shipping.postal_code || "—";
  const postalCode = shipping.postal_code || shipping.zip || "—";
  const country = shipping.country || "United States";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-5xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur-sm sm:px-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              Order Details
            </p>
            <h3 className="mt-1 text-xl font-black text-slate-900">{orderId}</h3>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close order details"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto p-5 sm:p-6">
          <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border bg-slate-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-slate-700">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {orderDate}
                </span>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] ${
                    statusStyles[orderStatus] || "bg-slate-100 text-slate-700 border-slate-200"
                  }`}
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  {statusLabels[orderStatus] || orderStatus}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  {recipientEmail}
                </span>
                {order.customerCompany && (
                  <span className="inline-flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-slate-400" />
                    {order.customerCompany}
                  </span>
                )}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">Final Total</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{formatCurrency(total)}</p>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1.55fr_0.95fr]">
            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-black text-slate-900">Purchased Products</h4>
                <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                  {order.items?.length || 0} item(s)
                </span>
              </div>

              <div className="space-y-3">
                {(order.items || []).map((item, index) => {
                  const imageSrc = getImageSrc(item);
                  const itemSubtotalValue = getLinePrice(item);

                  return (
                    <div
                      key={`${getTitle(item)}-${index}`}
                      className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                    >
                      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                        {imageSrc ? (
                          <img
                            src={imageSrc}
                            alt={getTitle(item)}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-sky-100 to-slate-100 text-xs font-black text-slate-700">
                            {getTitle(item).slice(0, 2).toUpperCase()}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-1 flex-col justify-between gap-2 sm:flex-row sm:items-center">
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-900">{getTitle(item)}</p>
                          <p className="text-[11px] text-slate-500">
                            {item.gauge ? `Gauge: ${item.gauge}G` : "Gauge: —"}
                            {item.widthInches ? ` • ${item.widthInches}" width` : ""}
                            {item.packageSize ? ` • ${item.packageSize}` : ""}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {item.quantity || 1} × {formatCurrency(Number(item.unitPrice ?? item.unit_price ?? 0))}
                          </p>
                        </div>

                        <div className="text-right">
                          <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                            Subtotal
                          </p>
                          <p className="mt-1 text-base font-black text-slate-900">
                            {formatCurrency(itemSubtotalValue)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            <aside className="space-y-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <Package className="h-4 w-4 text-slate-500" />
                  <h4 className="text-sm font-black text-slate-900">Shipping Details</h4>
                </div>

                <div className="space-y-3 text-xs text-slate-600">
                  <div className="flex items-start gap-2">
                    <User className="mt-0.5 h-3.5 w-3.5 text-slate-400" />
                    <div>
                      <p className="font-bold text-slate-900">{recipientName}</p>
                      <p>{order.customerCompany || "Individual Customer"}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 text-slate-400" />
                    <div>
                      <p>{streetAddress}</p>
                      {addressLine2 && <p>{addressLine2}</p>}
                      <p>
                        {city}, {state} {postalCode}
                      </p>
                      <p>{country}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-slate-400" />
                    <span>{recipientEmail}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Phone className="h-3.5 w-3.5 text-slate-400" />
                    <span>{recipientPhone}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
                <div className="mb-3 flex items-center gap-2">
                  <Truck className="h-4 w-4 text-slate-500" />
                  <h4 className="text-sm font-black text-slate-900">Order Summary</h4>
                </div>

                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span>Subtotal</span>
                    <span className="font-bold text-slate-900">{formatCurrency(itemSubtotal)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Shipping fee</span>
                    <span className="font-bold text-slate-900">{formatCurrency(shippingFee)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Taxes</span>
                    <span className="font-bold text-slate-900">{formatCurrency(taxes)}</span>
                  </div>
                  <div className="border-t border-slate-200 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-black text-slate-900">Total</span>
                      <span className="text-sm font-black text-slate-900">{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
