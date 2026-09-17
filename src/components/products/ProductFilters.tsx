"use client";

import React from "react";
import { Filter, RotateCcw } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

export type CatalogAppFilter = "all" | "hand" | "machine";

const GAUGE_OPTIONS = ["all", "60", "70", "80"] as const;
const LENGTH_OPTIONS = ["all", "1000", "1500", "5000"] as const;
const WIDTH_OPTIONS = ["all", "15", "18", "20", "30"] as const;

const chipBase =
  "min-w-[4rem] px-3 py-2 text-xs font-semibold text-center whitespace-nowrap rounded-xl border transition-all duration-150 cursor-pointer";
const chipSelected = "bg-blue-600 text-white border-blue-600 shadow-sm";
const chipIdle =
  "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50";

interface ProductFiltersProps {
  selectedApp: CatalogAppFilter;
  selectedWidth: string;
  selectedGauge: string;
  selectedLength: string;
  onAppChange: (value: CatalogAppFilter) => void;
  onWidthChange: (value: string) => void;
  onGaugeChange: (value: string) => void;
  onLengthChange: (value: string) => void;
  onReset: () => void;
}

export function ProductFilters({
  selectedApp,
  selectedWidth,
  selectedGauge,
  selectedLength,
  onAppChange,
  onWidthChange,
  onGaugeChange,
  onLengthChange,
  onReset,
}: ProductFiltersProps) {
  const { t } = useLanguage();

  const hasActiveFilters =
    selectedApp !== "all" ||
    selectedGauge !== "all" ||
    selectedLength !== "all" ||
    selectedWidth !== "all";

  const labelClass =
    "text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 block";

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-4 sm:p-6 space-y-6 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Filter className="w-4 h-4 text-sky-600" />
          <span>{t("products.filterProducts")}</span>
        </div>
        {hasActiveFilters && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              onReset();
            }}
            className="text-xs text-slate-500 hover:text-sky-600 flex items-center gap-1 transition-colors duration-150 font-medium cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            {t("products.reset")}
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* Section 1: Application Type */}
        <div>
          <label className={labelClass}>{t("products.applicationType")}</label>
          <div className="flex flex-col gap-1.5">
            {(
              [
                { key: "all" as const, label: t("products.allPackagingFilms") },
                { key: "hand" as const, label: t("products.handStretchFilmSeries") },
                {
                  key: "machine" as const,
                  label: t("products.machineHighYieldFilm"),
                },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onAppChange(opt.key);
                }}
                className={`text-left text-xs px-3.5 py-2.5 rounded-xl font-semibold transition-all duration-150 cursor-pointer ${
                  selectedApp === opt.key
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Section 2: Film Width */}
        <div>
          <label className={labelClass}>{t("products.filmWidth")}</label>
          <div className="flex flex-wrap gap-2">
            {WIDTH_OPTIONS.map((w) => {
              const isSelected = selectedWidth === w;
              return (
                <button
                  key={w}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    onWidthChange(w);
                  }}
                  className={`${chipBase} ${isSelected ? chipSelected : chipIdle}`}
                >
                  {w === "all" ? t("products.allWidths") : `${w}"`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 3: Target Gauge (50 Ga excluded) */}
        <div>
          <label className={labelClass}>{t("products.targetGauge")}</label>
          <div className="flex flex-wrap gap-2">
            {GAUGE_OPTIONS.map((g) => {
              const isSelected = selectedGauge === g;
              return (
                <button
                  key={g}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    onGaugeChange(g);
                  }}
                  className={`${chipBase} ${isSelected ? chipSelected : chipIdle}`}
                >
                  {g === "all" ? t("products.allGauges") : `${g} Ga`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 4: Roll Length */}
        <div>
          <label className={labelClass}>{t("products.rollLength")}</label>
          <div className="flex flex-wrap gap-2">
            {LENGTH_OPTIONS.map((len) => {
              const isSelected = selectedLength === len;
              return (
                <button
                  key={len}
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    onLengthChange(len);
                  }}
                  className={`${chipBase} ${isSelected ? chipSelected : chipIdle}`}
                >
                  {len === "all"
                    ? t("products.allLengths")
                    : `${Number(len).toLocaleString()} FT`}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
