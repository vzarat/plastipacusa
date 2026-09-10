"use client";

import React, { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
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

const SEGMENTS: StatusSegment[] = [
  {
    id: "delivered",
    labelKey: "admin.bentoStatusDelivered",
    value: 48,
    count: 156,
    color: "#10b981", // emerald-500
    hoverColor: "#059669",
  },
  {
    id: "in_transit",
    labelKey: "admin.bentoStatusInTransit",
    value: 28,
    count: 91,
    color: "#0284c7", // sky-600
    hoverColor: "#0369a1",
  },
  {
    id: "processing",
    labelKey: "admin.bentoStatusProcessing",
    value: 16,
    count: 52,
    color: "#f59e0b", // amber-500
    hoverColor: "#d97706",
  },
  {
    id: "pending",
    labelKey: "admin.bentoStatusPending",
    value: 8,
    count: 26,
    color: "#f43f5e", // rose-500
    hoverColor: "#e11d48",
  },
];

interface LiveActivityItem {
  id: string;
  title: string;
  description: string;
  timeAgo: string;
  type: "success" | "transit" | "warning";
}

const LIVE_ACTIVITIES: LiveActivityItem[] = [
  {
    id: "1",
    title: "Laredo Hub Dock #4 Linehaul",
    description: "40ft pallet load cleared US-MX customs for Dallas linehaul.",
    timeAgo: "14m ago",
    type: "transit",
  },
  {
    id: "2",
    title: "Extrusion Line #2 (FORCE™ 50G)",
    description: "520 rolls automated packing completed. 100% tensile QA pass.",
    timeAgo: "48m ago",
    type: "success",
  },
  {
    id: "3",
    title: "Net-30 Commercial Credit Approval",
    description: "Approved $45,000 line for General Motors Component Plant.",
    timeAgo: "2h ago",
    type: "warning",
  },
];

export function FulfillmentDonutChart() {
  const { t } = useLanguage();
  const [activeSegmentId, setActiveSegmentId] = useState<string | null>(null);

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
            325 Batches
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
                94%
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
          {LIVE_ACTIVITIES.map((act) => (
            <div
              key={act.id}
              className="flex items-start gap-2.5 p-2 rounded-xl bg-slate-50/70 border border-slate-100 hover:border-slate-200 transition-colors"
            >
              <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center flex-shrink-0 text-slate-700 shadow-2xs mt-0.5">
                {act.type === "transit" && (
                  <Truck className="w-3 h-3 text-sky-600" />
                )}
                {act.type === "success" && (
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                )}
                {act.type === "warning" && (
                  <Clock className="w-3 h-3 text-amber-500" />
                )}
              </div>
              <div className="space-y-0.5 flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[11px] font-bold text-slate-800 truncate">
                    {act.title}
                  </span>
                  <span className="text-[10px] text-slate-400 flex-shrink-0">
                    {act.timeAgo}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 line-clamp-1">
                  {act.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
