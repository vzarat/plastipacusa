"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Filter, RotateCcw } from "lucide-react";

export function ProductFilters() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentApp = searchParams.get("app") || "all";
  const currentGauge = searchParams.get("gauge") || "all";

  const handleAppChange = (app: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (app === "all") {
      params.delete("app");
    } else {
      params.set("app", app);
    }
    router.push(`/products?${params.toString()}`);
  };

  const handleGaugeChange = (gauge: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (gauge === "all") {
      params.delete("gauge");
    } else {
      params.set("gauge", gauge);
    }
    router.push(`/products?${params.toString()}`);
  };

  const resetFilters = () => {
    router.push("/products");
  };

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-6 space-y-6 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <Filter className="w-4 h-4 text-sky-600" />
          <span>Filter Products</span>
        </div>
        {(currentApp !== "all" || currentGauge !== "all") && (
          <button
            onClick={resetFilters}
            className="text-xs text-slate-500 hover:text-sky-600 flex items-center gap-1 transition-colors font-medium"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        )}
      </div>

      {/* Application Type */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
          Application Type
        </label>
        <div className="flex flex-col gap-1.5">
          <button
            type="button"
            onClick={() => handleAppChange("all")}
            className={`text-left text-xs px-3.5 py-2.5 rounded-xl font-semibold transition-all ${
              currentApp === "all"
                ? "bg-gradient-to-r from-sky-400 via-sky-600 to-blue-700 text-white shadow-sm shadow-sky-500/20"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            All Packaging Films
          </button>
          <button
            type="button"
            onClick={() => handleAppChange("hand")}
            className={`text-left text-xs px-3.5 py-2.5 rounded-xl font-semibold transition-all ${
              currentApp === "hand"
                ? "bg-gradient-to-r from-sky-400 via-sky-600 to-blue-700 text-white shadow-sm shadow-sky-500/20"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            Hand Stretch Film Series
          </button>
          <button
            type="button"
            onClick={() => handleAppChange("machine")}
            className={`text-left text-xs px-3.5 py-2.5 rounded-xl font-semibold transition-all ${
              currentApp === "machine"
                ? "bg-gradient-to-r from-sky-400 via-sky-600 to-blue-700 text-white shadow-sm shadow-sky-500/20"
                : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            Machine High-Yield Film
          </button>
        </div>
      </div>

      {/* Thickness / Gauge Range */}
      <div className="space-y-2 pt-3 border-t border-slate-100">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
          Target Gauge
        </label>
        <div className="grid grid-cols-2 gap-2">
          {["all", "55", "60", "70", "80", "90", "115"].map((g) => {
            const isSelected = currentGauge === g;
            return (
              <button
                key={g}
                type="button"
                onClick={() => handleGaugeChange(g)}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold border transition-all text-center ${
                  isSelected
                    ? "border-sky-500 bg-sky-50 text-sky-800 shadow-sm ring-2 ring-sky-500/20"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                }`}
              >
                {g === "all" ? "All Gauges" : `${g} Ga`}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
