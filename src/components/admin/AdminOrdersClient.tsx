"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AdminOrder, updateOrderStatus } from "@/actions/admin";
import { UserProfile } from "@/actions/auth";
import { useLanguage } from "@/context/LanguageContext";
import { LanguageToggle } from "@/components/common/LanguageToggle";
import { AdminSidebar, AdminTabKey } from "./AdminSidebar";
import { AdminDashboardOverview } from "./AdminDashboardOverview";
import { AdminOrdersTable } from "./AdminOrdersTable";
import { AdminCatalogView } from "./AdminCatalogView";
import { AdminCustomersView } from "./AdminCustomersView";
import { AdminSettingsView } from "./AdminSettingsView";
import {
  Menu,
  X,
  ShieldCheck,
  CheckCircle2,
  Bell,
  ExternalLink,
} from "lucide-react";

interface AdminOrdersClientProps {
  initialOrders: AdminOrder[];
  profile: UserProfile;
  initialTab?: AdminTabKey;
}

export function AdminOrdersClient({
  initialOrders,
  profile,
  initialTab = "overview",
}: AdminOrdersClientProps) {
  const { t } = useLanguage();
  const [orders, setOrders] = useState<AdminOrder[]>(initialOrders);
  const [activeTab, setActiveTab] = useState<AdminTabKey>(initialTab);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleUpdateStatus = async (
    orderId: string,
    newStatus: "fulfilled" | "unfulfilled" | "in_transit" | "cancelled"
  ) => {
    try {
      const res = await updateOrderStatus(orderId, newStatus);
      if (res.success) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId ? { ...o, fulfillmentStatus: newStatus } : o
          )
        );
        showToast(`Order #${orderId} updated to ${newStatus.replace("_", " ")}.`);
      } else {
        showToast(res.error || "Failed to update order status.");
      }
    } catch {
      showToast("Error updating order status.");
    }
  };

  const handleCreateOrder = (newOrder: AdminOrder) => {
    setOrders((prev) => [newOrder, ...prev]);
  };

  const pendingCount = orders.filter(
    (o) => o.fulfillmentStatus === "unfulfilled"
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900 font-sans antialiased">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-950 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold border border-slate-800 animate-fade-in-up">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Mobile Top Header */}
      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
            aria-label="Toggle Admin Sidebar Menu"
          >
            {isMobileSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <Link href="/admin">
            <Image
              src="https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PLASTIPAC_USA_LOGO%202.svg"
              alt="Plastipac USA Admin"
              width={140}
              height={38}
              className="h-7 w-auto object-contain"
            />
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <LanguageToggle showIcon={false} />
          <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
            {profile.fullName?.charAt(0) || profile.email?.charAt(0) || "A"}
          </div>
        </div>
      </div>

      {/* Unified Left Sidebar */}
      <AdminSidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isMobileOpen={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        profile={profile}
        ordersCount={orders.length}
        pendingCount={pendingCount}
      />

      {/* Main Content Pane */}
      <div className="flex-1 min-w-0 flex flex-col min-h-screen">
        {/* Desktop Top Bar */}
        <header className="hidden md:flex items-center justify-between px-8 py-4 bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Plastipac Enterprise Portal
            </span>
            <span className="text-slate-300">/</span>
            <span className="text-xs font-black text-blue-950 capitalize">
              {activeTab}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/products"
              prefetch={false}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
              <span>{t("nav.products")}</span>
            </Link>

            <LanguageToggle />
          </div>
        </header>

        {/* Dynamic Tab Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
          {activeTab === "overview" && (
            <AdminDashboardOverview
              orders={orders}
              onNavigateToOrders={() => setActiveTab("orders")}
              onCreateOrder={() => {
                setActiveTab("orders");
                setIsCreateModalOpen(true);
              }}
            />
          )}

          {activeTab === "orders" && (
            <AdminOrdersTable
              orders={orders}
              onUpdateStatus={handleUpdateStatus}
              onCreateOrder={handleCreateOrder}
              isCreateModalOpen={isCreateModalOpen}
              setIsCreateModalOpen={setIsCreateModalOpen}
              showToast={showToast}
            />
          )}

          {activeTab === "products" && <AdminCatalogView />}

          {activeTab === "customers" && <AdminCustomersView />}

          {activeTab === "settings" && <AdminSettingsView />}
        </main>
      </div>
    </div>
  );
}
