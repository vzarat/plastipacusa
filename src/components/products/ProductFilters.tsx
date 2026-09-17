"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter, RotateCcw } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

const GAUGE_OPTIONS = ["all", "60", "70", "80"] as const;
const LENGTH_OPTIONS = ["all", "1000", "1500", "5000"] as const;
const WIDTH_OPTIONS = ["all", "18", "20", "30"] as const;

const chipBase =
  "min-w-[4rem] px-3 py-2 text-xs font-semibold text-center whitespace-nowrap rounded-xl border transition-all";
const chipSelected =
  "border-sky-500 bg-sky-50 text-sky-800 shadow-sm ring-2 ring-sky-500/20";
const chipIdle =
  "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50";

export function ProductFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLanguage();

  const currentApp = searchParams.get("app") || "all";
  const currentGauge = searchParams.get("gauge") || "all";
  const currentLength = searchParams.get("length") || "all";
  const currentWidth = searchParams.get("width") || "all";

  const updateParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    router.push(`/products?${params.toString()}`);
  };

  const resetFilters = () => {
    router.push("/products");
  };

  const hasActiveFilters =
    currentApp !== "all" ||
    currentGauge !== "all" ||
    currentLength !== "all" ||
    currentWidth !== "all";

  const labelClass = "text-xs font-bold uppercase tracking-wider text-slate-500 block";

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
            onClick={resetFilters}
            className="text-xs text-slate-500 hover:text-sky-600 flex items-center gap-1 transition-colors font-medium"
          >
            <RotateCcw className="w-3 h-3" />
            {t("products.reset")}
          </button>
        )}
      </div>

      <div className="space-y-6">
        {/* Application Type */}
        <div className="space-y-2">
          <label className={labelClass}>{t("products.applicationType")}</label>
          <div className="flex flex-col gap-1.5">
            {(
              [
                { key: "all", label: t("products.allPackagingFilms") },
                { key: "hand", label: t("products.handStretchFilmSeries") },
                { key: "machine", label: t("products.machineHighYieldFilm") },
              ] as const
            ).map((opt) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => updateParam("app", opt.key)}
                className={`text-left text-xs px-3.5 py-2.5 rounded-xl font-semibold transition-all ${
                  currentApp === opt.key
                    ? "bg-gradient-to-r from-sky-400 via-sky-600 to-blue-700 text-white shadow-sm shadow-sky-500/20"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Target Gauge */}
        <div className="space-y-2">
          <label className={labelClass}>{t("products.targetGauge")}</label>
          <div className="flex flex-wrap gap-2">
            {GAUGE_OPTIONS.map((g) => {
              const isSelected = currentGauge === g;
              return (
                <button
                  key={g}
                  type="button"
                  onClick={() => updateParam("gauge", g)}
                  className={`${chipBase} ${isSelected ? chipSelected : chipIdle}`}
                >
                  {g === "all" ? t("products.allGauges") : `${g} Ga`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Roll Length */}
        <div className="space-y-2">
          <label className={labelClass}>{t("products.rollLength")}</label>
          <div className="flex flex-wrap gap-2">
            {LENGTH_OPTIONS.map((len) => {
              const isSelected = currentLength === len;
              return (
                <button
                  key={len}
                  type="button"
                  onClick={() => updateParam("length", len)}
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

        {/* Film Width */}
        <div className="space-y-2">
          <label className={labelClass}>{t("products.filmWidth")}</label>
          <div className="flex flex-wrap gap-2">
            {WIDTH_OPTIONS.map((w) => {
              const isSelected = currentWidth === w;
              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => updateParam("width", w)}
                  className={`${chipBase} ${isSelected ? chipSelected : chipIdle}`}
                >
                  {w === "all" ? t("products.allWidths") : `${w}"`}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
