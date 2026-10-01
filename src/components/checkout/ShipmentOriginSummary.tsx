"use client";

import { SHIP_FROM_LOCATION } from "@/lib/shipping-method";

/** Read-only ship-from and delivery window for the order summary. */
export function ShipmentOriginSummary() {
  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-4 py-3.5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
        Shipment
      </p>
      <dl className="mt-2 space-y-2 text-sm">
        <div>
          <dt className="font-semibold text-slate-900">
            Ship From: {SHIP_FROM_LOCATION}
          </dt>
        </div>
        <div>
          <dt className="font-semibold text-slate-900">
            Estimated Delivery: 2-3 business days
          </dt>
        </div>
      </dl>
    </div>
  );
}
