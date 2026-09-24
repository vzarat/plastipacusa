"use client";

import React, { useEffect, useState } from "react";
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
}

export function DashboardGreeting({ fullName, email }: DashboardGreetingProps) {
  const { t } = useLanguage();
  const [period, setPeriod] = useState<"morning" | "afternoon" | "evening">(
    "morning"
  );

  useEffect(() => {
    setPeriod(getTimeOfDayKey());
  }, []);

  const firstName =
    getFirstName(fullName, email) || t("dashboard.valuedCustomer");

  const greetingPrefix =
    period === "morning"
      ? t("dashboard.goodMorning")
      : period === "afternoon"
        ? t("dashboard.goodAfternoon")
        : t("dashboard.goodEvening");

  return (
    <header className="space-y-1">
      <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
        {greetingPrefix}, {firstName}!
      </h1>
      <p className="text-sm text-slate-500">
        {t("dashboard.greetingSubtitle")}
      </p>
    </header>
  );
}
