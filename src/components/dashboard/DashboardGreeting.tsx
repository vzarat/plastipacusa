"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  FileSpreadsheet,
  Package,
  ShieldCheck,
} from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

function getTimeOfDayKey(): "morning" | "afternoon" | "evening" {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function getFirstName(fullName?: string | null, email?: string | null): string {
  const raw = String(fullName || "").trim();
  if (raw) {
    const first = raw.split(/\s+/)[0];
    if (first) return first;
  }
  const emailLocal = String(email || "")
    .split("@")[0]
    ?.trim();
  if (emailLocal) {
    return emailLocal.charAt(0).toUpperCase() + emailLocal.slice(1);
  }
  return "";
}

interface DashboardGreetingProps {
  fullName?: string | null;
  email?: string | null;
  companyName?: string | null;
}

export function DashboardGreeting({
  fullName,
  email,
  companyName,
}: DashboardGreetingProps) {
  const { t } = useLanguage();
  const [period, setPeriod] = useState<"morning" | "afternoon" | "evening">(
    "morning"
  );

  useEffect(() => {
    setPeriod(getTimeOfDayKey());
  }, []);

  const firstName =
    getFirstName(fullName, email) || t("dashboard.valuedCustomer");
  const displayName = String(fullName || "").trim() || t("dashboard.valuedCustomer");
  const partnerLabel =
    String(companyName || "").trim() || t("role.partner");

  const greetingPrefix =
    period === "morning"
      ? t("dashboard.goodMorning")
      : period === "afternoon"
        ? t("dashboard.goodAfternoon")
        : t("dashboard.goodEvening");

  return (
    <header className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm relative overflow-hidden">
      <div className="absolute right-0 top-0 w-80 h-full bg-gradient-to-l from-sky-50/70 to-transparent pointer-events-none hidden lg:block" />

      <div className="relative z-10 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
        <div className="space-y-3 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-[11px] font-bold text-blue-800 uppercase tracking-wider">
              {t("dashboard.commercialAccount")}
            </span>
            <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              {t("dashboard.factoryDirectPricing")}
            </span>
          </div>

          <div className="space-y-1.5">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {greetingPrefix}, {firstName}!
            </h1>
            <p className="text-sm text-slate-500">
              {t("dashboard.greetingSubtitle")}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 pt-1 text-xs sm:text-sm text-slate-600">
            <span className="inline-flex items-center gap-1.5 font-bold text-slate-800">
              <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              {partnerLabel}
            </span>
            <span className="hidden sm:inline text-slate-300">•</span>
            <span className="font-semibold text-slate-700">{displayName}</span>
            {email ? (
              <>
                <span className="hidden sm:inline text-slate-300">•</span>
                <span className="truncate">{email}</span>
              </>
            ) : null}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row lg:flex-col xl:flex-row items-stretch sm:items-center gap-2.5 shrink-0 lg:pt-1">
          <Link
            href="/products"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold transition-all whitespace-nowrap"
          >
            <Package className="w-3.5 h-3.5 text-slate-500" />
            <span>{t("dashboard.browseCatalog")}</span>
          </Link>

          <Link
            href="/#inquiry-form"
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-blue-950 text-white text-xs font-bold transition-all shadow-xs whitespace-nowrap"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-sky-400" />
            <span>{t("dashboard.customTruckload")}</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
