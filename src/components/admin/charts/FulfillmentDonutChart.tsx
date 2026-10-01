"use client";

import React, { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import type { AdminOrder } from "@/actions/admin";
import {
  PieChart,
  Truck,
  CheckCircle2,
  Clock,
  Activity,
} from "lucide-react";

interface StatusSegment {
  id: string;
  labelKey: string;
  value: number; // percentage
  count: number;
  color: string;
  hoverColor: string;
}

const SEGMENT_STYLE = [
  { id: "delivered", labelKey: "admin.bentoStatusDelivered", color: "#10b981", hoverColor: "#059669" },
  { id: "in_transit", labelKey: "admin.bentoStatusInTransit", color: "#0284c7", hoverColor: "#0369a1" },
  { id: "processing", labelKey: "admin.bentoStatusProcessing", color: "#f59e0b", hoverColor: "#d97706" },
  { id: "pending", labelKey: "admin.bentoStatusPending", color: "#f43f5e", hoverColor: "#e11d48" },
] as const;

export function FulfillmentDonutChart({ orders = [] }: { orders?: AdminOrder[] }) {
  const { t } = useLanguage();
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);

  const counts = {
    delivered: orders.filter((order) => order.fulfillmentStatus === "fulfilled").length,
    in_transit: orders.filter((order) => order.fulfillmentStatus === "in_transit").length,
    processing: orders.filter(
      (order) =>
        order.fulfillmentStatus === "unfulfilled" && order.paymentStatus === "paid"
    ).length,
    pending: orders.filter((order) => order.paymentStatus === "pending").length,
  };
  const total = orders.length;
  const SEGMENTS: StatusSegment[] = SEGMENT_STYLE.map((style) => {
    const count = counts[style.id];
    return {
      ...style,
      count,
      value: total > 0 ? Math.round((count / total) * 100) : 0,
    };
  });
  const onTimeRate =
    total > 0 ? Math.round((counts.delivered / total) * 100) : 0;
  const recentOrders = [...orders]
    .sort(
      (a, b) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    )
    .slice(0, 3);

  // SVG Donut geometry with wider inner hole so center text breathes comfortably
  const radius = 68;
  const strokeWidth = 17;
  const circumference = 2 * Math.PI * radius;

  // Compute stroke-dasharray and offsets
  let cumulativeOffset = 0;
  const renderedSegments = SEGMENTS.map((seg) => {
    const strokeLength = (seg.value / 100) * circumference;
    const strokeDasharray = `${strokeLength} ${circumference - strokeLength}`;
    const strokeDashoffset = -cumulativeOffset;
    cumulativeOffset += strokeLength;

    return {
      ...seg,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  const activeSegment = SEGMENTS.find((s) => s.id === activeSegmentId);

  return (
    <div className="bg-white border border-slate-200/80 shadow-xs hover:shadow-sm transition-all rounded-2xl p-5 sm:p-6 flex flex-col justify-between space-y-5">
      {/* Header */}
      <div className="w-full space-y-1">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
            <PieChart className="w-3.5 h-3.5 text-emerald-600" />
            <span>{t("admin.bentoFulfillmentTitle")}</span>
          </span>
          <span className="text-[11px] font-bold text-slate-400">
            {total} Orders
          </span>
        </div>
        <p className="text-xs text-slate-400">
          {t("admin.bentoFulfillmentSubtitle")}
        </p>
      </div>

      {/* Centered Donut Chart Container */}
      <div className="relative w-44 h-44 mx-auto flex items-center justify-center my-1 select-none flex-shrink-0">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 180 180">
          {/* Background Ring Track */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="#f8fafc"
            strokeWidth={strokeWidth}
          />

          {/* Segment Arcs */}
          {renderedSegments.map((seg) => {
            const isHovered = activeSegmentId === seg.id;
            return (
              <circle
                key={seg.id}
                cx="90"
                cy="90"
                r={radius}
                fill="none"
                stroke={isHovered ? seg.hoverColor : seg.color}
                strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                strokeDasharray={seg.strokeDasharray}
                strokeDashoffset={seg.strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-200 cursor-pointer"
                onMouseEnter={() => setActiveSegmentId(seg.id)}
                onMouseLeave={() => setActiveSegmentId(null)}
              />
            );
          })}
        </svg>

        {/* Center Readout with Plenty of Breathing Room */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-3">
          {activeSegment ? (
            <div className="space-y-0.5 animate-fade-in">
              <span className="text-2xl font-black text-slate-800 tracking-tight">
                {activeSegment.value}%
              </span>
              <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                {activeSegment.count} Batches
              </span>
            </div>
          ) : (
            <div className="space-y-0.5">
              <span className="text-2xl font-black text-slate-800 tracking-tight">
                {onTimeRate}%
              </span>
              <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {t("admin.bentoOnTimeRate")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Legend Stack in Clean 2-Column Grid Underneath */}
      <div className="w-full grid grid-cols-2 gap-2 text-xs pt-1">
        {SEGMENTS.map((seg) => {
          const isHovered = activeSegmentId === seg.id;
          return (
            <div
              key={seg.id}
              onMouseEnter={() => setActiveSegmentId(seg.id)}
              onMouseLeave={() => setActiveSegmentId(null)}
              className={`flex items-center justify-between gap-1.5 p-1.5 px-2.5 rounded-xl transition-all cursor-pointer ${
                isHovered
                  ? "bg-slate-100 font-semibold"
                  : "hover:bg-slate-50/80 text-slate-600"
              }`}
            >
              <div className="flex items-center gap-1.5 truncate">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="truncate text-slate-600 text-[11px] sm:text-xs">
                  {t(seg.labelKey)}
                </span>
              </div>
              <span className="font-semibold text-slate-800 text-[11px] sm:text-xs shrink-0 ml-1">
                {seg.count}
              </span>
            </div>
          );
        })}
      </div>

      {/* Live Warehouse Activity Alert Feed */}
      <div className="pt-4 border-t border-slate-100 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900">
            <Activity className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
            <span>{t("admin.bentoActivityTitle")}</span>
          </div>
          <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
            Live Yard Feed
          </span>
        </div>

        <div className="space-y-2">
          {recentOrders.length === 0 ? (
            <p className="text-[11px] text-slate-400">No orders yet.</p>
          ) : (
            recentOrders.map((order) => (
              <div
                key={order.id}
                className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-50/70 border border-slate-100"
              >
                <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {order.fulfillmentStatus === "in_transit" ? (
                    <Truck className="w-3 h-3 text-sky-600" />
                  ) : order.fulfillmentStatus === "fulfilled" ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Clock className="w-3 h-3 text-amber-500" />
                  )}
                </div>
                <div className="space-y-0.5 flex-1 min-w-0">
                  <span className="text-[11px] font-bold text-slate-800 truncate block">
                    {order.customerCompany || order.customerName || "Order"}
                  </span>
                  <p className="text-[11px] text-slate-500 line-clamp-1">
                    {order.itemsSummary || "Order"}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
