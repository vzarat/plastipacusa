"use client";

import React, { useState, useMemo } from "react";
import { AdminOrder, createOrder, updateOrderStatus } from "@/actions/admin";
import { formatCurrency } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
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
  RotateCw,
  Eye,
  Check,
  Calendar,
  ShieldCheck,
  FileSpreadsheet,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface AdminOrdersTableProps {
  orders: AdminOrder[];
  onUpdateStatus: (
    orderId: string,
    newStatus: "fulfilled" | "unfulfilled" | "in_transit" | "cancelled"
  ) => Promise<void>;
  onCreateOrder: (order: AdminOrder) => void;
  initialFilterTab?: string;
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
  showToast: (msg: string) => void;
}

type FilterTabKey = "all" | "unfulfilled" | "pending_payment" | "in_transit" | "completed";

export function AdminOrdersTable({
  orders,
  onUpdateStatus,
  onCreateOrder,
  initialFilterTab = "all",
  isCreateModalOpen,
  setIsCreateModalOpen,
  showToast,
}: AdminOrdersTableProps) {
  const { t, locale } = useLanguage();

  const [activeTab, setActiveTab] = useState<FilterTabKey>(
    (initialFilterTab as FilterTabKey) || "all"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");
  const [fulfillmentFilter, setFulfillmentFilter] = useState<string>("all");
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [inspectOrder, setInspectOrder] = useState<AdminOrder | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // New Draft Order state
  const [draftCustomerName, setDraftCustomerName] = useState("");
  const [draftCompany, setDraftCompany] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [draftProduct, setDraftProduct] = useState("FORCE Standard 18\"");
  const [draftPallets, setDraftPallets] = useState(1);

  // Tab count metrics
  const tabCounts = useMemo(() => {
    return {
      all: orders.length,
      unfulfilled: orders.filter((o) => o.fulfillmentStatus === "unfulfilled").length,
      pending_payment: orders.filter((o) => o.paymentStatus === "pending").length,
      in_transit: orders.filter((o) => o.fulfillmentStatus === "in_transit").length,
      completed: orders.filter((o) => o.fulfillmentStatus === "fulfilled").length,
    };
  }, [orders]);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Tab pill filtering
      if (activeTab === "unfulfilled" && order.fulfillmentStatus !== "unfulfilled") {
        return false;
      }
      if (activeTab === "pending_payment" && order.paymentStatus !== "pending") {
        return false;
      }
      if (activeTab === "in_transit" && order.fulfillmentStatus !== "in_transit") {
        return false;
      }
      if (activeTab === "completed" && order.fulfillmentStatus !== "fulfilled") {
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

      // Search query filter (Order #, Customer Name, Company, PO Number)
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesId = order.id.toLowerCase().includes(query);
        const matchesCustomer = order.customerName.toLowerCase().includes(query);
        const matchesCompany = order.customerCompany.toLowerCase().includes(query);
        const matchesEmail = order.customerEmail.toLowerCase().includes(query);
        const matchesSummary = order.itemsSummary.toLowerCase().includes(query);
        const matchesCity = order.shippingAddress.city.toLowerCase().includes(query);
        return (
          matchesId ||
          matchesCustomer ||
          matchesCompany ||
          matchesEmail ||
          matchesSummary ||
          matchesCity
        );
      }

      return true;
    });
  }, [orders, activeTab, paymentFilter, fulfillmentFilter, searchQuery]);

  // Bulk selection handling
  const isAllSelected =
    filteredOrders.length > 0 && selectedOrderIds.length === filteredOrders.length;

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

  // CSV export
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
      "PO / Order ID",
      "Date",
      "Customer",
      "Company",
      "Email",
      "Total USD",
      "Payment Status",
      "Fulfillment Status",
      "Items Summary",
      "Tracking Number",
      "Carrier",
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
      `"${o.carrier || ""}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `plastipac_commercial_orders_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Exported ${listToExport.length} orders successfully.`);
  };

  // Download Single Invoice CSV
  const handleDownloadSingleInvoice = (order: AdminOrder) => {
    const headers = ["Item", "Specification", "Quantity", "Unit Price", "Subtotal"];
    const rows = order.items.map((item) => [
      `"${item.productName}"`,
      `"${item.packageSize} (${item.gauge}G x ${item.widthInches}\")"`,
      `"${item.quantity}"`,
      `"${item.unitPrice}"`,
      `"${(item.unitPrice * item.quantity).toFixed(2)}"`,
    ]);

    const csv =
      "data:text/csv;charset=utf-8," +
      [
        `"COMMERCIAL INVOICE - PLASTIPAC USA"`,
        `"Order ID: ${order.id}"`,
        `"Customer: ${order.customerName} (${order.customerCompany})"`,
        `"Date: ${new Date(order.createdAt).toLocaleDateString()}"`,
        `"Total: $${order.totalUsd.toFixed(2)} USD"`,
        "",
        headers.join(","),
        ...rows.map((r) => r.join(",")),
      ].join("\n");

    const encodedUri = encodeURI(csv);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Invoice_${order.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast(`Invoice for ${order.id} downloaded.`);
  };

  // Create Draft Order submit
  const handleCreateDraftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftCustomerName.trim() || !draftCompany.trim()) {
      showToast("Please provide Customer Name and Commercial Company.");
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
      customerName: draftCustomerName.trim(),
      customerEmail: draftEmail.trim() || "procurement@client.com",
      customerCompany: draftCompany.trim(),
      customerPhone: "(956) 400 36 83",
      shippingAddress: {
        street: "8400 Industrial Logistics Way, Bay 10",
        city: "San Antonio",
        state: "TX",
        zip: "78219",
        country: "United States",
      },
      totalUsd,
      paymentStatus: "pending",
      fulfillmentStatus: "unfulfilled",
      itemsSummary: `${draftProduct} (${draftPallets} Pallet${draftPallets > 1 ? "s" : ""})`,
      notes: "Direct wholesale quote drafted from Admin Console.",
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
          sku: "PL-PO-MANUAL-ADMIN",
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
      locale,
    };

    try {
      const result = await createOrder(newOrder);
      if (!result.success) {
        showToast(result.error || "Failed to create order.");
        return;
      }

      onCreateOrder(newOrder);
      setIsCreateModalOpen(false);
      setDraftCustomerName("");
      setDraftCompany("");
      setDraftEmail("");
      showToast(`Order ${newId} created successfully!`);
    } catch {
      showToast("Error creating order.");
    }
  };

  const handleStatusChangeAction = async (
    orderId: string,
    newStatus: "fulfilled" | "unfulfilled" | "in_transit" | "cancelled"
  ) => {
    setIsUpdatingStatus(true);
    try {
      await onUpdateStatus(orderId, newStatus);
      if (inspectOrder && inspectOrder.id === orderId) {
        setInspectOrder((prev) => (prev ? { ...prev, fulfillmentStatus: newStatus } : null));
      }
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold mb-1">
            <span>Admin</span>
            <span>/</span>
            <span className="text-slate-900 font-bold">{t("admin.ordersQuotes")}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {t("admin.ordersQuotes")}
            </h1>
            <span className="px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold text-xs">
              {orders.length} {t("admin.totalCount")}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
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
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-black text-white shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t("admin.createOrder")}</span>
          </Button>
        </div>
      </div>

      {/* Main Table Container Card (Clean Polaris/Shopify Style) */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        {/* Top Filter Pills */}
        <div className="border-b border-slate-200 px-4 sm:px-6 pt-3 flex items-center gap-1.5 sm:gap-2 overflow-x-auto">
          {(
            [
              { key: "all", label: t("admin.filterAll"), count: tabCounts.all },
              { key: "unfulfilled", label: t("admin.filterUnfulfilled"), count: tabCounts.unfulfilled },
              { key: "pending_payment", label: t("admin.filterPendingPayment"), count: tabCounts.pending_payment },
              { key: "in_transit", label: t("admin.filterInTransit"), count: tabCounts.in_transit },
              { key: "completed", label: t("admin.filterCompleted"), count: tabCounts.completed },
            ] as const
          ).map((tab) => {
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "border-purple-700 text-purple-900"
                    : "border-transparent text-slate-500 hover:text-slate-900 hover:border-slate-300"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive
                      ? "bg-purple-700 text-white"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Bar & Secondary Dropdowns */}
        <div className="p-4 sm:px-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Order #, Customer, Company, or PO..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600/10 focus:border-purple-400 transition-all"
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

          {/* Secondary Dropdown Filters */}
          <div className="flex items-center gap-2 flex-wrap">
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

        {/* Bulk Action Bar */}
        {selectedOrderIds.length > 0 && (
          <div className="bg-purple-50 border-b border-purple-200 px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs text-purple-900 font-semibold animate-fade-in-up">
            <div className="flex items-center gap-2">
              <span className="font-bold">
                {selectedOrderIds.length} {t("admin.ordersSelected")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3 py-1 rounded-lg border border-purple-300 bg-white text-purple-800 font-bold hover:bg-purple-50 transition-colors cursor-pointer"
              >
                {t("admin.exportSelected")}
              </button>
              <button
                type="button"
                onClick={() => setSelectedOrderIds([])}
                className="p-1 text-purple-600 hover:text-purple-950 cursor-pointer"
                title="Clear selection"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Live Orders Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4 sm:px-6 w-10">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={handleToggleSelectAll}
                    className="rounded border-slate-300 text-purple-700 focus:ring-purple-600 cursor-pointer"
                    aria-label="Select all orders"
                  />
                </th>
                <th className="py-3.5 px-3">PO / Order ID</th>
                <th className="py-3.5 px-3">Date</th>
                <th className="py-3.5 px-4">Client Company</th>
                <th className="py-3.5 px-4">Items Purchased</th>
                <th className="py-3.5 px-3">Total Amount</th>
                <th className="py-3.5 px-3">Payment Status</th>
                <th className="py-3.5 px-3">Fulfillment Status</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-slate-500 text-xs space-y-2">
                    <Package className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="font-bold text-slate-700 text-sm">
                      {t("admin.noOrdersFound")}
                    </p>
                    <p className="text-xs text-slate-400">
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
                      className={`hover:bg-slate-50/90 transition-colors ${
                        isSelected ? "bg-purple-50/30" : ""
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-4 px-4 sm:px-6">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectOrder(order.id)}
                          className="rounded border-slate-300 text-purple-700 focus:ring-purple-600 cursor-pointer"
                          aria-label={`Select ${order.id}`}
                        />
                      </td>

                      {/* PO / Order ID */}
                      <td className="py-4 px-3 font-mono font-bold text-slate-900">
                        <button
                          type="button"
                          onClick={() => setInspectOrder(order)}
                          className="hover:text-purple-700 transition-colors underline decoration-slate-300 underline-offset-2 cursor-pointer text-left"
                        >
                          #{order.id}
                        </button>
                      </td>

                      {/* Date */}
                      <td className="py-4 px-3 text-slate-600 text-[11px] whitespace-nowrap">
                        {new Date(order.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </td>

                      {/* Client Company */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5">
                          <p className="font-bold text-slate-900 text-xs">
                            {order.customerCompany}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {order.customerName}
                          </p>
                        </div>
                      </td>

                      {/* Items Purchased */}
                      <td className="py-4 px-4 max-w-[240px]">
                        <p className="text-xs text-slate-800 font-medium truncate" title={order.itemsSummary}>
                          {order.itemsSummary}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {order.items.length > 0 ? `${order.items[0].packageSize}` : "Standard Pallet Batch"}
                        </p>
                      </td>

                      {/* Total Amount */}
                      <td className="py-4 px-3 font-black text-slate-900 text-xs whitespace-nowrap">
                        {formatCurrency(order.totalUsd)}
                      </td>

                      {/* Payment Status Badge */}
                      <td className="py-4 px-3 whitespace-nowrap">
                        {isPaid ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Paid Net-30
                          </span>
                        ) : isPendingPayment ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Pending Net-30
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-bold">
                            Refunded
                          </span>
                        )}
                      </td>

                      {/* Fulfillment Status Badge */}
                      <td className="py-4 px-3 whitespace-nowrap">
                        {isFulfilled ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            Delivered
                          </span>
                        ) : isInTransit ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800 text-[10px] font-bold">
                            <Truck className="w-3 h-3 text-blue-600" />
                            In Transit
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Unfulfilled
                          </span>
                        )}
                      </td>

                      {/* Action Menu Buttons */}
                      <td className="py-4 px-4 sm:px-6 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => setInspectOrder(order)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-purple-700 hover:bg-purple-50 transition-colors cursor-pointer"
                            title="Inspect Order & Specs"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDownloadSingleInvoice(order)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-blue-700 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Download Invoice CSV"
                          >
                            <Download className="w-4 h-4" />
                          </button>

                          {/* Fast status switcher */}
                          <select
                            value={order.fulfillmentStatus}
                            disabled={isUpdatingStatus}
                            onChange={(e) =>
                              handleStatusChangeAction(order.id, e.target.value as any)
                            }
                            className="text-[10px] font-bold py-1 px-2 rounded-lg border border-slate-200 bg-white text-slate-700 hover:border-slate-300 focus:outline-none cursor-pointer"
                          >
                            <option value="unfulfilled">Unfulfilled</option>
                            <option value="in_transit">In Transit</option>
                            <option value="fulfilled">Delivered</option>
                            <option value="cancelled">Cancelled</option>
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

      {/* Slide-out Order Details & Inspection Drawer */}
      {inspectOrder && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity"
            onClick={() => setInspectOrder(null)}
          />

          <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col justify-between overflow-y-auto p-6 space-y-6 animate-slide-in-right">
              <div className="space-y-6">
                {/* Drawer Header */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                  <div>
                    <span className="text-xs font-mono font-bold text-purple-700 uppercase">
                      Order Inspection
                    </span>
                    <h2 className="text-xl font-black text-slate-900">
                      #{inspectOrder.id}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInspectOrder(null)}
                    className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Company & Customer Details */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      {inspectOrder.customerCompany}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-800">
                      Corporate Partner
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 space-y-1">
                    <p className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>{inspectOrder.customerName}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>{inspectOrder.customerEmail}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        {inspectOrder.shippingAddress.street},{" "}
                        {inspectOrder.shippingAddress.city}, {inspectOrder.shippingAddress.state}
                      </span>
                    </p>
                  </div>
                </div>

                {/* Items & Packaging Specs */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Pallet Freight Manifest
                  </h3>
                  <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                    <p className="font-bold text-xs text-slate-900">
                      {inspectOrder.itemsSummary}
                    </p>
                    {inspectOrder.items.map((item, idx) => (
                      <div
                        key={idx}
                        className="text-xs text-slate-600 pt-2 border-t border-slate-100 space-y-1"
                      >
                        <div className="flex justify-between font-semibold text-slate-800">
                          <span>{item.productName}</span>
                          <span>x{item.quantity} Pallet(s)</span>
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Width: {item.widthInches}" • Gauge: {item.gauge}G • Package: {item.packageSize}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Unit Price: {formatCurrency(item.unitPrice)} • Total: {formatCurrency(item.unitPrice * item.quantity)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status Switcher within Drawer */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Update Shipment Status
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {(
                      [
                        { val: "unfulfilled", label: "Unfulfilled", color: "hover:bg-amber-50" },
                        { val: "in_transit", label: "In Transit", color: "hover:bg-blue-50" },
                        { val: "fulfilled", label: "Delivered", color: "hover:bg-emerald-50" },
                        { val: "cancelled", label: "Cancelled", color: "hover:bg-rose-50" },
                      ] as const
                    ).map((s) => (
                      <button
                        key={s.val}
                        type="button"
                        onClick={() => handleStatusChangeAction(inspectOrder.id, s.val)}
                        disabled={isUpdatingStatus}
                        className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                          inspectOrder.fulfillmentStatus === s.val
                            ? "bg-slate-900 text-white border-slate-900"
                            : `bg-white text-slate-700 border-slate-200 ${s.color}`
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Drawer Footer Actions */}
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <Button
                  onClick={() => handleDownloadSingleInvoice(inspectOrder)}
                  className="w-full flex items-center justify-center gap-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download Commercial Invoice</span>
                </Button>
                <button
                  type="button"
                  onClick={() => setInspectOrder(null)}
                  className="w-full py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Close Inspection
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Order Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
            onClick={() => setIsCreateModalOpen(false)}
          />

          <div className="relative bg-white rounded-3xl border border-slate-200 shadow-2xl p-6 sm:p-8 max-w-lg w-full z-10 space-y-5 animate-fade-in-up">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-xs font-bold uppercase text-purple-700">
                  Sales Dispatch Desk
                </span>
                <h3 className="text-xl font-black text-slate-900">
                  Create Commercial Order
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDraftSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  Client Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={draftCompany}
                  onChange={(e) => setDraftCompany(e.target.value)}
                  placeholder="e.g. General Motors Reynosa Plant"
                  className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600/10 focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Purchasing Agent *
                  </label>
                  <input
                    type="text"
                    required
                    value={draftCustomerName}
                    onChange={(e) => setDraftCustomerName(e.target.value)}
                    placeholder="e.g. David Vance"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600/10 focus:border-purple-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Procurement Email
                  </label>
                  <input
                    type="email"
                    value={draftEmail}
                    onChange={(e) => setDraftEmail(e.target.value)}
                    placeholder="procurement@gm.com"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600/10 focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Film Series
                  </label>
                  <select
                    value={draftProduct}
                    onChange={(e) => setDraftProduct(e.target.value)}
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-purple-500"
                  >
                    <option value='FORCE Standard 18"'>FORCE Standard 18"</option>
                    <option value='GENESIS Standard 20"'>GENESIS Standard 20" (Machine)</option>
                    <option value='FORCE Elite 15" Ultra-Yield'>FORCE Elite 15" Ultra-Yield</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase">
                    Pallet Quantity
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={26}
                    value={draftPallets}
                    onChange={(e) => setDraftPallets(Number(e.target.value))}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2.5 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  className="px-5 py-2.5 text-xs font-bold rounded-xl bg-purple-700 hover:bg-purple-800 text-white shadow-xs cursor-pointer"
                >
                  Save & Dispatch Order
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

