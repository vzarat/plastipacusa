"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
  USAMap,
  StateAbbreviations,
  type USAStateAbbreviation,
} from "@mirawision/usa-map-react";
import {
  getDeliveryLeadTime,
  getDeliveryZone,
  isTexasState,
} from "@/lib/shipping/deliveryEstimates";
import {
  CoverageStateTooltip,
  useCoverageTooltipDismiss,
  CUSTOM_FREIGHT_DESCRIPTION,
  CUSTOM_FREIGHT_TITLE,
  HOUSTON_BADGE,
  HOUSTON_DESCRIPTION,
  LOGISTICS_PHONE_DISPLAY,
  LOGISTICS_PHONE_HREF,
  RGV_BADGE,
  RGV_DESCRIPTION,
} from "@/components/common/CoverageStateTooltip";

const HUB_FILL = "#2563EB";
const HUB_HOVER = "#1D4ED8";
const STANDARD_FILL = "#CBD5E1";
const STANDARD_HOVER = "#64748B";
const BORDER_WHITE = "#FFFFFF";
const SELECTED_FILL = "#1D4ED8";

const HIGHLIGHT_BADGES = [
  { label: "RGV — Direct Local Delivery", icon: "⚡" },
  { label: "Houston — Weekly Friday Route", icon: "📦" },
  { label: "Freight Quote Required", icon: "🚛" },
] as const;

export function USACoverageSection() {
  const [hovered, setHovered] = useState<USAStateAbbreviation | null>(null);
  const [selected, setSelected] = useState<USAStateAbbreviation | null>(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const dismissTooltip = useCallback(() => setTooltipOpen(false), []);
  useCoverageTooltipDismiss(tooltipOpen, dismissTooltip);

  const handleStateClick = (state: USAStateAbbreviation) => {
    setSelected(state);
    setTooltipOpen(true);
  };

  const customStates = useMemo(() => {
    const settings: Record<
      string,
      {
        fill: string;
        stroke: string;
        onClick: (state: USAStateAbbreviation) => void;
        onHover: (state: USAStateAbbreviation) => void;
        onLeave: () => void;
        tooltip: {
          enabled: boolean;
        };
      }
    > = {};

    StateAbbreviations.forEach((state) => {
      const isTexas = isTexasState(state);
      const isHovered = hovered === state;
      const isSelected = selected === state;

      let fill = STANDARD_FILL;
      if (isTexas) fill = HUB_FILL;

      if (isSelected || isHovered) {
        if (isTexas) fill = isSelected ? SELECTED_FILL : HUB_HOVER;
        else fill = STANDARD_HOVER;
      }

      settings[state] = {
        fill,
        stroke: BORDER_WHITE,
        onClick: handleStateClick,
        onHover: (abbr) => setHovered(abbr),
        onLeave: () => setHovered(null),
        tooltip: { enabled: false },
      };
    });

    return settings;
  }, [hovered, selected]);

  return (
    <section
      id="usa-coverage"
      className="border-t border-slate-200/80"
      style={{
        background:
          "linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 45%, #F1F5F9 100%)",
      }}
      aria-labelledby="usa-coverage-home-heading"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16 space-y-10">
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <h2
            id="usa-coverage-home-heading"
            className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight"
          >
            US Coverage & Logistics Network
          </h2>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Distributing High-Yield GENESIS & FORCE Stretch Film across all 50 US
            States.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
            {HIGHLIGHT_BADGES.map((badge) => (
              <span
                key={badge.label}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-800 shadow-sm"
              >
                <span aria-hidden="true">{badge.icon}</span>
                {badge.label}
              </span>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          <div className="lg:col-span-2 rounded-3xl border border-slate-200/80 bg-white p-3 sm:p-6 shadow-sm">
            <div className="relative w-full [&_svg]:w-full [&_svg]:h-auto [&_svg]:max-h-[440px] transition-colors duration-200">
              <USAMap
                defaultState={{
                  fill: STANDARD_FILL,
                  stroke: BORDER_WHITE,
                  label: { enabled: false },
                  tooltip: { enabled: false },
                }}
                customStates={customStates}
                mapSettings={{ width: "100%", height: "auto" }}
                className="usa-coverage-home-map"
              />
              {tooltipOpen && selected ? (
                <div className="absolute left-2 top-2 z-20">
                  <CoverageStateTooltip
                    abbr={selected}
                    stateName={selected}
                    onClose={dismissTooltip}
                  />
                </div>
              ) : null}
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-[11px] font-bold text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: HUB_FILL }}
                  aria-hidden
                />
                Texas — RGV local delivery and Houston Friday route
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-3 w-3 rounded-sm border border-slate-300"
                  style={{ backgroundColor: STANDARD_FILL }}
                  aria-hidden
                />
                All other states — Freight Quote Required
              </span>
            </div>
          </div>

          <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 min-h-[180px]">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">
              State Delivery Info
            </p>
            {selected ? (
              <div
                key={selected}
                className="space-y-3 animate-in fade-in duration-200"
                role="status"
              >
                <h3 className="text-2xl font-black text-slate-900">{selected}</h3>
                {getDeliveryZone(selected) === "texas" ? (
                  <div className="space-y-2">
                    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/80 px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">
                        {RGV_BADGE}
                      </p>
                      <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-800">
                        {RGV_DESCRIPTION}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-cyan-100 bg-cyan-50/80 px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-800">
                        {HOUSTON_BADGE}
                      </p>
                      <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-800">
                        {HOUSTON_DESCRIPTION}
                      </p>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-600">
                        {CUSTOM_FREIGHT_TITLE}
                      </p>
                      <p className="mt-1 text-sm font-semibold leading-relaxed text-slate-800">
                        {CUSTOM_FREIGHT_DESCRIPTION}
                      </p>
                    </div>
                  </div>
                ) : getDeliveryZone(selected) === "distant" ? (
                  <div className="space-y-3">
                    <p className="text-sm font-semibold leading-snug text-slate-900">
                      {CUSTOM_FREIGHT_TITLE}
                    </p>
                    <p className="text-xs leading-relaxed text-slate-600">
                      {CUSTOM_FREIGHT_DESCRIPTION}
                    </p>
                    <a
                      href={LOGISTICS_PHONE_HREF}
                      className="inline-flex w-full items-center justify-center rounded-xl bg-sky-600 px-3 py-2.5 text-sm font-bold text-white hover:bg-sky-700"
                    >
                      📞 Call Logistics: {LOGISTICS_PHONE_DISPLAY}
                    </a>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm font-semibold leading-relaxed text-blue-900">
                      Estimated delivery to {selected}: {getDeliveryLeadTime(selected)}.
                    </div>
                    <p className="text-sm font-semibold leading-snug text-slate-900">
                      {CUSTOM_FREIGHT_DESCRIPTION}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-500 leading-relaxed">
                Click any state on the map to view route coverage or call logistics for custom freight.
              </p>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}
