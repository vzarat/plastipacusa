"use client";

import React from "react";
import {
  getDeliveryLeadTime,
  getDeliveryZone,
} from "@/lib/shipping/deliveryEstimates";

export const LOGISTICS_PHONE_DISPLAY = "(956) 400-3683";
export const LOGISTICS_PHONE_HREF = "tel:+19564003683";
export const LOGISTICS_PHONE_LABEL = `📞 Call Logistics: ${LOGISTICS_PHONE_DISPLAY}`;

export const RGV_BADGE = "Free Local Delivery";
export const RGV_DESCRIPTION =
  "Free delivery across the RGV starting at 1 Layer (64 rolls / 16 boxes).";
export const HOUSTON_BADGE = "Friday Corridor Route";
export const HOUSTON_DESCRIPTION =
  "Free Friday delivery to industrial docks on Full Pallet orders (256 rolls).";

export const CUSTOM_FREIGHT_BADGE = "Custom Shipping Zone";
export const CUSTOM_FREIGHT_TITLE = "Call to Check Freight Availability & Dates";
export const CUSTOM_FREIGHT_DESCRIPTION =
  "For orders outside our fixed routes, we arrange consolidated freight and schedule direct delivery dates over the phone.";

export function CoverageStateTooltip({
  abbr,
  stateName,
}: {
  abbr: string;
  stateName: string;
}) {
  const zone = getDeliveryZone(abbr);

  if (zone === "texas") {
    return (
      <div className="max-w-[280px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-left shadow-lg">
        <p className="text-xs font-black text-slate-900">{stateName}</p>
        <p className="mt-1.5 inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-800">
          {RGV_BADGE}
        </p>
        <p className="mt-1 text-[11px] font-medium leading-snug text-slate-700">
          {RGV_DESCRIPTION}
        </p>
        <p className="mt-2 inline-flex rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold text-sky-800">
          {HOUSTON_BADGE}
        </p>
        <p className="mt-1 text-[11px] font-medium leading-snug text-slate-700">
          {HOUSTON_DESCRIPTION}
        </p>
      </div>
    );
  }

  if (zone === "distant") {
    return (
      <div className="max-w-[260px] rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left shadow-lg">
        <p className="text-xs font-black text-slate-900">{stateName}</p>
        <p className="mt-1.5 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
          {CUSTOM_FREIGHT_BADGE}
        </p>
        <p className="mt-2 text-[11px] font-semibold leading-snug text-slate-900">
          {CUSTOM_FREIGHT_TITLE}
        </p>
        <p className="mt-1 text-[10px] leading-snug text-slate-600">
          {CUSTOM_FREIGHT_DESCRIPTION}
        </p>
        <a
          href={LOGISTICS_PHONE_HREF}
          className="mt-2 inline-flex text-[11px] font-bold text-sky-700 hover:underline"
          onClick={(event) => event.stopPropagation()}
        >
          📞 Call Logistics: {LOGISTICS_PHONE_DISPLAY}
        </a>
      </div>
    );
  }

  return (
    <div className="max-w-[220px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-left shadow-lg">
      <p className="text-xs font-black text-slate-900">{stateName}</p>
      <p className="mt-0.5 text-[10px] font-bold text-sky-700">
        {getDeliveryLeadTime(abbr)}
      </p>
      <p className="mt-1 text-[10px] leading-snug text-slate-500">Neighboring States</p>
    </div>
  );
}
