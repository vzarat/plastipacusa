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

const navItemBase =
  "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all duration-200 ease-in-out text-left border-l-4 cursor-pointer";

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

  const handleTab = (key: Exclude<DashboardNavKey, "credit">) => {
    if (key === "settings" && !onNavigate) {
      window.location.href = "/dashboard/settings";
      onCloseMobile?.();
      return;
    }
    if (key === "help" && !onNavigate) {
      window.location.href = "/dashboard";
      onCloseMobile?.();
      return;
    }
    onNavigate?.(key);
    onCloseMobile?.();
  };

  const itemClass = (active: boolean, accent?: "credit") => {
    if (accent === "credit") {
      return `${navItemBase} ${
        active
          ? "border-emerald-600 bg-emerald-50/90 font-bold text-emerald-950 shadow-xs"
          : "border-transparent text-emerald-900 hover:text-emerald-950 hover:bg-emerald-50/70 font-semibold"
      }`;
    }
    return `${navItemBase} ${
      active
        ? "border-blue-600 bg-slate-100/80 font-medium text-blue-900 shadow-xs"
        : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium"
    }`;
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 w-72 shrink-0 bg-white border-r border-slate-200/90 flex flex-col justify-between p-6 transition-transform duration-200 md:sticky md:translate-x-0 md:h-screen md:top-0 ${
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

        {/* Uniform nav: Overview → Reorders → Invoices → Commercial Credit → Settings → Help */}
        <nav className="space-y-1">
          <button
            type="button"
            onClick={() => handleTab("overview")}
            className={itemClass(activeKey === "overview")}
          >
            <LayoutDashboard
              className={`w-4 h-4 ${
                activeKey === "overview" ? "text-blue-600" : "text-slate-400"
              }`}
            />
            <span className="flex-1">{t("dashboard.overviewOrders")}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTab("reorders")}
            className={itemClass(activeKey === "reorders")}
          >
            <RotateCw
              className={`w-4 h-4 ${
                activeKey === "reorders" ? "text-blue-600" : "text-slate-400"
              }`}
            />
            <span className="flex-1">{t("dashboard.quickReorders")}</span>
          </button>

          <button
            type="button"
            onClick={() => handleTab("invoices")}
            className={itemClass(activeKey === "invoices")}
          >
            <Receipt
              className={`w-4 h-4 ${
                activeKey === "invoices" ? "text-blue-600" : "text-slate-400"
              }`}
            />
            <span className="flex-1">{t("dashboard.invoices")}</span>
          </button>

          <Link
            href="/dashboard/credit"
            onClick={onCloseMobile}
            className={itemClass(activeKey === "credit", "credit")}
          >
            <CreditCard
              className={`w-4 h-4 shrink-0 ${
                activeKey === "credit" ? "text-emerald-700" : "text-emerald-600"
              }`}
            />
            <span className="flex-1 min-w-0">
              <span className="block truncate">
                {isSpanish ? "Solicita tu Crédito" : "Commercial Credit"}
              </span>
              <span className="block text-[10px] font-medium text-emerald-700/75 truncate">
                {isSpanish ? "Aplica a términos Net 30" : "Apply for Net 30 Terms"}
              </span>
            </span>
          </Link>

          <button
            type="button"
            onClick={() => handleTab("settings")}
            className={itemClass(activeKey === "settings")}
          >
            <Settings
              className={`w-4 h-4 ${
                activeKey === "settings" ? "text-blue-600" : "text-slate-400"
              }`}
            />
            <span className="flex-1">{t("dashboard.account")}</span>
            {backupPasswordPending && (
              <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                1
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTab("help")}
            className={itemClass(activeKey === "help")}
          >
            <HelpCircle
              className={`w-4 h-4 ${
                activeKey === "help" ? "text-blue-600" : "text-slate-400"
              }`}
            />
            <span className="flex-1">{t("dashboard.support")}</span>
          </button>
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
