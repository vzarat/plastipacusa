"use client";

import React, { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";
import {
  BarChart3,
  Layers,
  Sparkles,
  Package,
  TrendingUp,
} from "lucide-react";

interface CategoryData {
  id: string;
  nameKey: string;
  specBadge: string;
  percentage: number;
  ordersCount: number;
  palletsCount: number;
  gradient: string;
  barColor: string;
}

const CATEGORIES: CategoryData[] = [
  {
    id: "hand_stretch",
    nameKey: "admin.bentoCatHand",
    specBadge: "50G - 80G Manual",
    percentage: 44,
    ordersCount: 580,
    palletsCount: 1640,
    gradient: "from-blue-600 to-indigo-600",
    barColor: "#2563eb",
  },
  {
    id: "machine_cast",
    nameKey: "admin.bentoCatMachine",
    specBadge: "Cast High-Speed",
    percentage: 30,
    ordersCount: 395,
    palletsCount: 2280,
    gradient: "from-indigo-600 to-purple-600",
    barColor: "#4f46e5",
  },
  {
    id: "pre_stretch",
    nameKey: "admin.bentoCatNano",
    specBadge: "Coreless 300% Nano",
    percentage: 16,
    ordersCount: 210,
    palletsCount: 920,
    gradient: "from-purple-600 to-pink-500",
    barColor: "#9333ea",
  },
  {
    id: "edge_protectors",
    nameKey: "admin.bentoCatEdge",
    specBadge: "V-Board & Corners",
    percentage: 10,
    ordersCount: 132,
    palletsCount: 480,
    gradient: "from-amber-500 to-orange-500",
    barColor: "#f59e0b",
  },
];

export function CategoryBarChart() {
  const { t } = useLanguage();
  const [hoveredCatId, setHoveredCatId] = useState<string | null>(null);

  const totalOrders = CATEGORIES.reduce((sum, c) => sum + c.ordersCount, 0);
  const totalPallets = CATEGORIES.reduce((sum, c) => sum + c.palletsCount, 0);

  return (
    <div className="bg-white border border-slate-200/80 shadow-xs hover:shadow-sm transition-all rounded-2xl p-6 space-y-6 flex flex-col justify-between">
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-purple-50 text-purple-800 border border-purple-200">
            <BarChart3 className="w-3.5 h-3.5 text-purple-600" />
            <span>{t("admin.bentoCategoryTitle")}</span>
          </span>
          <span className="text-[11px] font-bold text-slate-400">
            {totalOrders.toLocaleString()} Orders
          </span>
        </div>
        <p className="text-xs text-slate-500">
          {t("admin.bentoCategorySubtitle")}
        </p>
      </div>

      {/* Modern Horizontal Bar List */}
      <div className="flex flex-col gap-5">
        {CATEGORIES.map((cat) => {
          const isHovered = hoveredCatId === cat.id;

          return (
            <div
              key={cat.id}
              onMouseEnter={() => setHoveredCatId(cat.id)}
              onMouseLeave={() => setHoveredCatId(null)}
              className={`p-3 rounded-xl transition-all cursor-pointer ${
                isHovered
                  ? "bg-slate-50/80 border border-slate-200/90 shadow-2xs"
                  : "border border-transparent hover:bg-slate-50/40"
              }`}
            >
              {/* Category Title & Numbers */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span
                    className="text-xs font-bold text-slate-900 truncate max-w-[140px] sm:max-w-[170px]"
                    title={t(cat.nameKey)}
                  >
                    {t(cat.nameKey)}
                  </span>
                  <span className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 shrink-0">
                    {cat.specBadge}
                  </span>
                </div>

                <div className="flex items-center gap-2 text-xs flex-shrink-0">
                  <span className="font-mono font-bold text-slate-900">
                    {cat.palletsCount.toLocaleString()}{" "}
                    <span className="text-[10px] font-normal text-slate-400">
                      Plt
                    </span>
                  </span>
                  <span className="font-black text-slate-700 w-9 text-right">
                    {cat.percentage}%
                  </span>
                </div>
              </div>

              {/* Progress Bar Track */}
              <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden relative">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${cat.gradient} transition-all duration-500`}
                  style={{
                    width: `${cat.percentage}%`,
                    opacity: isHovered ? 1 : 0.9,
                  }}
                />
              </div>

              {/* Sub-details shown on hover */}
              {isHovered && (
                <div className="flex items-center justify-between text-[11px] text-slate-500 mt-2 animate-fade-in pt-1 border-t border-slate-100">
                  <span>{cat.ordersCount} purchase orders</span>
                  <span className="text-purple-600 font-semibold">
                    ~{(cat.palletsCount / 22).toFixed(1)} Truckloads
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer Metrics Banner */}
      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-slate-600">
          <Layers className="w-4 h-4 text-purple-600" />
          <span className="font-semibold">Total Pallet Output:</span>
        </div>
        <span className="font-mono font-bold text-slate-900">
          {totalPallets.toLocaleString()} Pallets ({Math.round(totalPallets / 22)} TL)
        </span>
      </div>
    </div>
  );
}

