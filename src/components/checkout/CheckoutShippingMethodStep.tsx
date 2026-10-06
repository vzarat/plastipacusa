"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, MapPin, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCheckoutState } from "@/components/checkout/CheckoutStateContext";
import { useCartStore } from "@/lib/store/useCartStore";
import { formatCurrency } from "@/lib/utils";
import { ShippingEligibilityAlert } from "@/components/checkout/ShippingEligibilityAlert";
import {
  WAREHOUSE_ORIGIN,
  activeShippingMethod,
  buildShippingOffer,
  buildShippingSchedule,
  countCartBoxes,
  estimateShippingCost,
  type DeliveryMethodId,
  type ShippingSchedule,
} from "@/lib/shipping-method";
import { evalShippingEligibility } from "@/lib/shippingRules";

interface CheckoutShippingMethodStepProps {
  onBack: () => void;
  onProceed: () => void;
}

export function CheckoutShippingMethodStep({
  onBack,
  onProceed,
}: CheckoutShippingMethodStepProps) {
  const items = useCartStore((state) => state.items);
  const totalWeight = useCartStore((state) => state.getTotalWeight());
  const { selectedAddress, deliveryMethod, setDeliveryMethod } = useCheckoutState();
  const [schedule, setSchedule] = useState<ShippingSchedule | null>(null);

  useEffect(() => {
    setSchedule(buildShippingSchedule(new Date()));
  }, []);

  const itemCount = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items]
  );
  const boxCount = useMemo(() => countCartBoxes(items), [items]);
  const shippingOffer = useMemo(
    () =>
      buildShippingOffer({
        city: selectedAddress?.city,
        state: selectedAddress?.state,
        postalCode: selectedAddress?.postalCode,
        boxCount,
        weightLbs: totalWeight,
      }),
    [selectedAddress, boxCount, totalWeight]
  );
  const shippingEligibility = useMemo(
    () =>
      evalShippingEligibility(
        selectedAddress?.postalCode || "",
        selectedAddress?.city || "",
        selectedAddress?.state || "",
        boxCount
      ),
    [selectedAddress, boxCount]
  );
  const activeMethod = activeShippingMethod(deliveryMethod, shippingOffer);

  useEffect(() => {
    if (deliveryMethod !== activeMethod) {
      setDeliveryMethod(activeMethod);
    }
  }, [activeMethod, deliveryMethod, setDeliveryMethod]);

  const shippingCost = estimateShippingCost(activeMethod, totalWeight, boxCount);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-sky-700">
          Step 3
        </p>
        <h2 className="mt-1 text-lg font-black text-slate-900">Shipping Method</h2>
        <p className="mt-1 text-sm text-slate-500">
          Confirm the shipment, choose a delivery method, and review estimated dates.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Shipment preview
        </p>
        <p className="text-sm font-semibold text-slate-900">
          {itemCount} {itemCount === 1 ? "item" : "items"} in this shipment
        </p>
        {selectedAddress ? (
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
            <div>
              <p className="font-bold text-slate-900">{selectedAddress.fullName}</p>
              {selectedAddress.companyName && <p>{selectedAddress.companyName}</p>}
              <p>{selectedAddress.streetAddress}</p>
              <p>
                {selectedAddress.city}, {selectedAddress.state}{" "}
                {selectedAddress.postalCode}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No shipping address selected.</p>
        )}
        <div className="flex items-start gap-2 text-sm text-slate-700">
          <Warehouse className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
          <p>
            Ship From:{" "}
            <span className="font-semibold">{WAREHOUSE_ORIGIN}</span>
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sky-800">
            <Calendar className="h-4 w-4" />
            <p className="text-[11px] font-bold uppercase tracking-wider">
              Estimated Ship Date
            </p>
          </div>
          <p className="mt-2 text-sm font-black text-slate-900">
            {schedule?.shippingLabel || "Next business day"}
          </p>
          {schedule && (
            <p className="mt-1 text-xs text-slate-500">{schedule.shippingDate}</p>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sky-800">
            <Calendar className="h-4 w-4" />
            <p className="text-[11px] font-bold uppercase tracking-wider">
              Estimated Delivery Date
            </p>
          </div>
          <p className="mt-2 text-sm font-black text-slate-900">
            {schedule?.deliveryLabel || "2–3 business days"}
          </p>
          {schedule && (
            <p className="mt-1 text-xs text-slate-500">{schedule.deliveryRange}</p>
          )}
        </div>
      </section>

      <ShippingEligibilityAlert eligibility={shippingEligibility} />

      <section className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Delivery method
        </p>
        <ul className="space-y-3">
          {shippingOffer.options.map((method) => {
            const selected = activeMethod === method.id;
            const cost = estimateShippingCost(method.id, totalWeight, boxCount);
            return (
              <li key={method.id}>
                <label
                  className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-2xl border p-4 ${
                    selected
                      ? "border-sky-500 bg-sky-50 ring-2 ring-sky-200"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="delivery-method"
                    checked={selected}
                    onChange={() => setDeliveryMethod(method.id as DeliveryMethodId)}
                    className="mt-1 h-4 w-4 text-sky-600 focus:ring-sky-500"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-sm font-black text-slate-900">
                        {method.label}
                      </span>
                      <span className="text-sm font-black text-slate-900">
                        {formatCurrency(cost)}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {method.description}
                    </span>
                    {selected && method.scheduleNote && (
                      <span className="mt-2 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                        {method.scheduleNote}
                      </span>
                    )}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
        <span className="font-semibold text-slate-600">Estimated shipping</span>
        <span className="font-black text-slate-900">
          {formatCurrency(shippingCost)}
        </span>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button type="button" variant="outline" className="h-12 md:h-10" onClick={onBack}>
          Back to Address
        </Button>
        <Button
          type="button"
          variant="gradient"
          className="hidden h-12 md:inline-flex md:h-10"
          onClick={onProceed}
          disabled={!selectedAddress}
        >
          Proceed to Payment
        </Button>
      </div>
    </div>
  );
}
