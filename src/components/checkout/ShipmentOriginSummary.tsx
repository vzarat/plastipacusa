"use client";

import { useCheckoutState } from "@/components/checkout/CheckoutStateContext";
import { estimatedShipmentWindow } from "@/lib/shipping/dates";
import {
  formatFridayDeliveryDate,
  fridayTransitLabel,
  resolveFridayDeliveryIso,
} from "@/lib/shipping/friday-delivery";
import { SHIP_FROM_LOCATION } from "@/lib/shipping-method";

/** Read-only ship-from and delivery window for the order summary. */
export function ShipmentOriginSummary() {
  const { selectedShippingOption } = useCheckoutState();
  const fridayIso =
    selectedShippingOption?.id === "rgv-local" || selectedShippingOption?.id === "houston-friday"
      ? resolveFridayDeliveryIso(selectedShippingOption.deliveryDate)
      : null;
  const estimate =
    !fridayIso && selectedShippingOption
      ? estimatedShipmentWindow(selectedShippingOption.transitDays)
      : null;
  const deliveryLabel = fridayIso
    ? formatFridayDeliveryDate(fridayIso)
    : estimate?.deliveryLabel;

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
          <dt className="text-slate-500">Estimated delivery</dt>
          <dd className="font-semibold text-slate-900">
            {deliveryLabel || "Select a delivery method"}
          </dd>
          <dd className="mt-1 text-xs leading-relaxed text-slate-500">
            {fridayIso
              ? `${fridayTransitLabel(fridayIso)}. The order is ready for that route 3 business days after purchase.`
              : estimate?.detail ||
                "The order is ready for carrier pickup 3 business days after purchase."}
          </dd>
        </div>
      </dl>
    </div>
  );
}
