"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useCartStore } from "@/lib/store/useCartStore";
import { formatCurrency } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
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
  Eye,
  EyeOff,
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
import { useLanguage } from "@/context/LanguageContext";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { NotificationBell } from "@/components/dashboard/NotificationBell";
import { AvatarUpload } from "@/components/dashboard/AvatarUpload";

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
  initialTab?: TabKey;
}

type TabKey = "overview" | "reorders" | "invoices" | "settings" | "help";

export function DashboardClient({ profile, orders, initialTab }: DashboardClientProps) {
  const { t, locale } = useLanguage();
  const router = useRouter();

  const NAV_ITEMS: {
    key: TabKey;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
  }[] = [
    { key: "overview", label: t("dashboard.overviewOrders"), icon: LayoutDashboard },
    { key: "reorders", label: t("dashboard.quickReorders"), icon: RotateCw },
    { key: "invoices", label: t("dashboard.invoices"), icon: Receipt },
    { key: "settings", label: t("dashboard.account"), icon: Settings },
    { key: "help", label: t("dashboard.support"), icon: HelpCircle },
  ];
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

  const [activeTab, setActiveTab] = useState<TabKey>(initialTab ?? "overview");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [reorderNotice, setReorderNotice] = useState<string | null>(null);
  const [backupPasswordPending, setBackupPasswordPending] = useState(
    Boolean(profile.backupPasswordPending)
  );
  const [backupPassword, setBackupPassword] = useState("");
  const [backupPasswordConfirm, setBackupPasswordConfirm] = useState("");
  const [showBackupPassword, setShowBackupPassword] = useState(false);
  const [showBackupPasswordConfirm, setShowBackupPasswordConfirm] = useState(false);
  const [isBackupPasswordSubmitting, setIsBackupPasswordSubmitting] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: profile.fullName || "",
    email: profile.email || "",
    companyName: profile.companyName || "",
    phone: profile.phone || "",
    avatarUrl: profile.avatarUrl || "",
  });
  const [profileFormError, setProfileFormError] = useState<string | null>(null);
  const [profileFormSuccess, setProfileFormSuccess] = useState<string | null>(null);
  const [isProfileSubmitting, setIsProfileSubmitting] = useState(false);

  React.useEffect(() => {
    setBackupPasswordPending(Boolean(profile.backupPasswordPending));
    setProfileForm({
      fullName: profile.fullName || "",
      email: profile.email || "",
      companyName: profile.companyName || "",
      phone: profile.phone || "",
      avatarUrl: profile.avatarUrl || "",
    });
  }, [profile]);

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
    setReorderNotice(
      t("dashboard.quickReorderAdded").replace("{orderId}", order.id)
    );
    setTimeout(() => setReorderNotice(null), 4000);
  };

  const totalSpend = orders.reduce((sum, o) => sum + o.totalUsd, 0);
  const lastOrder = orders[0];

  const handleProfileSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileFormError(null);
    setProfileFormSuccess(null);

    if (!profileForm.fullName.trim()) {
      setProfileFormError(
        locale === "es"
          ? "El nombre completo es obligatorio."
          : "Full name is required."
      );
      return;
    }

    if (!profileForm.email.trim()) {
      setProfileFormError(
        locale === "es"
          ? "El correo electrónico es obligatorio."
          : "Email is required."
      );
      return;
    }

    setIsProfileSubmitting(true);

    try {
      const supabaseClient = createClient();
      const normalizedEmail = profileForm.email.trim();

      if (normalizedEmail.toLowerCase() !== (profile.email || "").toLowerCase()) {
        const { error: emailError } = await supabaseClient.auth.updateUser({
          email: normalizedEmail,
        });

        if (emailError) {
          throw emailError;
        }
      }

      const {
        data: { user },
        error: userError,
      } = await supabaseClient.auth.getUser();

      if (userError || !user) {
        throw new Error(
          locale === "es"
            ? "No se pudo identificar el usuario actual."
            : "Unable to identify the current user."
        );
      }

      const { error: profileError } = await supabaseClient.from("profiles").upsert(
        {
          id: user.id,
          email: normalizedEmail,
          full_name: profileForm.fullName.trim(),
          company_name: profileForm.companyName.trim(),
          phone: profileForm.phone.trim() || null,
          avatar_url: profileForm.avatarUrl || null,
        },
        { onConflict: "id" }
      );

      if (profileError) {
        throw profileError;
      }

      setProfileFormSuccess(
        locale === "es"
          ? "Perfil actualizado correctamente."
          : "Profile updated successfully."
      );
      router.refresh();
      toast.success(
        locale === "es"
          ? "Perfil actualizado correctamente"
          : "Profile updated successfully"
      );
    } catch (err: any) {
      const message =
        err?.message ||
        (locale === "es"
          ? "No se pudo actualizar el perfil. Inténtalo de nuevo."
          : "Unable to update profile. Please try again.");

      setProfileFormError(message);
      toast.error(message);
    } finally {
      setIsProfileSubmitting(false);
    }
  };

  const handleBackupPasswordSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (backupPassword.length < 6) {
      toast.error(
        locale === "es"
          ? "La contraseña debe tener al menos 6 caracteres."
          : "Password must be at least 6 characters long."
      );
      return;
    }

    if (backupPassword !== backupPasswordConfirm) {
      toast.error(
        locale === "es"
          ? "Las contraseñas no coinciden."
          : "Passwords do not match."
      );
      return;
    }

    setIsBackupPasswordSubmitting(true);

    try {
      const supabaseClient = createClient();

      const { error } = await supabaseClient.auth.updateUser({
        password: backupPassword,
        data: { backup_password_pending: false },
      });

      if (error) {
        throw error;
      }

      try {
        const user = (await supabaseClient.auth.getUser()).data.user;
        if (user) {
          await supabaseClient.from("profiles").upsert(
            {
              id: user.id,
              email: user.email,
              has_password: true,
              password_setup_skipped: false,
            },
            { onConflict: "id" }
          );
        }
      } catch {
        // Ignore profile write errors so the user can still continue within the dashboard.
      }

      setBackupPasswordPending(false);
      setBackupPassword("");
      setBackupPasswordConfirm("");
      router.refresh();
      toast.success(
        locale === "es"
          ? "Contraseña de respaldo configurada correctamente"
          : "Backup password configured successfully"
      );
    } catch (err: any) {
      toast.error(
        err?.message ||
          (locale === "es"
            ? "No se pudo guardar la contraseña de respaldo. Inténtalo de nuevo."
            : "Unable to save the backup password. Please try again.")
      );
    } finally {
      setIsBackupPasswordSubmitting(false);
    }
  };

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
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-200/90 flex flex-col justify-between p-6 transition-transform duration-200 md:sticky md:translate-x-0 md:h-screen md:top-0 ${
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
              <span>{t("dashboard.portalCommercial")}</span>
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
                  <span className="flex-1">{getTabLabel(item.key)}</span>
                  {item.key === "settings" && backupPasswordPending && (
                    <span className="inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
                      1
                    </span>
                  )}
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

            <NotificationBell pending={backupPasswordPending} />

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
              {orders.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 shadow-sm">
                  <div className="max-w-xl mx-auto text-center space-y-5">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
                      <Package className="w-7 h-7" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900">
                        {t("dashboard.emptyStateWelcome")}
                      </h3>
                      <p className="text-sm text-slate-600">
                        {t("dashboard.emptyStateSubtitle")}
                      </p>
                    </div>
                    <Link
                      href="/products"
                      className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-blue-950 text-white font-bold text-sm shadow-xs transition-all"
                    >
                      <Package className="w-4 h-4 text-sky-400" />
                      <span>{t("dashboard.emptyStateCta")}</span>
                    </Link>
                  </div>
                </div>
              ) : (
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
              )}
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

            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                    {locale === "es" ? "Información general" : "General Profile"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {locale === "es"
                      ? "Actualiza tus datos de contacto, empresa y avatar de perfil."
                      : "Update your contact details, company information, and profile avatar."}
                  </p>
                </div>

                <AvatarUpload
                  currentAvatarUrl={profileForm.avatarUrl}
                  fullName={profileForm.fullName}
                  email={profileForm.email}
                  onAvatarChange={(avatarUrl) =>
                    setProfileForm((prev) => ({ ...prev, avatarUrl }))
                  }
                />
              </div>

              {profileFormError && (
                <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  {profileFormError}
                </div>
              )}

              {profileFormSuccess && (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
                  {profileFormSuccess}
                </div>
              )}

              <form onSubmit={handleProfileSubmit} className="mt-6 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      {locale === "es" ? "Nombre completo" : "Full Name"}
                    </label>
                    <input
                      type="text"
                      value={profileForm.fullName}
                      onChange={(e) =>
                        setProfileForm((prev) => ({ ...prev, fullName: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder={locale === "es" ? "Tu nombre completo" : "Your full name"}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      {locale === "es" ? "Correo electrónico" : "Email"}
                    </label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) =>
                        setProfileForm((prev) => ({ ...prev, email: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder={locale === "es" ? "correo@empresa.com" : "name@company.com"}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      {locale === "es" ? "Empresa" : "Company"}
                    </label>
                    <input
                      type="text"
                      value={profileForm.companyName}
                      onChange={(e) =>
                        setProfileForm((prev) => ({ ...prev, companyName: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder={locale === "es" ? "Empresa o cliente" : "Company or organization"}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      {locale === "es" ? "Teléfono" : "Phone"}
                    </label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) =>
                        setProfileForm((prev) => ({ ...prev, phone: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600"
                      placeholder={locale === "es" ? "+1 (956) 000-0000" : "+1 (956) 000-0000"}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isProfileSubmitting}
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isProfileSubmitting
                    ? locale === "es"
                      ? "Guardando..."
                      : "Saving..."
                    : locale === "es"
                      ? "Guardar cambios"
                      : "Save Changes"}
                </button>
              </form>
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

            <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
                    {locale === "es" ? "Contraseña de Respaldo" : "Backup Password"}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {locale === "es"
                      ? "Configura una contraseña para ingresar directamente con tu correo y eliminar este aviso pendiente."
                      : "Set a password for direct email sign-in and clear this pending notice."}
                  </p>
                </div>

                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-bold ${
                    backupPasswordPending
                      ? "border-amber-200 bg-amber-50 text-amber-800"
                      : "border-emerald-200 bg-emerald-50 text-emerald-800"
                  }`}
                >
                  {backupPasswordPending
                    ? locale === "es"
                      ? "Pendiente"
                      : "Pending"
                    : locale === "es"
                      ? "Activa"
                      : "Active"}
                </span>
              </div>

              <form onSubmit={handleBackupPasswordSubmit} className="mt-5 space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      {locale === "es" ? "Nueva Contraseña" : "New Password"}
                    </label>
                    <input
                      type={showBackupPassword ? "text" : "password"}
                      value={backupPassword}
                      onChange={(e) => setBackupPassword(e.target.value)}
                      placeholder={locale === "es" ? "Mínimo 6 caracteres" : "Min. 6 characters"}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowBackupPassword((prev) => !prev)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                      aria-label={showBackupPassword ? "Hide password" : "Show password"}
                    >
                      {showBackupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                      {locale === "es" ? "Confirmar Contraseña" : "Confirm Password"}
                    </label>
                    <input
                      type={showBackupPasswordConfirm ? "text" : "password"}
                      value={backupPasswordConfirm}
                      onChange={(e) => setBackupPasswordConfirm(e.target.value)}
                      placeholder={locale === "es" ? "Repite la contraseña" : "Re-enter password"}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowBackupPasswordConfirm((prev) => !prev)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                      aria-label={showBackupPasswordConfirm ? "Hide password" : "Show password"}
                    >
                      {showBackupPasswordConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isBackupPasswordSubmitting}
                  className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isBackupPasswordSubmitting
                    ? locale === "es"
                      ? "Guardando..."
                      : "Saving..."
                    : locale === "es"
                      ? "Guardar Contraseña"
                      : "Save Password"}
                </button>
              </form>
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
