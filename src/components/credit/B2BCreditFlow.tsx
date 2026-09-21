"use client";

import React from "react";
import {
  ClipboardList,
  FileText,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react";

const STEPS: {
  step: number;
  title: string;
  description: string;
  icon: LucideIcon;
}[] = [
  {
    step: 1,
    title: "Apply for Credit",
    description: "Submit Tax ID (EIN) and corporate credit references.",
    icon: ClipboardList,
  },
  {
    step: 2,
    title: "Instant PO Checkout",
    description: "Enter official Purchase Order numbers at checkout.",
    icon: FileText,
  },
  {
    step: 3,
    title: "Fast Dispatch",
    description: "Shipments dispatched within 24-48 hours.",
    icon: Truck,
  },
  {
    step: 4,
    title: "Net 30 Terms",
    description: "Pay via ACH, Wire Transfer, or Corporate Check in 30 days.",
    icon: Wallet,
  },
];

export function B2BCreditFlow() {
  return (
    <section
      aria-labelledby="b2b-credit-flow-heading"
      className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm"
    >
      <div className="mb-6 sm:mb-8 space-y-1.5">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-sky-700">
          How it works
        </p>
        <h2
          id="b2b-credit-flow-heading"
          className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight"
        >
          4-Step B2B Credit Flow
        </h2>
        <p className="text-sm text-slate-500 max-w-2xl">
          From application to Net 30 settlement — built for high-volume freight
          and verified corporate accounts.
        </p>
      </div>

      <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {STEPS.map((item, index) => {
          const Icon = item.icon;
          return (
            <li
              key={item.step}
              className="relative flex flex-col rounded-2xl border border-slate-200 bg-slate-50/70 p-5 transition-colors hover:border-sky-300 hover:bg-sky-50/40"
            >
              {index < STEPS.length - 1 ? (
                <span
                  className="hidden lg:block absolute top-9 -right-2.5 w-5 h-px bg-slate-300 z-10"
                  aria-hidden
                />
              ) : null}

              <div className="flex items-center gap-3 mb-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-700 text-white text-sm font-black shadow-sm shadow-sky-500/25">
                  {item.step}
                </span>
                <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-sky-100 bg-white text-sky-700">
                  <Icon className="h-4 w-4" aria-hidden />
                </span>
              </div>

              <h3 className="text-sm font-bold text-slate-900 mb-1.5">
                {item.title}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {item.description}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
