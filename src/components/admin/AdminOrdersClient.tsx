"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { AdminOrder, updateOrderStatus } from "@/actions/admin";
import { UserProfile, signOut } from "@/actions/auth";
import { formatCurrency } from "@/lib/utils";
import {
  Search,
  Download,
  Plus,
  ChevronDown,
  CheckCircle2,
  Clock,
  Truck,
  AlertCircle,
  Filter,
  X,
  Building2,
  User,
  Mail,
  Phone,
  MapPin,
  Package,
  Layers,
  DollarSign,
  FileText,
  Check,
  RotateCw,
  TrendingUp,
  ArrowLeft,
  ExternalLink,
  ShieldCheck,
  LogOut,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/context/LanguageContext";
import { LanguageToggle } from "@/components/common/LanguageToggle";

interface AdminOrdersClientProps {
  initialOrders: AdminOrder[];
  profile: UserProfile;
}

type FilterTab = "all" | "unfulfilled" | "unpaid" | "open" | "archived";

export function AdminOrdersClient({
  initialOrders,
  profile,
}: AdminOrdersClientProps) {
  const { t } = useLanguage();
  const [orders, setOrders] = useState<AdminOrder[]>(initialOrders);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [fulfillmentFilter, setFulfillmentFilter] = useState<string>("all");
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New Draft Order Form State
  const [draftCustomerName, setDraftCustomerName] = useState("");
  const [draftCompany, setDraftCompany] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [draftProduct, setDraftProduct] = useState("FORCE Standard 18\"");
  const [draftPallets, setDraftPallets] = useState(1);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // KPI Calculations
  const stats = useMemo(() => {
    const totalSales = orders.reduce((sum, o) => sum + o.totalUsd, 0);
    const totalOrdersCount = orders.length;
    const aov = totalOrdersCount > 0 ? totalSales / totalOrdersCount : 0;
    const pendingShipments = orders.filter(
      (o) => o.fulfillmentStatus === "unfulfilled" || o.fulfillmentStatus === "in_transit"
    ).length;

    return {
      totalSales,
      totalOrdersCount,
      aov,
      pendingShipments,
    };
  }, [orders]);

  // Tab counters
  const tabCounts = useMemo(() => {
    return {
      all: orders.length,
      unfulfilled: orders.filter((o) => o.fulfillmentStatus === "unfulfilled").length,
      unpaid: orders.filter((o) => o.paymentStatus === "pending").length,
      open: orders.filter(
        (o) => o.fulfillmentStatus !== "fulfilled" && o.fulfillmentStatus !== "cancelled"
      ).length,
      archived: orders.filter((o) => o.fulfillmentStatus === "fulfilled").length,
    };
  }, [orders]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Tab filter
      if (activeTab === "unfulfilled" && order.fulfillmentStatus !== "unfulfilled") {
        return false;
      }
      if (activeTab === "unpaid" && order.paymentStatus !== "pending") {
        return false;
      }
      if (
        activeTab === "open" &&
        (order.fulfillmentStatus === "fulfilled" || order.fulfillmentStatus === "cancelled")
      ) {
        return false;
      }
      if (activeTab === "archived" && order.fulfillmentStatus !== "fulfilled") {
        return false;
      }

      // Dropdown filters
      if (paymentFilter !== "all" && order.paymentStatus !== paymentFilter) {
        return false;
      }
      if (
        fulfillmentFilter !== "all" &&
        order.fulfillmentStatus !== fulfillmentFilter
      ) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesId = order.id.toLowerCase().includes(query);
        const matchesCustomer = order.customerName.toLowerCase().includes(query);
        const matchesCompany = order.customerCompany.toLowerCase().includes(query);
        const matchesEmail = order.customerEmail.toLowerCase().includes(query);
        const matchesSummary = order.itemsSummary.toLowerCase().includes(query);
        return (
          matchesId ||
          matchesCustomer ||
          matchesCompany ||
          matchesEmail ||
          matchesSummary
        );
      }

      return true;
    });
  }, [orders, activeTab, paymentFilter, fulfillmentFilter, searchQuery]);

  // Select all / Deselect all
  const isAllSelected =
    filteredOrders.length > 0 &&
    selectedOrderIds.length === filteredOrders.length;

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map((o) => o.id));
    }
  };

  const handleToggleSelectOrder = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Export to CSV
  const handleExportCSV = () => {
    const listToExport =
      selectedOrderIds.length > 0
        ? orders.filter((o) => selectedOrderIds.includes(o.id))
        : filteredOrders;

    if (listToExport.length === 0) {
      showToast("No orders available to export.");
      return;
    }

    const headers = [
      "Order ID",
      "Date",
      "Customer",
      "Company",
      "Email",
      "Total USD",
      "Payment Status",
      "Fulfillment Status",
      "Items Summary",
      "Tracking Number",
    ];

    const rows = listToExport.map((o) => [
      `"${o.id}"`,
      `"${new Date(o.createdAt).toLocaleDateString()}"`,
      `"${o.customerName}"`,
      `"${o.customerCompany}"`,
      `"${o.customerEmail}"`,
      `"${o.totalUsd}"`,
      `"${o.paymentStatus}"`,
      `"${o.fulfillmentStatus}"`,
      `"${o.itemsSummary}"`,
      `"${o.trackingNumber || ""}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `plastipac_orders_export_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${listToExport.length} orders to CSV successfully.`);
  };

  // Handle status update
  const handleUpdateStatus = async (
    orderId: string,
    newStatus: "fulfilled" | "unfulfilled" | "in_transit" | "cancelled"
  ) => {
    setIsUpdatingStatus(true);
    try {
      const res = await updateOrderStatus(orderId, newStatus);
      if (res.success) {
        setOrders((prev) =>
          prev.map((o) =>
            o.id === orderId ? { ...o, fulfillmentStatus: newStatus } : o
          )
        );
        if (selectedOrder && selectedOrder.id === orderId) {
          setSelectedOrder((prev) =>
            prev ? { ...prev, fulfillmentStatus: newStatus } : null
          );
        }
        showToast(`Order ${orderId} updated to ${newStatus.replace("_", " ")}.`);
      } else {
        showToast(res.error || "Failed to update status.");
      }
    } catch (err) {
      showToast("Error updating order status.");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Create Draft Order
  const handleCreateDraftOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftCustomerName || !draftCompany) {
      showToast("Please provide Customer Name and Company.");
      return;
    }

    const newId = `PO-USA-${Math.floor(90000 + Math.random() * 9999)}`;
    const pricePerPallet = draftProduct.includes("GENESIS")
      ? 1924.4
      : draftProduct.includes("Elite")
      ? 1180.0
      : 1325.44;
    const totalUsd = pricePerPallet * draftPallets;

    const newOrder: AdminOrder = {
      id: newId,
      createdAt: new Date().toISOString(),
      customerName: draftCustomerName,
      customerEmail: draftEmail || "procurement@client.com",
      customerCompany: draftCompany,
      customerPhone: "(956) 400 36 83",
      shippingAddress: {
        street: "1000 Commercial Distribution Parkway",
        city: "San Antonio",
        state: "TX",
        zip: "78219",
        country: "United States",
      },
      totalUsd,
      paymentStatus: "pending",
      fulfillmentStatus: "unfulfilled",
      itemsSummary: `${draftProduct} (${draftPallets} Pallet${draftPallets > 1 ? "s" : ""})`,
      notes: "Direct manual purchase order drafted via Admin Console.",
      items: [
        {
          productId: draftProduct.includes("GENESIS") ? 3 : 1,
          productSlug: "stretch-film-18-x-80-ga-x-1500ft",
          productName: draftProduct,
          productImage:
            "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/FORCE_STANDARD.png",
          packageSize: `${64 * draftPallets} Boxes (${256 * draftPallets} Rolls)`,
          totalRolls: 256 * draftPallets,
          totalBoxes: 64 * draftPallets,
          application: draftProduct.includes("GENESIS") ? "machine" : "hand",
          sku: "PL-PO-MANUAL-DRAFT",
          widthInches: "18",
          gauge: 80,
          lengthFeet: 1500,
          rollsPerBox: 4,
          rollsPerPallet: 256,
          weightLbs: `${2240 * draftPallets}`,
          pricingTier: "Full Pallet Batch",
          unitPrice: pricePerPallet,
          quantity: draftPallets,
        },
      ],
    };

    setOrders([newOrder, ...orders]);
    setIsCreateModalOpen(false);
    setDraftCustomerName("");
    setDraftCompany("");
    setDraftEmail("");
    showToast(`Order ${newId} created successfully!`);
  };

  return (
    <div className="min-h-screen bg-slate-50/80 text-slate-900 pb-16">
      {/* Admin Top Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/90 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left: Brand + Admin Pill */}
            <div className="flex items-center gap-4">
              <Link href="/admin/orders" className="flex items-center gap-2">
                <Image
                  src="https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PLASTIPAC_USA_LOGO%202.svg"
                  alt="Plastipac USA Admin"
                  width={140}
                  height={38}
                  priority
                  className="h-8 w-auto object-contain"
                />
              </Link>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-mono font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                <span>Shopify Ops Admin</span>
              </div>
            </div>

            {/* Right: Quick Storefront link + Language Toggle + Admin user capsule */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              <Link
                href="/dashboard"
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                <span>{t("admin.clientPortal")}</span>
              </Link>

              <LanguageToggle />

              <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100/80 rounded-xl border border-slate-200 text-xs">
                <div className="w-6 h-6 rounded-lg bg-blue-700 text-white flex items-center justify-center font-bold text-[11px] uppercase">
                  {profile.fullName?.charAt(0) || "A"}
                </div>
                <div className="hidden md:block text-left">
                  <p className="font-bold text-slate-900 leading-tight">
                    {profile.fullName}
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Operations Lead
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={async () => await signOut()}
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-7">
        {/* Toast Alert */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 bg-slate-950 text-white px-4 py-3 rounded-2xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold border border-slate-800 animate-in fade-in-50 slide-in-from-bottom-2 duration-200">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
              <span>Plastipac Admin</span>
              <span>/</span>
              <span className="text-slate-900 font-bold">{t("admin.orders")}</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {t("admin.orders")}
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs">
                {orders.length} {t("admin.totalCount")}
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>{t("admin.exportCsv")}</span>
            </Button>

            <Button
              size="sm"
              onClick={() => setIsCreateModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-black text-white shadow-xs cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{t("admin.createOrder")}</span>
            </Button>
          </div>
        </div>

        {/* KPI Metrics Cards (Shopify Style) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
          {/* Card 1: Total Sales */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-1.5 transition-all hover:border-slate-300">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>{t("admin.totalSales")}</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <DollarSign className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(stats.totalSales)} USD
            </div>
            <p className="text-[11px] text-slate-500 flex items-center gap-1">
              <TrendingUp className="w-3 h-3 text-emerald-600" />
              <span>{t("admin.salesDesc")}</span>
            </p>
          </div>

          {/* Card 2: Total Orders */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-1.5 transition-all hover:border-slate-300">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>{t("admin.totalOrders")}</span>
              <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Package className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {stats.totalOrdersCount}
            </div>
            <p className="text-[11px] text-slate-500">
              {t("admin.ordersDesc")}
            </p>
          </div>

          {/* Card 3: Average Order Value */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-1.5 transition-all hover:border-slate-300">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>{t("admin.aov")}</span>
              <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
                <Layers className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {formatCurrency(stats.aov)} USD
            </div>
            <p className="text-[11px] text-slate-500">
              {t("admin.aovDesc")}
            </p>
          </div>

          {/* Card 4: Pending Shipments */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs space-y-1.5 transition-all hover:border-slate-300">
            <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
              <span>{t("admin.pendingShipments")}</span>
              <div className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                <Truck className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-black text-amber-900 tracking-tight">
              {stats.pendingShipments}
            </div>
            <p className="text-[11px] text-amber-700 font-medium">
              {t("admin.pendingDesc")}
            </p>
          </div>
        </div>

        {/* Table Container Card (Polaris White Container) */}
        <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
          {/* Status Filter Tabs */}
          <div className="border-b border-slate-200 px-4 sm:px-6 pt-3 flex items-center gap-1 sm:gap-2 overflow-x-auto">
            {(
              [
                { key: "all", label: t("admin.all"), count: tabCounts.all },
                {
                  key: "unfulfilled",
                  label: t("admin.unfulfilled"),
                  count: tabCounts.unfulfilled,
                },
                { key: "unpaid", label: t("admin.unpaid"), count: tabCounts.unpaid },
                { key: "open", label: t("admin.open"), count: tabCounts.open },
                {
                  key: "archived",
                  label: t("admin.archived"),
                  count: tabCounts.archived,
                },
              ] as const
            ).map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-3 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "border-slate-900 text-slate-900"
                      : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                  }`}
                >
                  <span>{tab.label}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Secondary Filter Controls */}
          <div className="p-4 sm:px-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t("admin.searchPlaceholder")}
                className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Quick Dropdown Filters */}
            <div className="flex items-center gap-2">
              {/* Payment Filter */}
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="text-xs font-semibold py-2 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-slate-400 cursor-pointer"
              >
                <option value="all">{t("admin.paymentAll")}</option>
                <option value="paid">{t("admin.paymentPaid")}</option>
                <option value="pending">{t("admin.paymentPending")}</option>
                <option value="refunded">{t("admin.paymentRefunded")}</option>
              </select>

              {/* Fulfillment Filter */}
              <select
                value={fulfillmentFilter}
                onChange={(e) => setFulfillmentFilter(e.target.value)}
                className="text-xs font-semibold py-2 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 focus:outline-none focus:border-slate-400 cursor-pointer"
              >
                <option value="all">{t("admin.fulfillmentAll")}</option>
                <option value="fulfilled">{t("admin.statusFulfilled")}</option>
                <option value="in_transit">{t("admin.statusInTransit")}</option>
                <option value="unfulfilled">{t("admin.statusUnfulfilled")}</option>
                <option value="cancelled">{t("admin.statusCancelled")}</option>
              </select>
            </div>
          </div>

          {/* Bulk Selection Action Bar */}
          {selectedOrderIds.length > 0 && (
            <div className="bg-blue-50 border-b border-blue-200/80 px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs text-blue-900 font-semibold animate-in fade-in-50 duration-150">
              <div className="flex items-center gap-2">
                <span>{selectedOrderIds.length} {t("admin.ordersSelected")}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOrders((prev) =>
                      prev.map((o) =>
                        selectedOrderIds.includes(o.id)
                          ? { ...o, fulfillmentStatus: "fulfilled" }
                          : o
                      )
                    );
                    showToast(`Marked ${selectedOrderIds.length} orders as Fulfilled.`);
                    setSelectedOrderIds([]);
                  }}
                  className="px-3 py-1 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors shadow-2xs cursor-pointer"
                >
                  {t("admin.markFulfilled")}
                </button>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="px-3 py-1 rounded-lg border border-blue-300 bg-white text-blue-800 font-bold hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  {t("admin.exportSelected")}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedOrderIds([])}
                  className="p-1 text-blue-600 hover:text-blue-950"
                  title="Clear selection"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* Orders Data Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/70 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4 sm:px-6 w-10">
                    <input
                      type="checkbox"
                      checked={isAllSelected}
                      onChange={handleToggleSelectAll}
                      className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                      aria-label="Select all orders"
                    />
                  </th>
                  <th className="py-3.5 px-3">{t("admin.colOrder")}</th>
                  <th className="py-3.5 px-3">{t("admin.colDate")}</th>
                  <th className="py-3.5 px-4">{t("admin.colCustomer")}</th>
                  <th className="py-3.5 px-3">{t("admin.colTotal")}</th>
                  <th className="py-3.5 px-3">{t("admin.colPayment")}</th>
                  <th className="py-3.5 px-3">{t("admin.colFulfillment")}</th>
                  <th className="py-3.5 px-4">{t("admin.colItems")}</th>
                  <th className="py-3.5 px-4 sm:px-6 text-right">{t("admin.colAction")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-12 text-center text-slate-500 text-xs space-y-2"
                    >
                      <Package className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-semibold text-slate-700">
                        {t("admin.noOrdersFound")}
                      </p>
                      <p className="text-[11px]">
                        {t("admin.noOrdersDesc")}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    const isSelected = selectedOrderIds.includes(order.id);
                    const isPaid = order.paymentStatus === "paid";
                    const isPendingPayment = order.paymentStatus === "pending";

                    const isFulfilled = order.fulfillmentStatus === "fulfilled";
                    const isInTransit = order.fulfillmentStatus === "in_transit";
                    const isUnfulfilled = order.fulfillmentStatus === "unfulfilled";

                    return (
                      <tr
                        key={order.id}
                        className={`hover:bg-slate-50/80 transition-colors cursor-pointer ${
                          isSelected ? "bg-blue-50/40" : ""
                        }`}
                        onClick={(e) => {
                          // Prevent modal click when toggling checkbox
                          const target = e.target as HTMLElement;
                          if (target.tagName.toLowerCase() !== "input" && target.tagName.toLowerCase() !== "select") {
                            setSelectedOrder(order);
                          }
                        }}
                      >
                        {/* Checkbox */}
                        <td className="py-4 px-4 sm:px-6" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectOrder(order.id)}
                            className="rounded border-slate-300 text-slate-900 focus:ring-slate-900 cursor-pointer"
                            aria-label={`Select ${order.id}`}
                          />
                        </td>

                        {/* Order Number */}
                        <td className="py-4 px-3 font-mono font-black text-slate-900">
                          <span className="hover:text-blue-600 transition-colors underline decoration-slate-300 underline-offset-2">
                            #{order.id}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="py-4 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                          {new Date(order.createdAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>

                        {/* Customer & Company */}
                        <td className="py-4 px-4">
                          <div className="space-y-0.5">
                            <p className="font-bold text-slate-900 text-xs truncate max-w-[170px]">
                              {order.customerName}
                            </p>
                            <span className="inline-block text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.2 rounded-md truncate max-w-[180px]">
                              {order.customerCompany}
                            </span>
                          </div>
                        </td>

                        {/* Total Amount */}
                        <td className="py-4 px-3 font-black text-slate-900 text-xs">
                          {formatCurrency(order.totalUsd)}
                        </td>

                        {/* Payment Status Badge */}
                        <td className="py-4 px-3">
                          {isPaid ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                              {t("admin.paid")}
                            </span>
                          ) : isPendingPayment ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                              {t("admin.pending")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold">
                              {t("admin.refunded")}
                            </span>
                          )}
                        </td>

                        {/* Fulfillment Status Badge */}
                        <td className="py-4 px-3">
                          {isFulfilled ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              {t("admin.statusFulfilled")}
                            </span>
                          ) : isInTransit ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[10px] font-bold">
                              <Truck className="w-3 h-3 text-blue-600" />
                              {t("admin.statusInTransit")}
                            </span>
                          ) : isUnfulfilled ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
                              <Clock className="w-3 h-3 text-amber-600" />
                              {t("admin.statusUnfulfilled")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-[10px] font-bold">
                              {t("admin.statusCancelled")}
                            </span>
                          )}
                        </td>

                        {/* Items Summary */}
                        <td className="py-4 px-4 text-slate-700 text-xs truncate max-w-[200px]">
                          {order.itemsSummary}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-4 px-4 sm:px-6 text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedOrder(order)}
                              className="px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 transition-colors shadow-2xs cursor-pointer"
                            >
                              {t("admin.inspect")}
                            </button>

                            {/* Quick status toggle */}
                            <select
                              value={order.fulfillmentStatus}
                              onChange={(e) =>
                                handleUpdateStatus(order.id, e.target.value as any)
                              }
                              className="text-[11px] font-semibold py-1 px-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-slate-300 focus:outline-none cursor-pointer"
                            >
                              <option value="unfulfilled">{t("admin.statusUnfulfilled")}</option>
                              <option value="in_transit">{t("admin.statusInTransit")}</option>
                              <option value="fulfilled">{t("admin.statusFulfilled")}</option>
                              <option value="cancelled">{t("admin.statusCancelled")}</option>
                            </select>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* SLIDE-OVER ORDER DETAIL INSPECTOR DRAWER */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Backdrop */}
          <div
            onClick={() => setSelectedOrder(null)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-xl bg-white shadow-2xl border-l border-slate-200 flex flex-col justify-between animate-in slide-in-from-right duration-300">
              {/* Drawer Top Header */}
              <div className="px-6 py-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/60">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-slate-900">
                      Order #{selectedOrder.id}
                    </h2>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        selectedOrder.fulfillmentStatus === "fulfilled"
                          ? "bg-emerald-100 text-emerald-800"
                          : selectedOrder.fulfillmentStatus === "in_transit"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {selectedOrder.fulfillmentStatus.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">
                    {t("admin.placedOn")}{" "}
                    {new Date(selectedOrder.createdAt).toLocaleDateString("en-US", {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Drawer Scrollable Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Fulfillment Status Management Box */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-blue-600" />
                      {t("admin.updateStatus")}
                    </span>
                    {isUpdatingStatus && (
                      <span className="text-[11px] text-blue-600 font-semibold flex items-center gap-1">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Updating status...
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(
                      [
                        { key: "unfulfilled", label: t("admin.statusUnfulfilled") },
                        { key: "in_transit", label: t("admin.statusInTransit") },
                        { key: "fulfilled", label: t("admin.statusFulfilled") },
                        { key: "cancelled", label: t("admin.statusCancelled") },
                      ] as const
                    ).map((statusOption) => (
                      <button
                        key={statusOption.key}
                        type="button"
                        disabled={isUpdatingStatus}
                        onClick={() =>
                          handleUpdateStatus(selectedOrder.id, statusOption.key)
                        }
                        className={`py-2 px-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                          selectedOrder.fulfillmentStatus === statusOption.key
                            ? "border-slate-900 bg-slate-900 text-white shadow-xs"
                            : "border-slate-200 bg-white hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        {statusOption.label}
                      </button>
                    ))}
                  </div>

                  {selectedOrder.trackingNumber && (
                    <div className="pt-2 text-xs text-slate-600 border-t border-slate-200/60 flex items-center justify-between">
                      <span>Carrier: <strong>{selectedOrder.carrier || "FedEx Freight"}</strong></span>
                      <span className="font-mono text-blue-700 font-bold">
                        {selectedOrder.trackingNumber}
                      </span>
                    </div>
                  )}
                </div>

                {/* Customer Info Card */}
                <div className="rounded-2xl border border-slate-200 p-5 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-700" />
                    {t("admin.customer")}
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Contact</span>
                      <strong className="text-slate-900">{selectedOrder.customerName}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Company</span>
                      <strong className="text-slate-900">{selectedOrder.customerCompany}</strong>
                    </div>
                    <div className="flex justify-between py-1 border-b border-slate-100">
                      <span className="text-slate-500">Email</span>
                      <a
                        href={`mailto:${selectedOrder.customerEmail}`}
                        className="text-blue-600 hover:underline font-mono"
                      >
                        {selectedOrder.customerEmail}
                      </a>
                    </div>
                    {selectedOrder.customerPhone && (
                      <div className="flex justify-between py-1">
                        <span className="text-slate-500">Phone Hotline</span>
                        <a
                          href={`tel:${selectedOrder.customerPhone}`}
                          className="text-slate-800 font-bold hover:underline"
                        >
                          {selectedOrder.customerPhone}
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Shipping & Freight Destination */}
                <div className="rounded-2xl border border-slate-200 p-5 space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-700" />
                    {t("admin.delivery")}
                  </h3>
                  <div className="text-xs text-slate-700 space-y-1">
                    <p className="font-bold text-slate-900">
                      {selectedOrder.customerCompany}
                    </p>
                    <p>{selectedOrder.shippingAddress.street}</p>
                    <p>
                      {selectedOrder.shippingAddress.city},{" "}
                      {selectedOrder.shippingAddress.state}{" "}
                      {selectedOrder.shippingAddress.zip},{" "}
                      {selectedOrder.shippingAddress.country}
                    </p>
                    {selectedOrder.notes && (
                      <div className="mt-2.5 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-[11px]">
                        <strong>Dock Instructions:</strong> {selectedOrder.notes}
                      </div>
                    )}
                  </div>
                </div>

                {/* Itemized Breakdown Table */}
                <div className="rounded-2xl border border-slate-200 overflow-hidden space-y-0">
                  <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                      <Package className="w-3.5 h-3.5" />
                      {t("admin.orderItems")} ({selectedOrder.items.length})
                    </h3>
                    <span className="text-xs font-bold text-slate-900">
                      {selectedOrder.itemsSummary}
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {selectedOrder.items.map((item, idx) => (
                      <div key={idx} className="p-4 flex items-center gap-4">
                        {item.productImage && (
                          <div className="w-14 h-14 rounded-xl border border-slate-200 bg-slate-50 flex-shrink-0 flex items-center justify-center p-1">
                            <Image
                              src={item.productImage}
                              alt={item.productName}
                              width={50}
                              height={50}
                              className="object-contain max-h-12"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {item.productName}
                          </p>
                          <p className="text-[11px] text-slate-500 font-mono">
                            SKU: {item.sku} • {item.packageSize}
                          </p>
                          <p className="text-[11px] text-slate-600">
                            Specs: {item.widthInches}" width • {item.gauge} Ga • {item.lengthFeet} ft
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 text-xs">
                          <p className="font-black text-slate-900">
                            {formatCurrency(item.unitPrice * item.quantity)}
                          </p>
                          <p className="text-[10px] text-slate-400">
                            {item.quantity} x {formatCurrency(item.unitPrice)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Financial Summary */}
                  <div className="p-4 bg-slate-50/50 border-t border-slate-200 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-500">
                      <span>Subtotal</span>
                      <span>{formatCurrency(selectedOrder.totalUsd)}</span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Freight & Handling</span>
                      <span className="text-emerald-700 font-semibold">
                        Free Plant Freight
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500">
                      <span>Payment Method</span>
                      <span className="font-semibold text-slate-800 uppercase">
                        Commercial Net 30
                      </span>
                    </div>
                    <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                      <span>Total Amount</span>
                      <span>{formatCurrency(selectedOrder.totalUsd)} USD</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Drawer Bottom Bar */}
              <div className="px-6 py-4 border-t border-slate-200 bg-white flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-xs font-bold text-slate-700 transition-colors"
                >
                  Close Inspector
                </button>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all shadow-xs"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Statement</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CREATE DRAFT PURCHASE ORDER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setIsCreateModalOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
          />

          <div className="relative bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Create Commercial Draft Order
                </h3>
                <p className="text-xs text-slate-500">
                  Direct entry for phone/email wholesale purchase orders.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDraftOrder} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Customer Contact Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Miller"
                  value={draftCustomerName}
                  onChange={(e) => setDraftCustomerName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Company / Organization</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Lone Star Logistics LLC"
                  value={draftCompany}
                  onChange={(e) => setDraftCompany(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                />
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Work Email</label>
                <input
                  type="email"
                  placeholder="procurement@company.com"
                  value={draftEmail}
                  onChange={(e) => setDraftEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Stretch Film Spec</label>
                  <select
                    value={draftProduct}
                    onChange={(e) => setDraftProduct(e.target.value)}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white font-semibold"
                  >
                    <option value="FORCE Standard 18&quot; Hand Stretch Film">
                      FORCE Standard 18" ($1,325.44 / pallet)
                    </option>
                    <option value="FORCE Elite 15&quot; Ultra-Yield Hand Film">
                      FORCE Elite 15" ($1,180.00 / pallet)
                    </option>
                    <option value="GENESIS Standard 20&quot; Machine Stretch Film">
                      GENESIS Machine 20" ($1,924.40 / pallet)
                    </option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Pallet Batches</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={draftPallets}
                    onChange={(e) => setDraftPallets(parseInt(e.target.value) || 1)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-600">Calculated Batch Total:</span>
                <span className="font-black text-slate-900 text-sm">
                  {formatCurrency(
                    (draftProduct.includes("GENESIS")
                      ? 1924.4
                      : draftProduct.includes("Elite")
                      ? 1180.0
                      : 1325.44) * draftPallets
                  )}{" "}
                  USD
                </span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  {t("common.cancel")}
                </button>
                <Button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold cursor-pointer"
                >
                  {t("admin.createOrder")}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

