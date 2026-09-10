"use client";

import React, { useState } from "react";
import Image from "next/image";
import { formatCurrency } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import {
  Layers,
  Search,
  Plus,
  CheckCircle2,
  AlertCircle,
  Package,
  Sliders,
  DollarSign,
  Tag,
  ShieldCheck,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface CatalogItem {
  id: string;
  name: string;
  series: string;
  application: "hand" | "machine";
  gauge: number;
  width: string;
  length: number;
  rollsPerBox: number;
  rollsPerPallet: number;
  casePrice: number;
  palletPrice: number;
  stockStatus: "in_stock" | "low_stock" | "made_to_order";
  palletStock: number;
  image: string;
}

const DEFAULT_CATALOG: CatalogItem[] = [
  {
    id: "CAT-FRC-1880",
    name: 'FORCE Standard 18" Hand Stretch Film',
    series: "FORCE™ Series",
    application: "hand",
    gauge: 80,
    width: '18"',
    length: 1500,
    rollsPerBox: 4,
    rollsPerPallet: 256,
    casePrice: 20.71,
    palletPrice: 1325.44,
    stockStatus: "in_stock",
    palletStock: 84,
    image:
      "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/FORCE_STANDARD.png",
  },
  {
    id: "CAT-ELT-1545",
    name: 'FORCE Elite 15" Ultra-Yield Hand Film',
    series: "FORCE™ Elite",
    application: "hand",
    gauge: 45,
    width: '15"',
    length: 1500,
    rollsPerBox: 4,
    rollsPerPallet: 256,
    casePrice: 18.44,
    palletPrice: 1180.0,
    stockStatus: "in_stock",
    palletStock: 52,
    image:
      "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/FORCE_ELITE.png",
  },
  {
    id: "CAT-GEN-2080",
    name: 'GENESIS Standard 20" Machine Stretch Film',
    series: "GENESIS™ Automatic",
    application: "machine",
    gauge: 80,
    width: '20"',
    length: 5000,
    rollsPerBox: 1,
    rollsPerPallet: 50,
    casePrice: 38.49,
    palletPrice: 1924.4,
    stockStatus: "in_stock",
    palletStock: 40,
    image:
      "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/AUTOMATIC_STRETCH_FILM.png",
  },
  {
    id: "CAT-GEN-3080",
    name: 'GENESIS High-Speed 30" Machine Wrap',
    series: "GENESIS™ Heavy Duty",
    application: "machine",
    gauge: 90,
    width: '30"',
    length: 4500,
    rollsPerBox: 1,
    rollsPerPallet: 40,
    casePrice: 56.2,
    palletPrice: 2248.0,
    stockStatus: "made_to_order",
    palletStock: 12,
    image:
      "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/AUTOMATIC_STRETCH_FILM.png",
  },
];

export function AdminCatalogView() {
  const { t } = useLanguage();
  const [catalog, setCatalog] = useState<CatalogItem[]>(DEFAULT_CATALOG);
  const [search, setSearch] = useState("");
  const [filterApp, setFilterApp] = useState<string>("all");

  const filtered = catalog.filter((item) => {
    if (filterApp !== "all" && item.application !== filterApp) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        item.name.toLowerCase().includes(q) ||
        item.id.toLowerCase().includes(q) ||
        item.series.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold mb-1">
            <span>Admin</span>
            <span>/</span>
            <span className="text-slate-900 font-bold">{t("admin.catalog")}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {t("admin.catalog")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {t("admin.manageCatalog")}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-purple-700 hover:bg-purple-800 text-white shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Film SKU</span>
          </Button>
        </div>
      </div>

      {/* Catalog Table Container */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        {/* Controls */}
        <div className="p-4 sm:px-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by SKU, series name, or gauge..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600/10 focus:border-purple-400"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={filterApp}
              onChange={(e) => setFilterApp(e.target.value)}
              className="text-xs font-semibold py-2 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="all">Application: All</option>
              <option value="hand">Manual Hand Wrap</option>
              <option value="machine">Machine Automated Film</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4 sm:px-6">Film Product & SKU</th>
                <th className="py-3.5 px-3">Application</th>
                <th className="py-3.5 px-3">Gauge / Width</th>
                <th className="py-3.5 px-3">Packaging</th>
                <th className="py-3.5 px-3">Case Price</th>
                <th className="py-3.5 px-3">Pallet Price</th>
                <th className="py-3.5 px-3">Stock Level</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-4 sm:px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 p-1 flex-shrink-0 flex items-center justify-center">
                        <Image
                          src={item.image}
                          alt={item.name}
                          width={36}
                          height={36}
                          className="h-8 w-auto object-contain"
                        />
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-xs">{item.name}</p>
                        <p className="font-mono text-[10px] text-purple-700 font-semibold">
                          {item.id} • {item.series}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="py-4 px-3">
                    <span className="capitalize font-semibold text-slate-700">
                      {item.application === "hand" ? "Manual Hand" : "Automated Machine"}
                    </span>
                  </td>

                  <td className="py-4 px-3 font-semibold text-slate-800">
                    {item.gauge}G • {item.width} x {item.length.toLocaleString()}ft
                  </td>

                  <td className="py-4 px-3 text-slate-600">
                    {item.rollsPerPallet} Rolls / Pallet
                  </td>

                  <td className="py-4 px-3 font-bold text-slate-700">
                    {formatCurrency(item.casePrice)}
                  </td>

                  <td className="py-4 px-3 font-black text-slate-900">
                    {formatCurrency(item.palletPrice)}
                  </td>

                  <td className="py-4 px-3">
                    <span className="font-bold text-slate-800">
                      {item.palletStock} Pallets
                    </span>
                  </td>

                  <td className="py-4 px-4 sm:px-6 text-right">
                    {item.stockStatus === "in_stock" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                        <Check className="w-3 h-3 text-emerald-600" />
                        In Stock
                      </span>
                    ) : item.stockStatus === "low_stock" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
                        Low Stock
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-800 text-[10px] font-bold">
                        Made to Order
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

