"use client";

import React, { useMemo, useState } from "react";
import {
  USAMap,
  StateAbbreviations,
  type USAStateAbbreviation,
} from "@mirawision/usa-map-react";
import { toast } from "sonner";
import {
  getDeliveryLeadTime,
  isRegionalState,
  isTexasState,
} from "@/lib/shipping/deliveryEstimates";

const HUB_FILL = "#2563EB";
const HUB_HOVER = "#1D4ED8";
const REGIONAL_FILL = "#38BDF8";
const REGIONAL_HOVER = "#0EA5E9";
const STANDARD_FILL = "#CBD5E1";
const STANDARD_HOVER = "#64748B";
const BORDER_WHITE = "#FFFFFF";
const SELECTED_FILL = "#1D4ED8";

const HIGHLIGHT_BADGES = [
  { label: "1 - 2 Days in Texas", icon: "⚡" },
  { label: "Direct Factory Shipping", icon: "📦" },
  { label: "Full Pallet & LTL Freight Discounts", icon: "🚛" },
] as const;

function laneLabel(abbr: string): string {
  if (isTexasState(abbr)) return "Texas hub";
  if (isRegionalState(abbr)) return "Neighboring lane";
  return "Distant lane";
}

export function USACoverageSection() {
  const [hovered, setHovered] = useState<USAStateAbbreviation | null>(null);
  const [selected, setSelected] = useState<USAStateAbbreviation | null>(null);

  const handleStateClick = (state: USAStateAbbreviation) => {
    setSelected(state);
    const leadTime = getDeliveryLeadTime(state);
    toast.message(
      `Estimated Delivery to ${state}: ${leadTime}. Free freight available on Full Pallet orders.`
    );
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
      }
    > = {};

    StateAbbreviations.forEach((state) => {
      const isTexas = isTexasState(state);
      const isRegional = isRegionalState(state);
      const isHovered = hovered === state;
      const isSelected = selected === state;

      let fill = STANDARD_FILL;
      if (isTexas) fill = HUB_FILL;
      else if (isRegional) fill = REGIONAL_FILL;

      if (isSelected || isHovered) {
        if (isTexas) fill = isSelected ? SELECTED_FILL : HUB_HOVER;
        else if (isRegional) fill = REGIONAL_HOVER;
        else fill = STANDARD_HOVER;
      }

      settings[state] = {
        fill,
        stroke: BORDER_WHITE,
        onClick: handleStateClick,
        onHover: (abbr) => setHovered(abbr),
        onLeave: () => setHovered(null),
      };
    });

    return settings;
  }, [hovered, selected]);

  const activeState = hovered || selected;
  const selectedLeadTime = selected ? getDeliveryLeadTime(selected) : null;

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
            Nationwide Fast Delivery & Freight Coverage
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
            <div className="w-full [&_svg]:w-full [&_svg]:h-auto [&_svg]:max-h-[440px] transition-colors duration-200">
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
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-[11px] font-bold text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: HUB_FILL }}
                  aria-hidden
                />
                Texas (1 - 2 Days)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-3 w-3 rounded-sm"
                  style={{ backgroundColor: REGIONAL_FILL }}
                  aria-hidden
                />
                Neighboring (6 - 7 Days)
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span
                  className="h-3 w-3 rounded-sm border border-slate-300"
                  style={{ backgroundColor: STANDARD_FILL }}
                  aria-hidden
                />
                Distant (7 - 8 Days)
              </span>
            </div>
          </div>

          <aside className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-4 min-h-[180px]">
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-blue-600">
              State Delivery Info
            </p>
            {selected && selectedLeadTime ? (
              <div
                key={selected}
                className="space-y-3 animate-in fade-in duration-200"
                role="status"
              >
                <h3 className="text-2xl font-black text-slate-900">{selected}</h3>
                <div className="rounded-2xl border border-blue-100 bg-blue-50/80 px-4 py-3 text-sm font-semibold text-blue-900 leading-relaxed">
                  Estimated Delivery to {selected}: {selectedLeadTime}. Free
                  freight available on Full Pallet orders.
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Click another state to refresh delivery estimates. All pricing
                  is in USD.
                </p>
              </div>
            ) : (
              <p className="text-sm text-slate-500 leading-relaxed">
                Click any state on the map to view estimated delivery timing and
                full-pallet freight availability.
              </p>
            )}

            {activeState && (
              <p className="text-[11px] font-bold text-slate-400">
                Active: {activeState} · {laneLabel(String(activeState))} ·{" "}
                {getDeliveryLeadTime(String(activeState))}
              </p>
            )}
          </aside>
        </div>
      </div>
    </section>
  );
}
