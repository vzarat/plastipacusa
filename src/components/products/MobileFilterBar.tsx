"use client";

import React, { useEffect, useRef, useState } from "react";
import type { CatalogAppFilter } from "@/components/products/ProductFilters";

type AttributeKey = "gauge" | "length" | "width" | "app";

const GAUGE_OPTIONS = ["60", "70", "80"] as const;
const LENGTH_OPTIONS = ["1000", "1500", "5000", "6000"] as const;
const WIDTH_OPTIONS = ["15", "18", "20", "30"] as const;
const TYPE_OPTIONS = [
  { value: "hand" as const, label: "Hand" },
  { value: "machine" as const, label: "Machine" },
];

interface MobileFilterBarProps {
  selectedApp: CatalogAppFilter;
  selectedWidth: string;
  selectedGauge: string;
  selectedLength: string;
  freeShippingOnly: boolean;
  filtersPanelOpen: boolean;
  onToggleFiltersPanel: () => void;
  onAppChange: (value: CatalogAppFilter) => void;
  onWidthChange: (value: string) => void;
  onGaugeChange: (value: string) => void;
  onLengthChange: (value: string) => void;
  onFreeShippingChange: (value: boolean) => void;
  filtersPanel?: React.ReactNode;
}

function chipClass(active: boolean) {
  return `inline-flex items-center rounded-lg border px-3 py-1.5 text-xs font-medium whitespace-nowrap transition-all duration-200 ${
    active
      ? "bg-sky-950/40 border-sky-500 text-sky-400"
      : "border-gray-300 bg-white text-slate-700"
  }`;
}

function CountBadge() {
  return (
    <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-500 px-1 text-[10px] font-bold text-white">
      1
    </span>
  );
}

export function MobileFilterBar({
  selectedApp,
  selectedWidth,
  selectedGauge,
  selectedLength,
  freeShippingOnly,
  filtersPanelOpen,
  onToggleFiltersPanel,
  onAppChange,
  onWidthChange,
  onGaugeChange,
  onLengthChange,
  onFreeShippingChange,
  filtersPanel,
}: MobileFilterBarProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [openKey, setOpenKey] = useState<AttributeKey | null>(null);

  useEffect(() => {
    if (!openKey) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenKey(null);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [openKey]);

  const toggleAttribute = (key: AttributeKey) => {
    setOpenKey((current) => (current === key ? null : key));
    if (filtersPanelOpen) onToggleFiltersPanel();
  };

  const choose = (current: string, value: string, apply: (next: string) => void) => {
    apply(current === value ? "all" : value);
  };

  const panelTitle =
    openKey === "gauge"
      ? "GA (Calibre)"
      : openKey === "length"
        ? "Length"
        : openKey === "width"
          ? "Width"
          : "Type";

  const clearOpenAttribute = () => {
    if (openKey === "gauge") onGaugeChange("all");
    if (openKey === "length") onLengthChange("all");
    if (openKey === "width") onWidthChange("all");
    if (openKey === "app") onAppChange("all");
  };

  return (
    <div ref={rootRef} className="md:hidden">
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-3 py-2">
        <button
          type="button"
          onClick={() => {
            setOpenKey(null);
            onToggleFiltersPanel();
          }}
          className={chipClass(
            filtersPanelOpen ||
              selectedApp !== "all" ||
              selectedWidth !== "all" ||
              selectedGauge !== "all" ||
              selectedLength !== "all"
          )}
        >
          Sort & Filters
        </button>
        <button
          type="button"
          aria-expanded={openKey === "gauge"}
          onClick={() => toggleAttribute("gauge")}
          className={chipClass(selectedGauge !== "all" || openKey === "gauge")}
        >
          {selectedGauge === "all" ? "GA" : `${selectedGauge} GA`}
          {selectedGauge !== "all" && <CountBadge />}
        </button>
        <button
          type="button"
          aria-expanded={openKey === "length"}
          onClick={() => toggleAttribute("length")}
          className={chipClass(selectedLength !== "all" || openKey === "length")}
        >
          {selectedLength === "all" ? "Length" : `${Number(selectedLength).toLocaleString("en-US")} ft`}
          {selectedLength !== "all" && <CountBadge />}
        </button>
        <button
          type="button"
          aria-expanded={openKey === "width"}
          onClick={() => toggleAttribute("width")}
          className={chipClass(selectedWidth !== "all" || openKey === "width")}
        >
          {selectedWidth === "all" ? "Width" : `${selectedWidth}"`}
          {selectedWidth !== "all" && <CountBadge />}
        </button>
        <button
          type="button"
          aria-expanded={openKey === "app"}
          onClick={() => toggleAttribute("app")}
          className={chipClass(selectedApp !== "all" || openKey === "app")}
        >
          {selectedApp === "hand" ? "Hand" : selectedApp === "machine" ? "Machine" : "Type"}
          {selectedApp !== "all" && <CountBadge />}
        </button>
        <button
          type="button"
          onClick={() => onFreeShippingChange(!freeShippingOnly)}
          className={chipClass(freeShippingOnly)}
        >
          Free Shipping
        </button>
      </div>

      <div
        className={`grid px-3 transition-all duration-200 ${
          openKey ? "grid-rows-[1fr] pb-3 opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          {openKey && (
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  {panelTitle}
                </p>
                <button
                  type="button"
                  onClick={clearOpenAttribute}
                  className="text-xs font-semibold text-slate-500 transition-colors duration-200 hover:text-slate-900"
                >
                  Clear
                </button>
              </div>
              <div className="flex flex-col gap-1.5">
                {openKey === "gauge" &&
                  GAUGE_OPTIONS.map((value) => {
                    const selected = selectedGauge === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => choose(selectedGauge, value, onGaugeChange)}
                        className={`rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition-all duration-200 ${
                          selected
                            ? "bg-sky-950/40 border-sky-500 text-sky-700"
                            : "border-slate-200 bg-white text-slate-800 hover:bg-slate-100"
                        }`}
                      >
                        {value} GA
                      </button>
                    );
                  })}
                {openKey === "length" &&
                  LENGTH_OPTIONS.map((value) => {
                    const selected = selectedLength === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => choose(selectedLength, value, onLengthChange)}
                        className={`rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition-all duration-200 ${
                          selected
                            ? "bg-sky-950/40 border-sky-500 text-sky-700"
                            : "border-slate-200 bg-white text-slate-800 hover:bg-slate-100"
                        }`}
                      >
                        {Number(value).toLocaleString("en-US")} ft
                      </button>
                    );
                  })}
                {openKey === "width" &&
                  WIDTH_OPTIONS.map((value) => {
                    const selected = selectedWidth === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => choose(selectedWidth, value, onWidthChange)}
                        className={`rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition-all duration-200 ${
                          selected
                            ? "bg-sky-950/40 border-sky-500 text-sky-700"
                            : "border-slate-200 bg-white text-slate-800 hover:bg-slate-100"
                        }`}
                      >
                        {value}&quot;
                      </button>
                    );
                  })}
                {openKey === "app" &&
                  TYPE_OPTIONS.map((option) => {
                    const selected = selectedApp === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() =>
                          onAppChange(selected ? "all" : option.value)
                        }
                        className={`rounded-xl border px-3 py-2.5 text-left text-sm font-semibold transition-all duration-200 ${
                          selected
                            ? "bg-sky-950/40 border-sky-500 text-sky-700"
                            : "border-slate-200 bg-white text-slate-800 hover:bg-slate-100"
                        }`}
                      >
                        {option.label}
                      </button>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </div>

      {filtersPanelOpen && filtersPanel}
    </div>
  );
}
