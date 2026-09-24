"use client";

import React, { useMemo, useState } from "react";
import {
  USAMap,
  StateAbbreviations,
  type USAStateAbbreviation,
} from "@mirawision/usa-map-react";
import { Badge } from "@/components/ui/badge";
import { Clock, MapPin, Truck } from "lucide-react";
import {
  getDeliveryLeadTime,
  getDeliveryZone,
  LEAD_TIME_DISTANT,
  LEAD_TIME_REGIONAL,
  LEAD_TIME_TEXAS,
  type DeliveryZone,
} from "@/lib/shipping/deliveryEstimates";

/** Plastipac brand blues for active shipping zones */
const FILL_PRIMARY = "#0052CC";
const FILL_PRIMARY_HOVER = "#0066FF";
const FILL_REGIONAL = "#38BDF8";
const FILL_REGIONAL_HOVER = "#0EA5E9";
const FILL_SECONDARY = "#E2E8F0";
const FILL_SECONDARY_HOVER = "#CBD5E1";
const FILL_SELECTED = "#0284C7";
const STROKE_DEFAULT = "#94A3B8";
const STROKE_PRIMARY = "#1E3A8A";

interface StateCoverage {
  name: string;
  tier: DeliveryZone;
  leadTime: string;
  detail: string;
}

const STATE_NAMES: Record<string, string> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
  DC: "Washington, D.C.",
};

function getCoverage(abbr: string): StateCoverage {
  const code = abbr.toUpperCase();
  const name = STATE_NAMES[code] || code;
  const tier = getDeliveryZone(code);
  const leadTime = getDeliveryLeadTime(code);

  if (tier === "texas") {
    return {
      name,
      tier,
      leadTime,
      detail:
        "Factory-direct dispatch from our South Texas hub. Full-pallet & truckload priority lanes.",
    };
  }

  if (tier === "regional") {
    return {
      name,
      tier,
      leadTime,
      detail:
        "Neighboring-state freight from the South Texas plant with scheduled LTL and FTL options.",
    };
  }

  return {
    name,
    tier,
    leadTime,
    detail:
      "Nationwide USA shipping for full-pallet and truckload orders. Prices in USD.",
  };
}

function tierLabel(tier: DeliveryZone): string {
  if (tier === "texas") return "Texas Hub";
  if (tier === "regional") return "Neighboring States";
  return "Distant States";
}

export function USACoverageMap() {
  const [selected, setSelected] = useState<USAStateAbbreviation | null>("TX");
  const [hovered, setHovered] = useState<USAStateAbbreviation | null>(null);

  const activeAbbr = (hovered || selected) as string | null;
  const activeCoverage = activeAbbr ? getCoverage(activeAbbr) : null;

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
          render: (state: USAStateAbbreviation) => React.ReactNode;
        };
      }
    > = {};

    StateAbbreviations.forEach((state) => {
      const coverage = getCoverage(state);
      const isSelected = selected === state;
      const isHovered = hovered === state;

      let fill = FILL_SECONDARY;
      let stroke = STROKE_DEFAULT;

      if (coverage.tier === "texas") {
        fill = FILL_PRIMARY;
        stroke = STROKE_PRIMARY;
      } else if (coverage.tier === "regional") {
        fill = FILL_REGIONAL;
        stroke = STROKE_PRIMARY;
      }

      if (isSelected) {
        fill = FILL_SELECTED;
        stroke = STROKE_PRIMARY;
      } else if (isHovered) {
        if (coverage.tier === "texas") fill = FILL_PRIMARY_HOVER;
        else if (coverage.tier === "regional") fill = FILL_REGIONAL_HOVER;
        else fill = FILL_SECONDARY_HOVER;
      }

      settings[state] = {
        fill,
        stroke,
        onClick: (abbr) => setSelected(abbr),
        onHover: (abbr) => setHovered(abbr),
        onLeave: () => setHovered(null),
        tooltip: {
          enabled: true,
          render: (abbr) => {
            const info = getCoverage(abbr);
            return (
              <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-left shadow-lg max-w-[220px]">
                <p className="text-xs font-black text-slate-900">{info.name}</p>
                <p className="text-[10px] font-bold text-sky-700 mt-0.5">
                  {info.leadTime}
                </p>
                <p className="text-[10px] text-slate-500 mt-1 leading-snug">
                  {tierLabel(info.tier)}
                </p>
              </div>
            );
          },
        },
      };
    });

    return settings;
  }, [selected, hovered]);

  return (
    <section
      id="usa-shipping-coverage"
      className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-10 shadow-sm space-y-6"
      aria-labelledby="usa-coverage-heading"
    >
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
        <div className="space-y-2 max-w-2xl">
          <Badge variant="default" className="uppercase text-xs tracking-wider font-bold">
            USA Shipping Coverage
          </Badge>
          <h2
            id="usa-coverage-heading"
            className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight"
          >
            Interactive Delivery Map
          </h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Click or hover any state to view Plastipac USA delivery estimates from
            our South Texas plant. All other states are covered nationwide in USD
            pricing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[11px] font-bold">
          <span className="inline-flex items-center gap-1.5 text-slate-700">
            <span
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: FILL_PRIMARY }}
              aria-hidden
            />
            Texas ({LEAD_TIME_TEXAS})
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-700">
            <span
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: FILL_REGIONAL }}
              aria-hidden
            />
            Neighboring ({LEAD_TIME_REGIONAL})
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-700">
            <span
              className="h-3 w-3 rounded-sm border border-slate-300"
              style={{ backgroundColor: FILL_SECONDARY }}
              aria-hidden
            />
            Distant ({LEAD_TIME_DISTANT})
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 w-full overflow-hidden rounded-2xl border border-slate-100 bg-slate-50/60 p-2 sm:p-4">
          <div className="w-full [&_svg]:w-full [&_svg]:h-auto [&_svg]:max-h-[420px]">
            <USAMap
              defaultState={{
                fill: FILL_SECONDARY,
                stroke: STROKE_DEFAULT,
                label: { enabled: false },
                tooltip: { enabled: true },
              }}
              customStates={customStates}
              mapSettings={{ width: "100%", height: "auto" }}
              className="usa-coverage-map"
            />
          </div>
        </div>

        <aside className="rounded-2xl border border-slate-200 bg-gradient-to-br from-sky-50/80 via-white to-blue-50/40 p-5 space-y-4 min-h-[220px]">
          {activeCoverage && activeAbbr ? (
            <>
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Selected State
                  </p>
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-1.5 mt-0.5">
                    <MapPin className="h-4 w-4 text-sky-600 shrink-0" />
                    {activeCoverage.name}
                    <span className="text-sm font-bold text-slate-400">
                      ({activeAbbr})
                    </span>
                  </h3>
                </div>
                <Badge
                  variant={
                    activeCoverage.tier === "texas" ||
                    activeCoverage.tier === "regional"
                      ? "gradient"
                      : "default"
                  }
                  className="text-[10px] font-bold uppercase shrink-0"
                >
                  {tierLabel(activeCoverage.tier)}
                </Badge>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-sky-100 bg-white px-3 py-2.5">
                <Clock className="h-4 w-4 text-sky-600 shrink-0" />
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Est. Delivery
                  </p>
                  <p className="text-sm font-black text-sky-800">
                    {activeCoverage.leadTime}
                  </p>
                </div>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                {activeCoverage.detail}
              </p>

              <div className="flex items-start gap-2 pt-1 text-[11px] text-slate-500">
                <Truck className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                <span>
                  Full-pallet & truckload orders · Prices in USD ·{" "}
                  <a
                    href="tel:+19564003683"
                    className="font-semibold text-sky-700 hover:underline"
                  >
                    (956) 400 36 83
                  </a>
                </span>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">
              Select a state on the map to view shipping coverage and delivery
              estimates.
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}
