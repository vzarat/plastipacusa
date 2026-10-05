"use client";

import React, { useEffect, useRef, useState } from "react";
import type { CatalogAppFilter } from "@/components/products/ProductFilters";

type AttributeKey = "gauge" | "length" | "width" | "app";

const GAUGE_OPTIONS = ["60", "70", "80"] as const;
const LENGTH_OPTIONS = ["1000", "1500", "5000", "6000"] as const;
const WIDTH_OPTIONS = ["15", "18", "20", "30"] as const;
const TYPE_OPTIONS = [
  { value: "hand" as const, label: "Hand Film" },
  { value: "machine" as const, label: "Machine Film" },
];

function formatLength(value: string) {
  return `${Number(value).toLocaleString("en-US")} FT`;
}

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
  return `inline-flex items-center whitespace-nowrap transition-all duration-200 ${
    active
      ? "bg-slate-900 text-white font-semibold rounded-xl px-3 py-2 text-xs"
      : "bg-slate-100/80 text-slate-800 border border-slate-200 hover:bg-slate-200/80 rounded-xl px-3 py-2 text-xs font-medium"
  }`;
}

function optionClass(selected: boolean) {
  return `w-full px-3 py-2.5 text-left transition-colors duration-200 ${
    selected
      ? "bg-slate-900 text-white font-semibold rounded-lg"
      : "hover:bg-slate-100 text-slate-700 font-medium rounded-lg"
  }`;
}

function CountBadge() {
  return (
    <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-white/20 px-1 text-[10px] font-bold text-white">
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
  const [menuKey, setMenuKey] = useState<AttributeKey | null>(null);
  const [sortVisible, setSortVisible] = useState(filtersPanelOpen);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    const onScroll = () => {
      setStuck(node.getBoundingClientRect().top <= 110);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (openKey) {
      setMenuKey(openKey);
      return;
    }
    const timer = window.setTimeout(() => setMenuKey(null), 200);
    return () => window.clearTimeout(timer);
  }, [openKey]);

  useEffect(() => {
    if (filtersPanelOpen) {
      setSortVisible(true);
      return;
    }
    const timer = window.setTimeout(() => setSortVisible(false), 200);
    return () => window.clearTimeout(timer);
  }, [filtersPanelOpen]);

  useEffect(() => {
    if (!openKey) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenKey(null);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [openKey]);

  const closeMenu = () => setOpenKey(null);

  const toggleAttribute = (key: AttributeKey) => {
    setOpenKey((current) => (current === key ? null : key));
    if (filtersPanelOpen) onToggleFiltersPanel();
  };

  const choose = (current: string, value: string, apply: (next: string) => void) => {
    apply(current === value ? "all" : value);
    closeMenu();
  };

  const panelTitle =
    menuKey === "width"
      ? "Width"
      : menuKey === "gauge"
        ? "Gauge"
        : menuKey === "length"
          ? "Length"
          : "Type";

  const clearOpenAttribute = () => {
    if (menuKey === "gauge") onGaugeChange("all");
    if (menuKey === "length") onLengthChange("all");
    if (menuKey === "width") onWidthChange("all");
    if (menuKey === "app") onAppChange("all");
    closeMenu();
  };

  return (
    <div
      ref={rootRef}
      className={`sticky top-[109px] z-30 -mx-4 relative bg-white/95 backdrop-blur-md border-b border-slate-200/80 transition-all duration-200 shadow-sm sm:-mx-6 md:hidden ${
        stuck ? "shadow-md" : ""
      }`}
    >
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-3 py-2">
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
          aria-expanded={openKey === "gauge"}
          onClick={() => toggleAttribute("gauge")}
          className={chipClass(selectedGauge !== "all" || openKey === "gauge")}
        >
          {selectedGauge === "all" ? "Gauge" : `${selectedGauge} GA`}
          {selectedGauge !== "all" && <CountBadge />}
        </button>
        <button
          type="button"
          aria-expanded={openKey === "length"}
          onClick={() => toggleAttribute("length")}
          className={chipClass(selectedLength !== "all" || openKey === "length")}
        >
          {selectedLength === "all" ? "Length" : formatLength(selectedLength)}
          {selectedLength !== "all" && <CountBadge />}
        </button>
        <button
          type="button"
          aria-expanded={openKey === "app"}
          onClick={() => toggleAttribute("app")}
          className={chipClass(selectedApp !== "all" || openKey === "app")}
        >
          {selectedApp === "hand"
            ? "Hand Film"
            : selectedApp === "machine"
              ? "Machine Film"
              : "Type"}
          {selectedApp !== "all" && <CountBadge />}
        </button>
        <button
          type="button"
          aria-expanded={filtersPanelOpen}
          onClick={() => {
            closeMenu();
            onToggleFiltersPanel();
          }}
          className={chipClass(filtersPanelOpen)}
        >
          Sort
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
        className={`absolute left-0 right-0 top-full z-50 px-3 pt-2 transition-all duration-200 ease-out ${
          openKey
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1 opacity-0"
        }`}
      >
        <div>
          {menuKey && (
            <div className="bg-white text-slate-900 border border-slate-200 shadow-xl rounded-2xl p-3 z-40">
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
                {menuKey === "width" &&
                  WIDTH_OPTIONS.map((value) => {
                    const selected = selectedWidth === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => choose(selectedWidth, value, onWidthChange)}
                        className={optionClass(selected)}
                      >
                        {value}&quot;
                      </button>
                    );
                  })}
                {menuKey === "gauge" &&
                  GAUGE_OPTIONS.map((value) => {
                    const selected = selectedGauge === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => choose(selectedGauge, value, onGaugeChange)}
                        className={optionClass(selected)}
                      >
                        {value} GA
                      </button>
                    );
                  })}
                {menuKey === "length" &&
                  LENGTH_OPTIONS.map((value) => {
                    const selected = selectedLength === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => choose(selectedLength, value, onLengthChange)}
                        className={optionClass(selected)}
                      >
                        {formatLength(value)}
                      </button>
                    );
                  })}
                {menuKey === "app" &&
                  TYPE_OPTIONS.map((option) => {
                    const selected = selectedApp === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => {
                          onAppChange(selected ? "all" : option.value);
                          closeMenu();
                        }}
                        className={optionClass(selected)}
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

      {sortVisible && (
        <div
          className={`px-0 transition-opacity duration-200 ease-out ${
            filtersPanelOpen ? "opacity-100" : "pointer-events-none opacity-0"
          }`}
          onClick={(event) => {
            if (!filtersPanelOpen) return;
            if ((event.target as HTMLElement).closest("button")) {
              onToggleFiltersPanel();
            }
          }}
        >
          {filtersPanel}
        </div>
      )}
    </div>
  );
}
