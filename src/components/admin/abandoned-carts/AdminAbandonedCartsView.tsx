"use client";

import Link from "next/link";
import { ExternalLink, FilePlus2, Mail, ShoppingCart } from "lucide-react";
import type { CartSessionMetrics, CartSessionRecord } from "@/lib/cart-sessions/types";

function money(amount: number) {
  return `$${Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function pct(rate: number) {
  return `${(Number(rate || 0) * 100).toFixed(1)}%`;
}

export function AdminAbandonedCartsView({
  carts,
  metrics,
  funnel,
}: {
  carts: CartSessionRecord[];
  metrics: CartSessionMetrics;
  funnel: {
    addToCart: number;
    checkoutStarted: number;
    creditAuthPrompted: number;
    orderCompleted: number;
    addToPurchaseRate: number;
  };
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">
          Abandoned Carts
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Active carts go abandoned after {metrics.abandonAfterHours}h without checkout.
          Metrics cover the last {metrics.lookbackHours / 24} days.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Abandoned carts"
          value={String(metrics.abandonedCount)}
          hint="Recoverable pipeline"
        />
        <Stat
          label="Pipeline value"
          value={money(metrics.abandonedValueUsd)}
          hint={`${metrics.abandonedPallets.toFixed(2)} pallets`}
        />
        <Stat
          label="Abandonment rate"
          value={pct(metrics.abandonmentRate)}
          hint={`${metrics.convertedCount} converted · ${metrics.activeCount} still active`}
        />
        <Stat
          label="Add→purchase"
          value={pct(funnel.addToPurchaseRate)}
          hint={`${funnel.orderCompleted} orders / ${funnel.addToCart} add-to-cart`}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-4 rounded-2xl border border-slate-200 bg-white p-4 text-sm">
        <FunnelStep label="Add to cart" value={funnel.addToCart} />
        <FunnelStep label="Checkout started" value={funnel.checkoutStarted} />
        <FunnelStep label="Credit auth prompted" value={funnel.creditAuthPrompted} />
        <FunnelStep label="Order completed" value={funnel.orderCompleted} />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-sky-600" />
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-800">
            Recoverable carts
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-left text-[11px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 font-bold">Customer</th>
                <th className="px-4 py-3 font-bold">Items</th>
                <th className="px-4 py-3 font-bold">ZIP</th>
                <th className="px-4 py-3 font-bold">Value</th>
                <th className="px-4 py-3 font-bold">Last activity</th>
                <th className="px-4 py-3 font-bold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {carts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                    No abandoned carts in this window.
                  </td>
                </tr>
              ) : (
                carts.map((cart) => {
                  const label =
                    cart.companyName ||
                    cart.contactName ||
                    cart.email ||
                    cart.phone ||
                    "Guest cart";
                  const quoteParams = new URLSearchParams();
                  if (cart.companyName) quoteParams.set("company", cart.companyName);
                  if (cart.contactName) quoteParams.set("contact", cart.contactName);
                  if (cart.email) quoteParams.set("email", cart.email);
                  if (cart.phone) quoteParams.set("phone", cart.phone);
                  if (cart.shippingZip) quoteParams.set("zip", cart.shippingZip);
                  if (cart.shippingCity) quoteParams.set("city", cart.shippingCity);
                  if (cart.shippingState) quoteParams.set("state", cart.shippingState);
                  const quoteHref = `/admin/quotes/new?${quoteParams.toString()}`;
                  const mailHref = cart.email
                    ? `mailto:${encodeURIComponent(cart.email)}?subject=${encodeURIComponent(
                        "Your Plastipac USA cart"
                      )}`
                    : null;

                  return (
                    <tr key={cart.id} className="border-t border-slate-100 align-top">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-900">{label}</p>
                        <p className="text-[12px] text-slate-500">
                          {[cart.contactName && cart.companyName ? cart.contactName : null, cart.email, cart.phone]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5 capitalize">
                          {cart.status}
                          {cart.userId ? " · account" : " · guest"}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        <ul className="space-y-1 max-w-xs">
                          {cart.items.slice(0, 4).map((item, index) => (
                            <li key={`${item.sku}-${index}`} className="text-[12px]">
                              {item.quantity}× {item.productName || item.sku}
                            </li>
                          ))}
                          {cart.items.length > 4 ? (
                            <li className="text-[11px] text-slate-400">
                              +{cart.items.length - 4} more
                            </li>
                          ) : null}
                        </ul>
                        <p className="text-[11px] text-slate-500 mt-1">
                          {cart.totalPallets.toFixed(2)} pallets
                        </p>
                      </td>
                      <td className="px-4 py-3 text-slate-700">
                        {cart.shippingZip || "—"}
                        {cart.shippingCity || cart.shippingState ? (
                          <p className="text-[11px] text-slate-500">
                            {[cart.shippingCity, cart.shippingState].filter(Boolean).join(", ")}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-900">
                        {money(cart.subtotalUsd)}
                      </td>
                      <td className="px-4 py-3 text-slate-600 text-[12px]">
                        {cart.lastActivityAt
                          ? new Date(cart.lastActivityAt).toLocaleString("en-US")
                          : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-1.5">
                          <Link
                            href={quoteHref}
                            className="inline-flex items-center gap-1.5 text-xs font-bold text-sky-700 hover:underline"
                          >
                            <FilePlus2 className="w-3.5 h-3.5" />
                            Create quote
                          </Link>
                          {mailHref ? (
                            <a
                              href={mailHref}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-700 hover:underline"
                            >
                              <Mail className="w-3.5 h-3.5" />
                              Follow up
                            </a>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                              <ExternalLink className="w-3.5 h-3.5" />
                              No email
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-black text-slate-900">{value}</p>
      <p className="mt-1 text-[12px] text-slate-500">{hint}</p>
    </div>
  );
}

function FunnelStep({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-lg font-black text-slate-900">{value}</p>
    </div>
  );
}
