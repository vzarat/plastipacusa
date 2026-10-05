"use client";

import React from "react";
import {
  getDeliveryLeadTime,
  getDeliveryZone,
} from "@/lib/shipping/deliveryEstimates";

export const LOGISTICS_PHONE_DISPLAY = "(956) 400-3683";
export const LOGISTICS_PHONE_HREF = "tel:+19564003683";

export const TEXAS_RGV_NOTE = "Entrega Local Gratis desde 1 Cama (64 rollos)";
export const HOUSTON_FRIDAY_NOTE =
  "Ruta Directa Gratis los Viernes (Tarimas Completas / 256 rollos)";

export const CUSTOM_FREIGHT_BADGE = "Zona de Cobertura por Pedido Directo";
export const CUSTOM_FREIGHT_TITLE =
  "Llama para consultar disponibilidad y fechas de envío";
export const CUSTOM_FREIGHT_DESCRIPTION =
  "Para envíos fuera de nuestras rutas fijas, coordinamos logística consolidada y fechas exactas de entrega vía telefónica.";

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
      <div className="max-w-[240px] rounded-lg border border-slate-200 bg-white px-3 py-2 text-left shadow-lg">
        <p className="text-xs font-black text-slate-900">{stateName}</p>
        <p className="mt-1 text-[11px] font-semibold leading-snug text-sky-800">
          {TEXAS_RGV_NOTE}
        </p>
        <p className="mt-1 text-[11px] font-semibold leading-snug text-sky-800">
          {HOUSTON_FRIDAY_NOTE}
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
          📞 Llamar a Logística: {LOGISTICS_PHONE_DISPLAY}
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
