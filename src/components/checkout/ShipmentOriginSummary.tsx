"use client";

import { useEffect, useState } from "react";
import {
  SHIP_FROM_LOCATION,
  buildShippingSchedule,
  type ShippingSchedule,
} from "@/lib/shipping-method";

/** Read-only ship-from and date preview for the order summary. */
export function ShipmentOriginSummary() {
  const [schedule, setSchedule] = useState<ShippingSchedule | null>(null);

  useEffect(() => {
    setSchedule(buildShippingSchedule(new Date()));
  }, []);

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white px-4 py-3.5">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
        Shipment
      </p>
      <dl className="mt-2 space-y-2 text-sm">
        <div className="flex items-start justify-between gap-3">
          <dt className="text-slate-500">Ship From</dt>
          <dd className="text-right font-semibold text-slate-900">
            {SHIP_FROM_LOCATION}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-slate-500">Estimated Ship Date</dt>
          <dd className="text-right">
            <span className="block font-semibold text-slate-900">
              {schedule?.shippingLabel || "Next business day"}
            </span>
            {schedule && (
              <span className="mt-0.5 block text-xs text-slate-500">
                {schedule.shippingDate}
              </span>
            )}
          </dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-slate-500">Estimated Delivery Date</dt>
          <dd className="text-right">
            <span className="block font-semibold text-slate-900">
              {schedule?.deliveryLabel || "2–3 business days"}
            </span>
            {schedule && (
              <span className="mt-0.5 block text-xs text-slate-500">
                {schedule.deliveryRange}
              </span>
            )}
          </dd>
        </div>
      </dl>
    </div>
  );
}
