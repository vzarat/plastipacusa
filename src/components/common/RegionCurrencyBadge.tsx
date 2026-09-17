"use client";

import React from "react";

interface RegionCurrencyBadgeProps {
  className?: string;
}

/** Fixed USA operations badge — no region or MXN switching. */
export function RegionCurrencyBadge({ className = "" }: RegionCurrencyBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-extrabold tracking-wide text-slate-700 shadow-2xs ${className}`}
      title="United States · Prices in USD"
      aria-label="United States, prices in US dollars"
    >
      <span>USA</span>
      <span className="text-slate-300 font-normal" aria-hidden="true">
        |
      </span>
      <span className="text-sky-700">USD $</span>
    </span>
  );
}
