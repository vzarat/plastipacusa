"use client";

import React from "react";
import {
  ClipboardList,
  FileText,
  Truck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

const STEPS: {
  step: number;
  titleKey: string;
  descKey: string;
  icon: LucideIcon;
}[] = [
  {
    step: 1,
    titleKey: "credit.step1Title",
    descKey: "credit.step1Desc",
    icon: ClipboardList,
  },
  {
    step: 2,
    titleKey: "credit.step2Title",
    descKey: "credit.step2Desc",
    icon: FileText,
  },
  {
    step: 3,
    titleKey: "credit.step3Title",
    descKey: "credit.step3Desc",
    icon: Truck,
  },
  {
    step: 4,
    titleKey: "credit.step4Title",
    descKey: "credit.step4Desc",
    icon: Wallet,
  },
];

export function B2BCreditFlow() {
  const { t } = useLanguage();

  return (
    <section
      aria-labelledby="b2b-credit-flow-heading"
      className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm"
    >
      <div className="mb-6 sm:mb-8 space-y-1.5">
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-sky-700">
          {t("credit.flowEyebrow")}
        </p>
        <h2
          id="b2b-credit-flow-heading"
          className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight"
        >
          {t("credit.flowTitle")}
        </h2>
        <p className="text-sm text-slate-500 max-w-2xl">
          {t("credit.flowSubtitle")}
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
                {t(item.titleKey)}
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                {t(item.descKey)}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
