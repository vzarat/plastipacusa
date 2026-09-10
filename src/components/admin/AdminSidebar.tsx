"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { UserProfile, signOut } from "@/actions/auth";
import { useLanguage } from "@/context/LanguageContext";
import {
  LayoutDashboard,
  Package,
  Layers,
  Building2,
  Settings,
  ShieldCheck,
  ArrowLeft,
  LogOut,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

export type AdminTabKey = "overview" | "orders" | "products" | "customers" | "settings";

interface AdminSidebarProps {
  activeTab: AdminTabKey;
  onTabChange: (tab: AdminTabKey) => void;
  isMobileOpen: boolean;
  onCloseMobile: () => void;
  profile: UserProfile;
  ordersCount?: number;
  pendingCount?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function AdminSidebar({
  activeTab,
  onTabChange,
  isMobileOpen,
  onCloseMobile,
  profile,
  ordersCount = 0,
  pendingCount = 0,
  isCollapsed: controlledIsCollapsed,
  onToggleCollapse,
}: AdminSidebarProps) {
  const { t } = useLanguage();
  const [internalIsCollapsed, setInternalIsCollapsed] = useState(false);

  const isCollapsed =
    controlledIsCollapsed !== undefined
      ? controlledIsCollapsed
      : internalIsCollapsed;

  const handleToggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse();
    } else {
      setInternalIsCollapsed(!internalIsCollapsed);
    }
  };

  const NAV_ITEMS: {
    key: AdminTabKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    {
      key: "overview",
      label: t("admin.overview"),
      icon: LayoutDashboard,
    },
    {
      key: "orders",
      label: t("admin.ordersQuotes"),
      icon: Package,
      badge: pendingCount > 0 ? pendingCount : ordersCount,
    },
    {
      key: "products",
      label: t("admin.catalog"),
      icon: Layers,
    },
    {
      key: "customers",
      label: t("admin.customers"),
      icon: Building2,
    },
    {
      key: "settings",
      label: t("admin.settings"),
      icon: Settings,
    },
  ];

  const handleNavClick = (key: AdminTabKey) => {
    onTabChange(key);
    onCloseMobile();
  };

  return (
    <>
      {/* Mobile Dark Backdrop Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 z-40 md:hidden backdrop-blur-xs transition-opacity duration-200"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 bg-white border-r border-slate-200/90 flex flex-col justify-between transition-all duration-300 ease-in-out md:static md:translate-x-0 md:h-screen md:sticky md:top-0 flex-shrink-0 ${
          isCollapsed ? "w-72 md:w-20 p-6 md:p-3" : "w-72 p-6"
        } ${isMobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full md:translate-x-0"}`}
      >
        {/* Top Section: Logo, Ops Badge, Collapse Toggle & Navigation */}
        <div className="space-y-5">
          {/* Logo & Toggle Header */}
          <div className="flex items-center justify-between gap-2">
            {!isCollapsed ? (
              <>
                <Link href="/admin" className="inline-block">
                  <Image
                    src="https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PLASTIPAC_USA_LOGO%202.svg"
                    alt="Plastipac USA Admin"
                    width={160}
                    height={42}
                    priority
                    className="h-9 w-auto object-contain"
                  />
                </Link>

                <div className="flex items-center gap-1">
                  {/* Desktop Collapse Toggle */}
                  <button
                    type="button"
                    onClick={handleToggle}
                    className="hidden md:flex p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                    aria-label="Collapse sidebar"
                    title="Collapse sidebar"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {/* Mobile Close Button */}
                  <button
                    type="button"
                    onClick={onCloseMobile}
                    className="md:hidden p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
                    aria-label="Close sidebar"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </>
            ) : (
              <div className="w-full flex items-center md:flex-col justify-between md:justify-center gap-3">
                {/* On mobile drawer view, show regular logo & close button */}
                <div className="md:hidden flex items-center justify-between w-full">
                  <Link href="/admin">
                    <Image
                      src="https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PLASTIPAC_USA_LOGO%202.svg"
                      alt="Plastipac USA Admin"
                      width={140}
                      height={36}
                      className="h-8 w-auto object-contain"
                    />
                  </Link>
                  <button
                    type="button"
                    onClick={onCloseMobile}
                    className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* On desktop collapsed view, show initial badge & expand button */}
                <div className="hidden md:flex flex-col items-center gap-3 w-full">
                  <Link
                    href="/admin"
                    className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-xs hover:bg-blue-700 transition-colors"
                    title="Plastipac USA Admin"
                  >
                    P
                  </Link>

                  <button
                    type="button"
                    onClick={handleToggle}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer"
                    aria-label="Expand sidebar"
                    title="Expand sidebar"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Admin Context Badge */}
          {!isCollapsed ? (
            <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-blue-900 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200/80">
              <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
              <span className="truncate">Shopify B2B Operations Admin</span>
            </div>
          ) : (
            <div
              className="hidden md:flex items-center justify-center p-2 text-blue-600 bg-blue-50 rounded-xl border border-blue-200 relative group cursor-pointer"
              title="Shopify B2B Operations Admin"
            >
              <ShieldCheck className="w-4 h-4" />
              <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap">
                Shopify B2B Operations Admin
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <nav className="space-y-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;

              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleNavClick(item.key)}
                  className={`w-full flex items-center ${
                    isCollapsed ? "justify-center p-3" : "justify-between px-3.5 py-2.5 border-l-4"
                  } rounded-xl text-xs transition-all duration-200 relative group cursor-pointer ${
                    isActive
                      ? isCollapsed
                        ? "bg-blue-50 text-blue-900 ring-1 ring-blue-300 shadow-xs font-bold"
                        : "border-blue-600 bg-blue-50/70 font-bold text-blue-950 shadow-xs"
                      : "border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100/70 font-medium"
                  }`}
                  aria-label={item.label}
                >
                  <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3"}`}>
                    <Icon
                      className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors duration-200 ${
                        isActive ? "text-blue-600" : "text-slate-400 group-hover:text-slate-700"
                      }`}
                    />
                    {!isCollapsed && <span>{item.label}</span>}
                  </div>

                  {!isCollapsed && item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isActive
                          ? "bg-blue-600 text-white"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}

                  {isCollapsed && item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-600 ring-2 ring-white" />
                  )}

                  {/* Floating Tooltip when collapsed on desktop */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap hidden md:flex items-center gap-2">
                      <span>{item.label}</span>
                      {item.badge !== undefined && item.badge > 0 && (
                        <span className="bg-blue-600 text-white px-1.5 py-0.2 rounded text-[10px]">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick Storefront Link */}
          <div className="pt-2">
            {!isCollapsed ? (
              <Link
                href="/products"
                prefetch={false}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:text-blue-600 hover:border-blue-300 text-xs font-semibold bg-slate-50/60 hover:bg-slate-100 transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
                <span>{t("dashboard.storefrontCatalog")}</span>
              </Link>
            ) : (
              <Link
                href="/products"
                prefetch={false}
                className="w-full flex items-center justify-center p-3 rounded-xl border border-slate-200 text-slate-600 hover:text-blue-600 hover:border-blue-300 bg-slate-50/60 hover:bg-slate-100 transition-colors relative group"
                title={t("dashboard.storefrontCatalog")}
              >
                <ArrowLeft className="w-4 h-4" />
                <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap hidden md:block">
                  {t("dashboard.storefrontCatalog")}
                </div>
              </Link>
            )}
          </div>
        </div>

        {/* Bottom Section: Admin User Capsule & Sign Out */}
        <div className="pt-6 border-t border-slate-100 space-y-3">
          {!isCollapsed ? (
            <>
              {/* User Profile Capsule */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs uppercase flex-shrink-0 shadow-xs">
                    {profile.fullName?.charAt(0) || profile.email?.charAt(0) || "A"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {profile.fullName || "Admin Officer"}
                    </p>
                    <p
                      className="text-[11px] text-slate-500 truncate"
                      title={profile.email || "vzarat96@gmail.com"}
                    >
                      {profile.email || "vzarat96@gmail.com"}
                    </p>
                  </div>
                </div>

                {/* Role Badge & Status */}
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-800 border border-blue-200 text-xs font-semibold px-2 py-0.5 rounded-full">
                    <ShieldCheck className="w-3 h-3 text-blue-600" />
                    <span>{t("role.admin")}</span>
                  </span>
                  <span className="uppercase text-[9px] font-bold text-slate-400">
                    {t("common.active")}
                  </span>
                </div>
              </div>

              {/* Sign Out Button */}
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                }}
                className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 text-xs font-bold transition-all cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>{t("nav.signOut")}</span>
              </button>
            </>
          ) : (
            <div className="flex flex-col items-center gap-2.5">
              {/* Collapsed User Avatar Initial */}
              <div
                className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs uppercase flex-shrink-0 shadow-xs relative group cursor-pointer"
                title={`${profile.fullName || "Admin"} (${profile.email || "vzarat96@gmail.com"})`}
              >
                {profile.fullName?.charAt(0) || profile.email?.charAt(0) || "A"}
                <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-lg shadow-xl opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap hidden md:block">
                  <p>{profile.fullName || "Admin Officer"}</p>
                  <p className="text-[10px] text-blue-300 font-normal">
                    {profile.email || "vzarat96@gmail.com"}
                  </p>
                </div>
              </div>

              {/* Collapsed Sign Out Button */}
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                }}
                className="w-10 h-10 flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-all cursor-pointer relative group"
                aria-label={t("nav.signOut")}
              >
                <LogOut className="w-4 h-4" />
                <div className="absolute left-full ml-3 px-2.5 py-1 bg-slate-900 text-white text-xs font-semibold rounded-lg shadow-lg opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50 whitespace-nowrap hidden md:block">
                  {t("nav.signOut")}
                </div>
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
