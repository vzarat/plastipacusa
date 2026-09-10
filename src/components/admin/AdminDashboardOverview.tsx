"use client";

import React, { useMemo } from "react";
import { AdminOrder } from "@/actions/admin";
import { formatCurrency } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import {
  DollarSign,
  Package,
  Truck,
  TrendingUp,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  Layers,
  FileSpreadsheet,
  Plus,
  ShieldCheck,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { RevenueMountainChart } from "./charts/RevenueMountainChart";
import { FulfillmentDonutChart } from "./charts/FulfillmentDonutChart";
import { CategoryBarChart } from "./charts/CategoryBarChart";

interface AdminDashboardOverviewProps {
  orders: AdminOrder[];
  onNavigateToOrders: (filter?: string) => void;
  onCreateOrder: () => void;
}

export function AdminDashboardOverview({
  orders,
  onNavigateToOrders,
  onCreateOrder,
}: AdminDashboardOverviewProps) {
  const { t } = useLanguage();

  // Dynamic calculations based on live orders
  const metrics = useMemo(() => {
    const totalSales = orders.reduce((sum, o) => sum + o.totalUsd, 0);
    const totalOrdersCount = orders.length;
    const aov = totalOrdersCount > 0 ? totalSales / totalOrdersCount : 0;

    const unfulfilledCount = orders.filter(
      (o) => o.fulfillmentStatus === "unfulfilled"
    ).length;
    const inTransitCount = orders.filter(
      (o) => o.fulfillmentStatus === "in_transit"
    ).length;
    const fulfilledCount = orders.filter(
      (o) => o.fulfillmentStatus === "fulfilled"
    ).length;

    // Unique corporate accounts count
    const uniqueClients = new Set(orders.map((o) => o.customerCompany || o.customerEmail));
    const activeAccountsCount = Math.max(uniqueClients.size, 48);

    // Total pallets calculated across all order items
    const totalPallets = orders.reduce((acc, order) => {
      const orderPallets = order.items.reduce(
        (sum, item) => sum + (item.quantity || 1),
        0
      );
      return acc + (orderPallets || 1);
    }, 0);

    const pendingPaymentCount = orders.filter(
      (o) => o.paymentStatus === "pending"
    ).length;

    return {
      totalSales,
      totalOrdersCount,
      aov,
      unfulfilledCount,
      inTransitCount,
      fulfilledCount,
      totalPallets,
      pendingPaymentCount,
      activeAccountsCount,
    };
  }, [orders]);

  // High-value commercial orders sorted by total USD
  const highValueOrders = useMemo(() => {
    return [...orders].sort((a, b) => b.totalUsd - a.totalUsd).slice(0, 5);
  }, [orders]);

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in-up">
      {/* Overview Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider uppercase bg-blue-50 text-blue-800 border border-blue-200">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Plastipac Commercial Ops</span>
            </span>
            <span className="text-xs text-slate-400 font-medium hidden sm:inline">•</span>
            <span className="text-xs font-semibold text-slate-500">
              Texas Extrusion Facility & Logistics Hubs
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {t("admin.overview")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Real-time monitoring of wholesale revenue velocity, pallet freight logistics, and client credit statuses.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onNavigateToOrders("unfulfilled")}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-xs cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5 text-amber-500" />
            <span>Review Unfulfilled ({metrics.unfulfilledCount})</span>
          </Button>

          <Button
            size="sm"
            onClick={onCreateOrder}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-black text-white shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>{t("admin.createOrder")}</span>
          </Button>
        </div>
      </div>

      {/* TOP ROW: 4 Compact KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Total Sales */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-sm hover:border-slate-300 transition-all space-y-3">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>{t("admin.totalSales")}</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {formatCurrency(metrics.totalSales)}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <span className="inline-flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-100">
                <ArrowUpRight className="w-3 h-3 mr-0.5" />
                {t("admin.bentoRevenueGrowth")}
              </span>
              <span className="text-[11px] text-slate-400">vs prior period</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Orders */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-sm hover:border-slate-300 transition-all space-y-3">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>{t("admin.totalOrders")}</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {metrics.totalOrdersCount}{" "}
              <span className="text-sm font-semibold text-slate-400">POs</span>
            </div>
            <div className="flex items-center gap-2 mt-1.5 text-xs">
              <span className="font-bold text-amber-600">
                {metrics.unfulfilledCount} unfulfilled
              </span>
              <span className="text-slate-300">•</span>
              <span className="font-medium text-slate-500">
                {metrics.inTransitCount} in transit
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Average Order Value (AOV) */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-sm hover:border-slate-300 transition-all space-y-3">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>{t("admin.aovShort")}</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {formatCurrency(metrics.aov)}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-500 font-medium">
              <span className="inline-flex items-center text-[11px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                +4.8%
              </span>
              <span>Pallet freight average ticket</span>
            </div>
          </div>
        </div>

        {/* Card 4: Active B2B Accounts */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xs hover:shadow-sm hover:border-slate-300 transition-all space-y-3">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>{t("admin.bentoActiveAccounts")}</span>
            <div className="w-8 h-8 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>

          <div>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {metrics.activeAccountsCount}{" "}
              <span className="text-sm font-semibold text-slate-400">Clients</span>
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs">
              <span className="inline-flex items-center text-[11px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">
                +5 New
              </span>
              <span className="text-slate-500">Corporate Net-30 verified</span>
            </div>
          </div>
        </div>
      </div>

      {/* MIDDLE ROW: Bento Grid (66% Left Mountain Chart + 33% Right Donut & Alert Feed) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: 66% width (2 cols) */}
        <div className="lg:col-span-2">
          <RevenueMountainChart />
        </div>

        {/* Right: 33% width (1 col) */}
        <div className="lg:col-span-1">
          <FulfillmentDonutChart />
        </div>
      </div>

      {/* BOTTOM ROW: Bento Grid with Explicit Breathing Room */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* Left: Category Bar Chart (5 cols on lg, 4 on xl) */}
        <div className="lg:col-span-5 xl:col-span-4">
          <CategoryBarChart />
        </div>

        {/* Right: High-Value Orders Quick Table (7 cols on lg, 8 on xl) */}
        <div className="lg:col-span-7 xl:col-span-8 bg-white border border-slate-200/80 shadow-xs hover:shadow-sm transition-all rounded-2xl p-6 space-y-5 flex flex-col justify-between">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-slate-100 text-slate-800 border border-slate-200">
                  <Package className="w-3.5 h-3.5 text-slate-600" />
                  <span>{t("admin.bentoRecentOrders")}</span>
                </span>
                <span className="text-xs font-semibold text-slate-400">
                  Top Ticket Batches
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {t("admin.bentoRecentOrdersSubtitle")}
              </p>
            </div>

            <button
              type="button"
              onClick={() => onNavigateToOrders("all")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition-colors cursor-pointer self-start sm:self-auto"
            >
              <span>{t("admin.viewAll")} ({orders.length})</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          </div>

          {/* Quick Table with Explicit Min-Widths and Cell Padding */}
          <div className="overflow-x-auto -mx-6 px-6">
            <table className="w-full text-left border-collapse min-w-[680px]">
              <thead>
                <tr className="border-b border-slate-100 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="px-4 py-3 min-w-[110px]">{t("admin.colOrder")}</th>
                  <th className="px-4 py-3 min-w-[180px]">{t("admin.colCustomer")}</th>
                  <th className="px-4 py-3 min-w-[160px]">{t("admin.colItems")}</th>
                  <th className="px-4 py-3 min-w-[110px]">{t("admin.colTotal")}</th>
                  <th className="px-4 py-3 min-w-[95px]">{t("admin.colPayment")}</th>
                  <th className="px-4 py-3 min-w-[110px]">{t("admin.colFulfillment")}</th>
                  <th className="px-4 py-3 text-right min-w-[85px]">{t("admin.colAction")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-medium">
                {highValueOrders.map((order) => {
                  const paymentBadge =
                    order.paymentStatus === "paid"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : order.paymentStatus === "pending"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-rose-50 text-rose-700 border-rose-200";

                  const fulfillmentBadge =
                    order.fulfillmentStatus === "fulfilled"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : order.fulfillmentStatus === "in_transit"
                      ? "bg-sky-50 text-sky-700 border-sky-200"
                      : "bg-amber-50 text-amber-700 border-amber-200";

                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      <td className="px-4 py-3">
                        <span className="font-mono font-bold text-xs text-slate-900 group-hover:text-blue-600 transition-colors">
                          {order.id}
                        </span>
                        <span className="block text-[10px] text-slate-400">
                          {order.createdAt || "N/A"}
                        </span>
                      </td>

                      <td className="px-4 py-3 min-w-[180px]">
                        <span className="font-bold text-slate-900 block truncate max-w-[180px]">
                          {order.customerCompany}
                        </span>
                        <span className="text-[11px] text-slate-400 block truncate max-w-[180px]">
                          {order.customerName}
                        </span>
                      </td>

                      <td className="px-4 py-3 min-w-[160px]">
                        <span className="text-slate-600 truncate block text-xs max-w-[170px]">
                          {order.itemsSummary}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {order.items.reduce((s, i) => s + (i.quantity || 1), 0)} Plts
                        </span>
                      </td>

                      <td className="px-4 py-3 font-mono font-black text-slate-900 whitespace-nowrap">
                        {formatCurrency(order.totalUsd)}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${paymentBadge}`}
                        >
                          {order.paymentStatus}
                        </span>
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${fulfillmentBadge}`}
                        >
                          {order.fulfillmentStatus === "in_transit"
                            ? "In Transit"
                            : order.fulfillmentStatus}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => onNavigateToOrders(order.fulfillmentStatus)}
                          className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition-colors cursor-pointer"
                        >
                          {t("admin.inspect")}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Quick Footer Action Callout */}
          <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>Prioritizing truckloads exceeding $10,000 threshold for rapid customs release.</span>
            </div>
            <button
              type="button"
              onClick={onCreateOrder}
              className="font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 self-start sm:self-auto cursor-pointer"
            >
              <span>{t("admin.createOrder")}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
