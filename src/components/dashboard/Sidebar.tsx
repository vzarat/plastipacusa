"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Building2,
  CreditCard,
  HelpCircle,
  LayoutDashboard,
  LogOut,
  Receipt,
  RotateCw,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { UserProfile, signOut } from "@/actions/auth";
import { useLanguage } from "@/context/LanguageContext";

export type DashboardNavKey =
  | "overview"
  | "reorders"
  | "invoices"
  | "credit"
  | "settings"
  | "help";

interface DashboardSidebarProps {
  profile: UserProfile;
  activeKey: DashboardNavKey;
  onNavigate?: (key: Exclude<DashboardNavKey, "credit">) => void;
  backupPasswordPending?: boolean;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export function DashboardSidebar({
  profile,
  activeKey,
  onNavigate,
  backupPasswordPending = false,
  isMobileOpen = false,
  onCloseMobile,
}: DashboardSidebarProps) {
  const { t, locale } = useLanguage();
  const isSpanish = locale === "es";

  const tabItems: {
    key: Exclude<DashboardNavKey, "credit">;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { key: "overview", label: t("dashboard.overviewOrders"), icon: LayoutDashboard },
    { key: "reorders", label: t("dashboard.quickReorders"), icon: RotateCw },
    { key: "invoices", label: t("dashboard.invoices"), icon: Receipt },
    { key: "settings", label: t("dashboard.account"), icon: Settings },
    { key: "help", label: t("dashboard.support"), icon: HelpCircle },
  ];

  const handleTab = (key: Exclude<DashboardNavKey, "credit">) => {
    onNavigate?.(key);
    onCloseMobile?.();
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200/90 flex flex-col justify-between p-6 transition-transform duration-200 md:sticky md:translate-x-0 md:h-screen md:top-0 ${
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="space-y-6 overflow-y-auto">
        <div className="space-y-2">
          <Link href="/" className="inline-block" onClick={onCloseMobile}>
            <Image
              src="https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PLASTIPAC_USA_LOGO%202.svg"
              alt="Plastipac USA Portal"
              width={180}
              height={48}
              priority
              className="h-10 w-auto object-contain"
            />
          </Link>
          <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-900 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
            <span>{t("dashboard.portalCommercial")}</span>
          </div>
        </div>

        <nav className="space-y-1">
          {tabItems.slice(0, 3).map((item) => {
            const Icon = item.icon;
            const isActive = activeKey === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleTab(item.key)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all duration-200 ease-in-out text-left border-l-4 cursor-pointer ${
                  isActive
                    ? "border-blue-600 bg-slate-100/80 font-medium text-blue-900 shadow-xs"
                    : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium"
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-colors duration-200 ${
                    isActive ? "text-blue-600" : "text-slate-400"
                  }`}
                />
                <span className="flex-1">{item.label}</span>
              </button>
            );
          })}

          {/* Commercial Credit — prominent CTA */}
          <Link
            href="/dashboard/credit"
            onClick={onCloseMobile}
            className={`w-full flex flex-col gap-0.5 px-3.5 py-3 rounded-xl text-left border-l-4 transition-all duration-200 ${
              activeKey === "credit"
                ? "border-emerald-600 bg-emerald-50/90 shadow-xs"
                : "border-emerald-200/80 bg-gradient-to-r from-emerald-50 to-sky-50 hover:from-emerald-100/80 hover:to-sky-100/80"
            }`}
          >
            <span className="flex items-center gap-3">
              <CreditCard
                className={`w-4 h-4 ${
                  activeKey === "credit" ? "text-emerald-700" : "text-emerald-600"
                }`}
              />
              <span
                className={`text-xs font-bold ${
                  activeKey === "credit" ? "text-emerald-950" : "text-emerald-900"
                }`}
              >
                {isSpanish ? "Solicita tu Crédito" : "Commercial Credit"}
              </span>
            </span>
            <span className="pl-7 text-[10px] font-semibold text-emerald-700/80">
              {isSpanish ? "Aplica a términos Net 30" : "Apply for Net 30 Terms"}
            </span>
          </Link>

          {tabItems.slice(3).map((item) => {
            const Icon = item.icon;
            const isActive = activeKey === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  if (item.key === "settings") {
                    // Prefer dedicated settings URL when navigating from credit page
                    if (!onNavigate) {
                      window.location.href = "/dashboard/settings";
                      return;
                    }
                  }
                  if (item.key === "help" && !onNavigate) {
                    window.location.href = "/dashboard";
                    return;
                  }
                  handleTab(item.key);
                }}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all duration-200 ease-in-out text-left border-l-4 cursor-pointer ${
                  isActive
                    ? "border-blue-600 bg-slate-100/80 font-medium text-blue-900 shadow-xs"
                    : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium"
                }`}
              >
                <Icon
                  className={`w-4 h-4 transition-colors duration-200 ${
                    isActive ? "text-blue-600" : "text-slate-400"
                  }`}
                />
                <span className="flex-1">{item.label}</span>
                {item.key === "settings" && backupPasswordPending && (
                  <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                    1
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="pt-2">
          <Link
            href="/products"
            onClick={onCloseMobile}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:text-sky-700 hover:border-sky-300 text-xs font-semibold bg-slate-50/50 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
            <span>{t("dashboard.storefrontCatalog")}</span>
          </Link>
        </div>
      </div>

      <div className="pt-6 border-t border-slate-100 space-y-3 shrink-0">
        <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-xl text-white flex items-center justify-center font-bold text-xs uppercase flex-shrink-0 ${
                profile.role === "admin" ? "bg-purple-700" : "bg-slate-900"
              }`}
            >
              {profile.fullName?.charAt(0) || "C"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-slate-900 truncate">
                {profile.fullName || profile.email}
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {profile.companyName || t("role.partner")}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
            {profile.role === "admin" ? (
              <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-800 border border-purple-200 text-xs font-semibold px-2 py-0.5 rounded-full">
                <ShieldCheck className="w-3 h-3 text-purple-600" />
                {t("role.admin")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 border border-blue-200 text-xs font-semibold px-2 py-0.5 rounded-full">
                <Building2 className="w-3 h-3 text-blue-600" />
                {t("role.client")}
              </span>
            )}
            <span className="uppercase text-[9px] font-bold text-slate-400">
              {t("common.active")}
            </span>
          </div>

          {profile.role === "admin" && (
            <Link
              href="/admin"
              prefetch={false}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-xs transition-colors"
            >
              {t("nav.adminPortal")}
            </Link>
          )}
        </div>

        <button
          type="button"
          onClick={() => signOut()}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          {t("nav.signOut")}
        </button>
      </div>
    </aside>
  );
}
