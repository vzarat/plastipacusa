"use client";

import { useCheckoutState } from "@/components/checkout/CheckoutStateContext";
import { scheduleFromTransitDays } from "@/lib/shipping/dates";
import { SHIP_FROM_LOCATION } from "@/lib/shipping-method";

/** Read-only ship-from and delivery window for the order summary. */
export function ShipmentOriginSummary() {
  const { selectedShippingOption } = useCheckoutState();
  const schedule = selectedShippingOption
    ? scheduleFromTransitDays(selectedShippingOption.transitDays)
    : null;

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
            Estimated Delivery: {schedule?.deliveryLabel || "Select a delivery method"}
          </dt>
        </div>
      </dl>
    </div>
  );
}
