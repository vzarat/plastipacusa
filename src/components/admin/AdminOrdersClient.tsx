"use client";

import React, { useEffect, useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  getAdminCustomers,
  AdminOrder,
  updateOrderStatus,
  type PaymentReviewItem,
} from "@/actions/admin";
import { getAdminProducts } from "@/actions/products";
import { AdminProduct } from "@/types/product";
import { UserProfile } from "@/actions/auth";
import { useLanguage } from "@/context/LanguageContext";
import { useAdminNav } from "@/components/admin/AdminNavContext";
import type { AdminTabKey } from "@/components/admin/AdminSidebar";
import type { CustomerRecord } from "./AdminCustomersView";
import { AdminDashboardOverview } from "./AdminDashboardOverview";
import { AdminOrdersTable } from "./AdminOrdersTable";
import { AdminCatalogView } from "./AdminCatalogView";
import { AdminCustomersView } from "./AdminCustomersView";
import { AdminSettingsView } from "./AdminSettingsView";
import { Menu, CheckCircle2, ExternalLink } from "lucide-react";

interface AdminOrdersClientProps {
  initialOrders: AdminOrder[];
  profile: UserProfile;
  customers?: CustomerRecord[];
  initialProducts?: AdminProduct[];
  initialTab?: AdminTabKey;
  paymentsToReview?: PaymentReviewItem[];
  settingsSection?: "email-templates" | "users";
  deferCustomers?: boolean;
  deferProducts?: boolean;
}

export function AdminOrdersClient({
  initialOrders,
  profile,
  customers: initialCustomers = [],
  initialProducts = [],
  initialTab = "overview",
  paymentsToReview = [],
  settingsSection,
  deferCustomers = false,
  deferProducts = false,
}: AdminOrdersClientProps) {
  const { t } = useLanguage();
  const { dashboardTab, setDashboardTab, isDashboardHome, setMobileSidebarOpen } =
    useAdminNav();
  const [orders, setOrders] = useState<AdminOrder[]>(initialOrders);
  const [customers, setCustomers] = useState<CustomerRecord[]>(initialCustomers);
  const [products, setProducts] = useState<AdminProduct[]>(initialProducts);
  const [customersReady, setCustomersReady] = useState(!deferCustomers);
  const [productsReady, setProductsReady] = useState(!deferProducts);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Prefer shared nav tab on /admin; fall back to prop for /admin/orders page.
  const activeTab: AdminTabKey = isDashboardHome ? dashboardTab : initialTab;

  useEffect(() => {
    if (isDashboardHome && initialTab && initialTab !== dashboardTab) {
      // Landing with ?tab= from server — sync once if context still on overview.
      if (initialTab !== "overview") {
        setDashboardTab(initialTab);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on mount / initialTab from server
  }, []);

  useEffect(() => {
    const needCustomers =
      !customersReady && (activeTab === "customers" || activeTab === "overview");
    const needProducts = !productsReady && activeTab === "products";
    if (!needCustomers && !needProducts) return;

    startTransition(async () => {
      if (needCustomers) {
        const rows = await getAdminCustomers();
        setCustomers(rows as CustomerRecord[]);
        setCustomersReady(true);
      }
      if (needProducts) {
        const rows = await getAdminProducts();
        setProducts(rows);
        setProductsReady(true);
      }
    });
  }, [activeTab, customersReady, productsReady]);

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

  const goTab = (tab: AdminTabKey) => {
    if (isDashboardHome) setDashboardTab(tab);
  };

  return (
    <div className="flex flex-col flex-1 min-w-0 min-h-screen text-slate-900 font-sans antialiased">
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-950 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold border border-slate-800 animate-fade-in-up">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(true)}
            className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 cursor-pointer"
            aria-label="Toggle Admin Sidebar Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <Link
            href="/admin"
            onClick={(e) => {
              e.preventDefault();
              goTab("overview");
            }}
          >
            <Image
              src="https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PLASTIPAC_USA_LOGO%202.svg"
              alt="Plastipac USA Admin"
              width={140}
              height={38}
              className="h-7 w-auto object-contain"
            />
          </Link>
        </div>
        <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs uppercase shadow-xs">
          {profile.fullName?.charAt(0) || profile.email?.charAt(0) || "A"}
        </div>
      </div>

      <header className="hidden md:flex items-center justify-between px-8 py-4 bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-xs">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Plastipac Enterprise Portal
          </span>
          <span className="text-slate-300">/</span>
          <span className="text-xs font-black text-blue-950">
            {activeTab === "overview"
              ? t("admin.overview")
              : activeTab === "orders"
                ? t("admin.ordersQuotes")
                : activeTab === "products"
                  ? t("admin.catalog")
                  : activeTab === "customers"
                    ? t("admin.customers")
                    : t("admin.settings")}
          </span>
        </div>
        <Link
          href="/products"
          prefetch={false}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
          <span>{t("nav.products")}</span>
        </Link>
      </header>

      <main className="flex-1 min-w-0 w-full max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 space-y-6">
        {activeTab === "overview" && (
          <AdminDashboardOverview
            orders={orders}
            customers={customers}
            onNavigateToOrders={() => goTab("orders")}
            onCreateOrder={() => {
              goTab("orders");
              setIsCreateModalOpen(true);
            }}
          />
        )}

        {activeTab === "orders" && paymentsToReview.length > 0 && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <h2 className="text-sm font-black text-amber-950">Payments to review</h2>
            <ul className="mt-3 space-y-3">
              {paymentsToReview.map((item) => (
                <li key={item.orderId} className="text-sm text-amber-950">
                  <p className="font-semibold">Order {item.orderId}</p>
                  <p>PaymentIntent {item.paymentIntentId || "—"}</p>
                  <p>
                    Expected{" "}
                    {item.amountExpectedCents == null
                      ? "—"
                      : `$${(item.amountExpectedCents / 100).toFixed(2)}`}
                    {" · "}
                    Received{" "}
                    {item.amountReceivedCents == null
                      ? "—"
                      : `$${(item.amountReceivedCents / 100).toFixed(2)}`}
                  </p>
                  <p>{item.reason}</p>
                </li>
              ))}
            </ul>
          </section>
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

        {activeTab === "products" &&
          (productsReady ? (
            <AdminCatalogView initialProducts={products} showToast={showToast} />
          ) : (
            <div className="min-h-[320px] rounded-2xl border border-slate-200 bg-white animate-pulse" />
          ))}

        {activeTab === "customers" &&
          (customersReady ? (
            <AdminCustomersView customers={customers} currentAdminId={profile.id} />
          ) : (
            <div className="min-h-[320px] rounded-2xl border border-slate-200 bg-white animate-pulse" />
          ))}

        {activeTab === "settings" && (
          <AdminSettingsView
            currentAdminId={profile.id}
            initialTab={
              settingsSection === "email-templates"
                ? "email-templates"
                : settingsSection === "users"
                  ? "users"
                  : "general"
            }
          />
        )}
      </main>
    </div>
  );
}
