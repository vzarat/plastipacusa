"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useCartStore } from "@/lib/store/useCartStore";
import { formatCurrency } from "@/lib/utils";
import { UserProfile, signOut } from "@/actions/auth";
import {
  Building2,
  Package,
  RotateCw,
  Truck,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShoppingCart,
  Layers,
  ShieldCheck,
  TrendingUp,
  FileSpreadsheet,
  Zap,
  LayoutDashboard,
  Receipt,
  Settings,
  HelpCircle,
  Phone,
  ArrowLeft,
  LogOut,
  Menu,
  X,
  FileText,
  Download,
  MapPin,
  Mail,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";
import { LanguageToggle } from "@/components/common/LanguageToggle";

export interface DashboardOrderItem {
  productId: number;
  productSlug: string;
  productName: string;
  productImage: string;
  packageSize: string;
  totalRolls: number;
  totalBoxes: number;
  application: "hand" | "machine";
  variantId: any;
  sku: string;
  widthInches: string;
  gauge: number;
  lengthFeet: number;
  rollsPerBox: number;
  rollsPerPallet: number;
  weightLbs: string;
  pricingTier: string;
  unitPrice: number;
  quantity: number;
}

export interface DashboardOrder {
  id: string; // e.g. "PO-USA-90412"
  date: string;
  status: "delivered" | "shipped" | "pending";
  totalUsd: number;
  itemsSummary: string;
  trackingNumber?: string;
  items: DashboardOrderItem[];
}

interface DashboardClientProps {
  profile: UserProfile;
  orders: DashboardOrder[];
}

type TabKey = "overview" | "reorders" | "invoices" | "settings" | "help";

const NAV_ITEMS: {
  key: TabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { key: "overview", label: "Overview & Orders", icon: LayoutDashboard },
  { key: "reorders", label: "Quick Reorders", icon: RotateCw },
  { key: "invoices", label: "Invoices & Statements", icon: Receipt },
  { key: "settings", label: "Account & Company", icon: Settings },
  { key: "help", label: "Support Hotline", icon: HelpCircle },
];

export function DashboardClient({ profile, orders }: DashboardClientProps) {
  const { t } = useLanguage();
  const addItem = useCartStore((state) => state.addItem);
  const openDrawer = useCartStore((state) => state.openDrawer);
  const items = useCartStore((state) => state.items);
  const totalCartCount = items.reduce((acc, item) => acc + item.quantity, 0);

  const getTabLabel = (key: TabKey) => {
    switch (key) {
      case "overview":
        return t("dashboard.overviewOrders");
      case "reorders":
        return t("dashboard.quickReorders");
      case "invoices":
        return t("dashboard.invoices");
      case "settings":
        return t("dashboard.account");
      case "help":
        return t("dashboard.support");
      default:
        return key;
    }
  };

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [reorderNotice, setReorderNotice] = useState<string | null>(null);

  // Trigger quick reorder of an entire past purchase order
  const handleQuickReorder = (order: DashboardOrder) => {
    order.items.forEach((item) => {
      addItem({
        productId: item.productId,
        productSlug: item.productSlug,
        productName: item.productName,
        productImage: item.productImage,
        packageSize: item.packageSize,
        totalRolls: item.totalRolls,
        totalBoxes: item.totalBoxes,
        application: item.application,
        variantId: item.variantId,
        sku: item.sku,
        widthInches: item.widthInches,
        gauge: item.gauge,
        lengthFeet: item.lengthFeet,
        rollsPerBox: item.rollsPerBox,
        rollsPerPallet: item.rollsPerPallet,
        weightLbs: item.weightLbs,
        pricingTier: item.pricingTier,
        unitPrice: item.unitPrice,
        quantity: item.quantity,
      });
    });

    openDrawer();
    setReorderNotice(`All items from ${order.id} were added to your cart for instant reorder.`);
    setTimeout(() => setReorderNotice(null), 4000);
  };

  // Direct 1-Click Fast Order for standard pallets
  const handleFastOrder = (
    name: string,
    slug: string,
    sku: string,
    width: string,
    gauge: number,
    length: number,
    rolls: number,
    boxes: number,
    weight: string,
    unitPrice: number,
    image: string,
    application: "hand" | "machine"
  ) => {
    addItem({
      productId: 1,
      productSlug: slug,
      productName: name,
      productImage: image,
      packageSize: `${boxes} Boxes (${rolls} Rolls)`,
      totalRolls: rolls,
      totalBoxes: boxes,
      application,
      variantId: sku,
      sku,
      widthInches: width,
      gauge,
      lengthFeet: length,
      rollsPerBox: Math.round(rolls / boxes),
      rollsPerPallet: rolls,
      weightLbs: weight,
      pricingTier: "Full Pallet Batch",
      unitPrice,
      quantity: 1,
    });

    openDrawer();
    setReorderNotice(`1 Full Pallet batch of ${name} was added to your cart.`);
    setTimeout(() => setReorderNotice(null), 4000);
  };

  const totalSpend = orders.reduce((sum, o) => sum + o.totalUsd, 0);
  const lastOrder = orders[0];

  const handleTabClick = (tab: TabKey) => {
    setActiveTab(tab);
    setIsMobileSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            aria-label="Toggle Portal Menu"
          >
            {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <Link href="/">
            <Image
              src="https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PLASTIPAC_USA_LOGO%202.svg"
              alt="Plastipac USA"
              width={140}
              height={38}
              className="h-7 w-auto object-contain"
            />
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <LanguageToggle showIcon={false} />

          <button
            type="button"
            onClick={openDrawer}
            className="relative p-2 text-slate-700 hover:text-blue-600 rounded-full border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
            aria-label="Shopping Cart"
          >
            <ShoppingCart className="w-4 h-4 text-sky-600" />
            {totalCartCount > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white shadow-sm">
                {totalCartCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Left Sidebar Navigation Column */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200/90 flex flex-col justify-between p-6 transition-transform duration-200 md:static md:translate-x-0 md:h-screen md:sticky md:top-0 ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Top: Logo & Portal Badge */}
        <div className="space-y-6">
          <div className="space-y-2">
            <Link href="/" className="inline-block">
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
              <span>B2B Commercial Portal</span>
            </div>
          </div>

          {/* Navigation Menu Links */}
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => handleTabClick(item.key)}
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
                  <span>{getTabLabel(item.key)}</span>
                </button>
              );
            })}
          </nav>

          {/* Quick Shop Link */}
          <div className="pt-2">
            <Link
              href="/products"
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 text-slate-700 hover:text-sky-700 hover:border-sky-300 text-xs font-semibold bg-slate-50/50 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-400" />
              <span>{t("dashboard.storefrontCatalog")}</span>
            </Link>
          </div>
        </div>

        {/* Bottom Sidebar: User Capsule & Sign Out */}
        <div className="pt-6 border-t border-slate-100 space-y-3">
          {/* User Profile Capsule */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2.5">
            <div className="flex items-center gap-2.5">
              <div className={`w-8 h-8 rounded-xl text-white flex items-center justify-center font-bold text-xs uppercase flex-shrink-0 ${
                profile.role === "admin" ? "bg-purple-700" : "bg-slate-900"
              }`}>
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

            {/* Role Badge */}
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

            {/* If admin, quick link to Admin Operations */}
            {profile.role === "admin" && (
              <Link
                href="/admin"
                prefetch={false}
                className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs shadow-xs transition-colors"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-purple-300" />
                <span>{t("nav.adminPortal")}</span>
              </Link>
            )}
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
        </div>
      </aside>

      {/* Backdrop for Mobile Sidebar */}
      {isMobileSidebarOpen && (
        <div
          onClick={() => setIsMobileSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 md:hidden"
        />
      )}

      {/* Right Main Content Area */}
      <main className="flex-1 p-5 sm:p-8 lg:p-10 overflow-y-auto space-y-8 max-w-7xl">
        {/* Top Minimal Action Bar */}
        <div className="flex items-center justify-between border-b border-slate-200/80 pb-4">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>{t("dashboard.title")}</span>
            <span>/</span>
            <span className="text-slate-900 font-bold capitalize">
              {getTabLabel(activeTab)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Sales Hotline */}
            <div className="hidden lg:flex items-center gap-1.5 text-xs text-slate-500">
              <Phone className="w-3.5 h-3.5 text-sky-600" />
              <span>{t("dashboard.directDesk")}</span>
              <a href="tel:+19564003683" className="font-bold text-slate-900 hover:text-sky-600">
                (956) 400 36 83
              </a>
            </div>

            {/* Language Switcher */}
            <LanguageToggle />

            {/* Cart Trigger */}
            <button
              type="button"
              onClick={openDrawer}
              className="relative p-2 text-slate-700 hover:text-blue-600 rounded-full border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer"
              aria-label="Shopping Cart"
            >
              <ShoppingCart className="w-5 h-5 text-sky-600" />
              {totalCartCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[11px] font-bold text-white shadow-sm">
                  {totalCartCount}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Toast Notification */}
        {reorderNotice && (
          <div className="p-4 rounded-2xl bg-emerald-600 text-white shadow-xl flex items-center justify-between gap-3 animate-fade-in-up">
            <div className="flex items-center gap-2.5 text-sm font-semibold">
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
              <span>{reorderNotice}</span>
            </div>
            <button
              onClick={() => openDrawer()}
              className="px-3 py-1.5 bg-white text-emerald-950 font-bold text-xs rounded-xl hover:bg-emerald-50 transition-colors shadow-xs cursor-pointer"
            >
              {t("dashboard.reviewCart")}
            </button>
          </div>
        )}

        {/* Main Tab View Container with Smooth Transition */}
        <div
          key={activeTab}
          className="animate-in fade-in-50 slide-in-from-bottom-2 duration-300 ease-out space-y-8"
        >
          {/* TAB 1: OVERVIEW & ORDERS (or REORDERS) */}
          {(activeTab === "overview" || activeTab === "reorders") && (
            <>
              {activeTab === "overview" ? (
                <>
                  {/* Welcome Banner */}
                  <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm relative overflow-hidden">
                    <div className="absolute right-0 top-0 w-80 h-full bg-gradient-to-l from-sky-50/70 to-transparent pointer-events-none hidden md:block" />

                    <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-[11px] font-bold text-blue-800 uppercase tracking-wider">
                            {t("dashboard.commercialAccount")}
                          </span>
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            {t("dashboard.factoryDirectPricing")}
                          </span>
                        </div>

                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                          {t("dashboard.welcome")}, {profile.fullName}
                        </h1>

                        <p className="text-xs sm:text-sm text-slate-600 flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-slate-800 flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5 text-slate-500" />
                            {profile.companyName}
                          </span>
                          <span className="text-slate-300">•</span>
                          <span>{profile.email}</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <Link
                          href="/products"
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-bold transition-all"
                        >
                          <Package className="w-3.5 h-3.5 text-slate-500" />
                          <span>{t("dashboard.browseCatalog")}</span>
                        </Link>

                        <Link
                          href="/#inquiry-form"
                          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-blue-950 text-white text-xs font-bold transition-all shadow-xs"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-sky-400" />
                          <span>{t("dashboard.customTruckload")}</span>
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* KPI Stats Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
                    {/* Total Orders */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-2">
                      <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                        <span>{t("dashboard.totalOrders")}</span>
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                          <Package className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-slate-900">
                        {orders.length} <span className="text-sm font-semibold text-slate-400">{t("dashboard.poOrders")}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {t("dashboard.totalProcurement")} <strong className="text-slate-800">{formatCurrency(totalSpend)} USD</strong>
                      </p>
                    </div>

                    {/* Last Order Date */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-2">
                      <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                        <span>{t("dashboard.lastOrder")}</span>
                        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                          <Truck className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-slate-900">
                        {lastOrder ? lastOrder.date : t("dashboard.noRecentPo")}
                      </div>
                      <p className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{t("dashboard.dispatchTime")}</span>
                      </p>
                    </div>

                    {/* Quick Reorder Status */}
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-2">
                      <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-wider">
                        <span>{t("dashboard.reorderStatus")}</span>
                        <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                          <Zap className="w-4 h-4" />
                        </div>
                      </div>
                      <div className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2">
                        <span>{t("dashboard.oneClickActive")}</span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        {t("dashboard.pricingLocked")}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                /* Reorders Header Banner */
                <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm relative overflow-hidden">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-[11px] font-bold text-blue-800 uppercase tracking-wider flex items-center gap-1.5">
                        <RotateCw className="w-3.5 h-3.5 text-blue-600" />
                        {t("dashboard.reorderHub")}
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-100 text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        {t("dashboard.directSchedule")}
                      </span>
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                      {t("dashboard.instantReorders")}
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-600 max-w-2xl">
                      {t("dashboard.reorderDesc")}
                    </p>
                  </div>
                </div>
              )}

            {/* Fast-Order Standard Batches Shortcut Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-500" />
                    {t("dashboard.fastOrderPallet")}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {t("dashboard.fastOrderDesc")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {/* Card 1: FORCE Standard 18" */}
                <div className="rounded-3xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm hover:border-sky-300 transition-all flex flex-col justify-between group">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-mono text-[10px] font-bold uppercase tracking-wider">
                        FORCE STANDARD • 18"
                      </span>
                      <span className="text-xs font-black text-slate-900">
                        {formatCurrency(1325.44)} USD
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 group-hover:text-sky-700 transition-colors">
                        FORCE Standard 18" x 80 Ga x 1,500 ft
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Full Pallet Batch: 64 Boxes (256 Rolls) • High puncture resistance
                      </p>
                    </div>
                  </div>

                    <Button
                    type="button"
                    onClick={() =>
                      handleFastOrder(
                        'FORCE Standard 18" Hand Stretch Film',
                        "stretch-film-18-x-80-ga-x-1500ft",
                        "PL-ST-18-80-1500-PAL",
                        "18",
                        80,
                        1500,
                        256,
                        64,
                        "2,240",
                        1325.44,
                        "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/FORCE_STANDARD.png",
                        "hand"
                      )
                    }
                    variant="outline"
                    className="w-full text-xs font-bold py-2.5 rounded-xl border-blue-200 bg-blue-50/50 hover:bg-blue-600 hover:text-white hover:border-blue-600 text-blue-800 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>{t("dashboard.orderPallet64")}</span>
                  </Button>
                </div>

                {/* Card 2: FORCE Elite 15" */}
                <div className="rounded-3xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm hover:border-sky-300 transition-all flex flex-col justify-between group">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-mono text-[10px] font-bold uppercase tracking-wider">
                        FORCE ELITE • 15"
                      </span>
                      <span className="text-xs font-black text-slate-900">
                        {formatCurrency(1180.0)} USD
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 group-hover:text-sky-700 transition-colors">
                        FORCE Elite 15" Ultra-Yield Hand Film
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Full Pallet Batch: 64 Boxes (256 Rolls) • Maximum stretch & low worker fatigue
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={() =>
                      handleFastOrder(
                        'FORCE Elite 15" Hand Stretch Film',
                        "stretch-film-15-x-ultra-yield-1500ft",
                        "PL-EL-15-UY-1500-PAL",
                        "15",
                        45,
                        1500,
                        256,
                        64,
                        "1,850",
                        1180.0,
                        "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/FORCE_ELITE.png",
                        "hand"
                      )
                    }
                    variant="outline"
                    className="w-full text-xs font-bold py-2.5 rounded-xl border-amber-200 bg-amber-50/50 hover:bg-amber-600 hover:text-white hover:border-amber-600 text-amber-900 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>{t("dashboard.orderPallet64")}</span>
                  </Button>
                </div>

                {/* Card 3: GENESIS Standard 20" */}
                <div className="rounded-3xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm hover:border-sky-300 transition-all flex flex-col justify-between group">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 font-mono text-[10px] font-bold uppercase tracking-wider">
                        GENESIS MACHINE • 20"
                      </span>
                      <span className="text-xs font-black text-slate-900">
                        {formatCurrency(1924.4)} USD
                      </span>
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 group-hover:text-sky-700 transition-colors">
                        GENESIS Standard 20" x 80 Ga x 5,000 ft
                      </h3>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Full Pallet Batch: 50 Rolls Machine Film • High-speed automated turntables
                      </p>
                    </div>
                  </div>

                  <Button
                    type="button"
                    onClick={() =>
                      handleFastOrder(
                        'GENESIS Standard 20" Machine Film',
                        "stretch-film-20-x-80-ga-x-5000ft-1",
                        "PL-GN-20-80-5000-PAL",
                        "20",
                        80,
                        5000,
                        50,
                        50,
                        "1,720",
                        1924.4,
                        "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/AUTOMATIC_STRETCH_FILM.png",
                        "machine"
                      )
                    }
                    variant="outline"
                    className="w-full text-xs font-bold py-2.5 rounded-xl border-rose-200 bg-rose-50/50 hover:bg-rose-600 hover:text-white hover:border-rose-600 text-rose-900 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>{t("dashboard.orderPallet50")}</span>
                  </Button>
                </div>
              </div>
            </div>

            {/* Order History & Quick Reorder Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                    {t("dashboard.orderHistory")}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {t("dashboard.historyDesc")}
                  </p>
                </div>
              </div>

              {/* Orders Table */}
              <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-3.5 px-4 sm:px-6">{t("dashboard.tablePoId")}</th>
                        <th className="py-3.5 px-4">{t("dashboard.tableDate")}</th>
                        <th className="py-3.5 px-4">{t("dashboard.tableProducts")}</th>
                        <th className="py-3.5 px-4">{t("dashboard.tableTotal")}</th>
                        <th className="py-3.5 px-4">{t("dashboard.tableStatus")}</th>
                        <th className="py-3.5 px-4 sm:px-6 text-right">{t("dashboard.tableAction")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {orders.map((order) => {
                        const isDelivered = order.status === "delivered";
                        const isShipped = order.status === "shipped";

                        return (
                          <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                            {/* Order ID */}
                            <td className="py-4 px-4 sm:px-6 font-mono font-bold text-slate-900">
                              {order.id}
                              {order.trackingNumber && (
                                <span className="block text-[10px] font-mono text-slate-400 font-normal">
                                  Track: {order.trackingNumber}
                                </span>
                              )}
                            </td>

                            {/* Date */}
                            <td className="py-4 px-4 text-slate-600 font-medium">
                              {order.date}
                            </td>

                            {/* Products Summary */}
                            <td className="py-4 px-4 font-semibold text-slate-800">
                              {order.itemsSummary}
                            </td>

                            {/* Total */}
                            <td className="py-4 px-4 font-black text-slate-900 text-sm">
                              {formatCurrency(order.totalUsd)}
                            </td>

                            {/* Status Badge */}
                            <td className="py-4 px-4">
                              {isDelivered ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-[11px]">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  {t("dashboard.statusDelivered")}
                                </span>
                              ) : isShipped ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-800 font-semibold text-[11px]">
                                  <Truck className="w-3 h-3 text-blue-600" />
                                  {t("dashboard.statusInTransit")}
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-800 font-semibold text-[11px]">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  {t("dashboard.statusQueue")}
                                </span>
                              )}
                            </td>

                            {/* Action: Quick Reorder */}
                            <td className="py-4 px-4 sm:px-6 text-right">
                              <button
                                type="button"
                                onClick={() => handleQuickReorder(order)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-blue-950 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                              >
                                <RotateCw className="w-3.5 h-3.5 text-sky-400" />
                                <span>{t("dashboard.btnQuickReorder")}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}

        {/* TAB 2: INVOICES & STATEMENTS */}
        {activeTab === "invoices" && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {t("dashboard.invoicesTitle")}
              </h2>
              <p className="text-xs text-slate-500">
                {t("dashboard.invoicesDesc")}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="py-3.5 px-4 sm:px-6">{t("dashboard.invNumber")}</th>
                      <th className="py-3.5 px-4">{t("dashboard.invPoRef")}</th>
                      <th className="py-3.5 px-4">{t("dashboard.invDate")}</th>
                      <th className="py-3.5 px-4">{t("dashboard.invTerms")}</th>
                      <th className="py-3.5 px-4">{t("dashboard.invAmount")}</th>
                      <th className="py-3.5 px-4">{t("dashboard.invStatus")}</th>
                      <th className="py-3.5 px-4 sm:px-6 text-right">{t("dashboard.invDocument")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {orders.map((order, idx) => (
                      <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-4 px-4 sm:px-6 font-mono font-bold text-slate-900">
                          INV-2026-00{idx + 142}
                        </td>
                        <td className="py-4 px-4 font-mono text-slate-600 font-semibold">
                          {order.id}
                        </td>
                        <td className="py-4 px-4 text-slate-600 font-medium">
                          {order.date}
                        </td>
                        <td className="py-4 px-4 text-slate-700 font-semibold">
                          {t("dashboard.net30")}
                        </td>
                        <td className="py-4 px-4 font-black text-slate-900 text-sm">
                          {formatCurrency(order.totalUsd)}
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            {t("dashboard.paidCleared")}
                          </span>
                        </td>
                        <td className="py-4 px-4 sm:px-6 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              alert(`Downloading verified PDF statement for ${order.id}...`)
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5 text-slate-500" />
                            <span>{t("dashboard.pdfInvoice")}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: ACCOUNT & COMPANY PROFILE */}
        {activeTab === "settings" && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {t("dashboard.settingsTitle")}
              </h2>
              <p className="text-xs text-slate-500">
                {t("dashboard.settingsDesc")}
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Entity Data */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 space-y-4 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-blue-600" />
                  {t("dashboard.entityReg")}
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">{t("dashboard.regEntity")}</span>
                    <span className="font-bold text-slate-900">{profile.companyName}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">{t("dashboard.primaryContact")}</span>
                    <span className="font-bold text-slate-900">{profile.fullName}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">{t("dashboard.corpEmail")}</span>
                    <span className="font-mono text-slate-900">{profile.email}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">{t("dashboard.priceSchedule")}</span>
                    <span className="font-bold text-emerald-700">{t("dashboard.wholesaleSchedule")}</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-500 font-medium">{t("dashboard.taxCert")}</span>
                    <span className="inline-flex items-center gap-1 font-bold text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      {t("dashboard.activeVerified")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dedicated Commercial Specialist */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 space-y-4 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  {t("dashboard.assignedRep")}
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">{t("dashboard.accountSpecialist")}</span>
                    <span className="font-bold text-slate-900">{t("dashboard.opsDesk")}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">{t("dashboard.hotlineDesk")}</span>
                    <a href="tel:+19564003683" className="font-bold text-blue-700 hover:underline">
                      (956) 400 36 83
                    </a>
                  </div>
                  <div className="flex justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500 font-medium">{t("dashboard.dispatchAssist")}</span>
                    <a href="tel:+19564006563" className="font-bold text-blue-700 hover:underline">
                      (956) 400 65 63
                    </a>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-slate-500 font-medium">{t("dashboard.directEmail")}</span>
                    <span className="font-mono text-slate-900">sales@plastipacusa.com</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: SUPPORT HOTLINE */}
        {activeTab === "help" && (
          <div className="space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                {t("dashboard.helpTitle")}
              </h2>
              <p className="text-xs text-slate-500">
                {t("dashboard.helpDesc")}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Phone Desk */}
              <div className="rounded-3xl border border-blue-200 bg-blue-50/50 p-6 sm:p-7 space-y-4">
                <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center">
                  <Phone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{t("dashboard.hotlineTitle")}</h3>
                  <p className="text-xs text-slate-600 mt-1">
                    {t("dashboard.hotlineSubtitle")}
                  </p>
                </div>
                <div className="space-y-1.5 pt-2">
                  <a
                    href="tel:+19564003683"
                    className="block font-black text-lg text-blue-900 hover:underline"
                  >
                    (956) 400 36 83
                  </a>
                  <a
                    href="tel:+19564006563"
                    className="block font-bold text-sm text-blue-700 hover:underline"
                  >
                    (956) 400 65 63 ({t("dashboard.freightDesk")})
                  </a>
                </div>
              </div>

              {/* Email & Location */}
              <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 space-y-4 shadow-sm">
                <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">{t("dashboard.facilityTitle")}</h3>
                  <p className="text-xs text-slate-600 mt-1">
                    {t("dashboard.facilitySubtitle")}
                  </p>
                </div>
                <div className="text-xs text-slate-700 space-y-1 pt-2">
                  <p className="font-semibold">{t("dashboard.plantName")}</p>
                  <p className="text-slate-500">{t("dashboard.plantLocation")}</p>
                  <p className="font-mono text-blue-700 font-semibold pt-1">
                    sales@plastipacusa.com
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </main>
    </div>
  );
}
