import React from "react";
import { Layers, Package, Truck } from "lucide-react";
import type { PalletizingSpecs } from "@/lib/palletizing";

interface PalletizingSpecsPanelProps {
  specs: PalletizingSpecs;
  widthLabel?: string;
  gaugeLabel?: string;
  lengthLabel?: string;
}

export function PalletizingSpecsPanel({
  specs,
  widthLabel,
  gaugeLabel,
  lengthLabel,
}: PalletizingSpecsPanelProps) {
  const filmBits = [widthLabel, gaugeLabel, lengthLabel].filter(Boolean).join(" · ");

  return (
    <div className="rounded-3xl border border-slate-200/90 bg-white p-6 sm:p-7 shadow-sm space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Truck className="w-5 h-5 text-sky-600" />
            Palletizing &amp; Shipping Specs
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            Official warehouse palletizing structure for{" "}
            <span className="font-semibold text-slate-700">{specs.familyLabel}</span>
            {filmBits ? ` (${filmBits})` : ""}.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Full Pallet Rolls
          </span>
          <span className="text-xl font-black text-slate-900 mt-1 block">
            {specs.fullPalletRolls}
          </span>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Pallet Layers
          </span>
          <span className="text-xl font-black text-slate-900 mt-1 block">
            {specs.palletLayers}
          </span>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Rolls / Layer
          </span>
          <span className="text-xl font-black text-slate-900 mt-1 block">
            {specs.rollsPerLayer}
          </span>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
            Rolls / Box
          </span>
          <span className="text-xl font-black text-slate-900 mt-1 block">
            {specs.rollsPerBox}
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 text-xs text-slate-600">
        <div className="flex items-start gap-2 flex-1 rounded-xl border border-sky-100 bg-sky-50/70 p-3">
          <Layers className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-800 block mb-0.5">Layer Structure</span>
            <span>
              {specs.palletLayers} layers × {specs.rollsPerLayer} rolls ={" "}
              <strong>{specs.fullPalletRolls} rolls</strong> per full pallet
            </span>
          </div>
        </div>
        <div className="flex items-start gap-2 flex-1 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
          <Package className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold text-slate-800 block mb-0.5">Pack-Out</span>
            <span>{specs.packOutSummary}</span>
            {specs.rollsPerBox > 1 && (
              <span className="block mt-0.5 text-slate-500">
                {specs.boxesPerFullPallet} boxes per full pallet
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
