"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Minus,
  PackageCheck,
  Plus,
  RefreshCw,
  Truck,
  Warehouse,
} from "lucide-react";
import {
  adjustWarehouseInventory,
  bulkReceiveShipment,
  markOrderPickedAndDispatched,
  type WarehouseDispatchOrder,
} from "@/actions/warehouse-inventory";
import type { UserProfile } from "@/actions/auth";
import {
  formatPalletDisplay,
  unitLabelForApplication,
  usStockAvailability,
  usStockStatusLabel,
  type WarehouseInventoryRow,
} from "@/lib/warehouse-inventory";

export function UsaWarehouseInventoryClient({
  profile,
  inventory,
  dispatchQueue,
}: {
  profile: UserProfile;
  inventory: WarehouseInventoryRow[];
  dispatchQueue: WarehouseDispatchOrder[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkNotes, setBulkNotes] = useState("");
  const [bulkQty, setBulkQty] = useState<Record<string, string>>({});
  const [stepById, setStepById] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return inventory;
    return inventory.filter((row) => {
      const hay = `${row.productName || ""} ${row.productSlug || ""} ${row.productId}`.toLowerCase();
      return hay.includes(q);
    });
  }, [inventory, query]);

  function refresh() {
    router.refresh();
  }

  function nudge(row: WarehouseInventoryRow, direction: 1 | -1) {
    const step = Math.max(1, Math.floor(Number(stepById[row.productId]) || 1));
    const delta = direction * step;
    startTransition(async () => {
      const result = await adjustWarehouseInventory({
        productId: row.productId,
        delta,
        reason: direction > 0 ? "received" : "recount",
        notes: direction > 0 ? "Quick + adjustment" : "Quick − adjustment",
      });
      if (!result.success) {
        toast.error(result.error || "Adjustment failed.");
        return;
      }
      toast.success(
        `${direction > 0 ? "+" : "−"}${step} → ${result.stockBoxes} on hand`
      );
      refresh();
    });
  }

  function submitBulk() {
    const lines = Object.entries(bulkQty)
      .map(([productId, raw]) => ({
        productId,
        quantity: Math.max(0, Math.floor(Number(raw) || 0)),
      }))
      .filter((line) => line.quantity > 0);

    if (lines.length === 0) {
      toast.message("Enter quantities to receive.");
      return;
    }

    startTransition(async () => {
      const result = await bulkReceiveShipment({
        lines,
        notes: bulkNotes || "Inbound shipment",
      });
      if (!result.success) {
        toast.error(result.error || "Receive failed.");
        return;
      }
      toast.success(`Received ${result.received} units into USA warehouse.`);
      setBulkQty({});
      setBulkNotes("");
      setBulkOpen(false);
      refresh();
    });
  }

  function dispatchOrder(orderId: string) {
    startTransition(async () => {
      const result = await markOrderPickedAndDispatched(orderId);
      if (!result.success) {
        toast.error(result.error || "Dispatch failed.");
        return;
      }
      toast.success("Marked picked & dispatched.");
      refresh();
    });
  }

  return (
    <div className="mx-auto min-h-screen max-w-6xl px-3 py-4 pb-24 sm:px-6 sm:py-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {profile.role === "admin" ? (
              <Link
                href="/admin"
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Admin
              </Link>
            ) : null}
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-emerald-900">
              USA Warehouse
            </span>
          </div>
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            <Warehouse className="h-7 w-7 text-sky-700" />
            Floor inventory
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Fast +/- counts, inbound receiving, and 1-click dispatch for{" "}
            {profile.fullName || "supervisor"}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={refresh}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700"
          >
            <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setBulkOpen((open) => !open)}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-3 py-2 text-sm font-bold text-white"
          >
            <Truck className="h-4 w-4" />
            {bulkOpen ? "Hide receive" : "Receive shipment"}
          </button>
        </div>
      </div>

      <section className="mb-8 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-black uppercase tracking-wide text-amber-950">
            <PackageCheck className="h-4 w-4" />
            Pending dispatch ({dispatchQueue.length})
          </h2>
        </div>
        {dispatchQueue.length === 0 ? (
          <p className="text-sm text-amber-900/80">No paid orders waiting to pick.</p>
        ) : (
          <div className="space-y-3">
            {dispatchQueue.map((order) => (
              <div
                key={order.id}
                className="rounded-xl border border-amber-200 bg-white p-3 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900">{order.id}</div>
                    <div className="text-sm text-slate-600">
                      {order.customerCompany || order.customerName} ·{" "}
                      {order.shippingSummary}
                    </div>
                    <ul className="mt-2 space-y-0.5 text-xs text-slate-600">
                      {order.lines.map((line) => (
                        <li key={`${order.id}-${line.productId}-${line.sku}`}>
                          {line.units} {line.unitLabel} · {line.productName}
                          {line.sku ? ` (${line.sku})` : ""}
                        </li>
                      ))}
                    </ul>
                    {order.inventorySettled ? (
                      <p className="mt-1 text-[11px] font-semibold text-slate-500">
                        Stock already deducted at payment — this only marks fulfilled.
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => dispatchOrder(order.id)}
                    className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Mark as Picked &amp; Dispatched
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {bulkOpen ? (
        <section className="mb-8 rounded-2xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
          <h2 className="text-sm font-black uppercase tracking-wide text-sky-950">
            Bulk receive
          </h2>
          <p className="mt-1 text-xs text-sky-900/80">
            Enter inbound units (boxes for hand film, rolls for machine).
          </p>
          <label className="mt-3 block text-xs font-semibold text-slate-600">
            Notes
            <input
              value={bulkNotes}
              onChange={(event) => setBulkNotes(event.target.value)}
              placeholder="PO # / carrier / trailer"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            />
          </label>
          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
            {inventory.map((row) => (
              <div
                key={`bulk-${row.productId}`}
                className="flex items-center gap-2 rounded-lg bg-white px-2 py-1.5"
              >
                <div className="min-w-0 flex-1 truncate text-sm text-slate-800">
                  {row.productName}
                </div>
                <input
                  inputMode="numeric"
                  value={bulkQty[row.productId] || ""}
                  onChange={(event) =>
                    setBulkQty((current) => ({
                      ...current,
                      [row.productId]: event.target.value,
                    }))
                  }
                  placeholder="0"
                  className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-center text-sm font-bold"
                />
              </div>
            ))}
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={submitBulk}
            className="mt-3 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            Post receiving
          </button>
        </section>
      ) : null}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">
          SKU counts ({filtered.length})
        </h2>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search SKU / name…"
          className="w-full max-w-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm sm:w-64"
        />
      </div>

      <div className="space-y-3">
        {filtered.map((row) => {
          const units = unitLabelForApplication(row.application);
          const status = usStockAvailability({
            stockBoxes: row.stockBoxes,
            reorderPoint: row.reorderPoint,
            tracked: true,
          });
          return (
            <article
              key={row.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-base font-bold text-slate-900">
                    {row.productName || row.productId}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {row.application || "hand"} · reorder at {row.reorderPoint} {units}
                  </p>
                  <p
                    className={`mt-1 text-xs font-bold ${
                      status === "in_stock"
                        ? "text-emerald-700"
                        : status === "low"
                          ? "text-amber-700"
                          : "text-rose-700"
                    }`}
                  >
                    {usStockStatusLabel(status)}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-black tabular-nums text-slate-900">
                    {row.stockBoxes}
                  </div>
                  <div className="text-xs font-semibold uppercase text-slate-500">
                    {units}
                  </div>
                  <div className="text-xs text-slate-500">
                    {formatPalletDisplay(row.stockBoxes, row.boxesPerPallet)}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={pending || row.stockBoxes < 1}
                  onClick={() => nudge(row, -1)}
                  className="inline-flex h-14 min-w-14 flex-1 items-center justify-center rounded-2xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 sm:flex-none"
                  aria-label="Decrease stock"
                >
                  <Minus className="h-7 w-7" strokeWidth={3} />
                </button>
                <label className="flex flex-col items-center text-[10px] font-bold uppercase text-slate-400">
                  Step
                  <input
                    inputMode="numeric"
                    value={stepById[row.productId] ?? "1"}
                    onChange={(event) =>
                      setStepById((current) => ({
                        ...current,
                        [row.productId]: event.target.value,
                      }))
                    }
                    className="mt-1 w-16 rounded-xl border border-slate-200 px-2 py-2 text-center text-sm font-black text-slate-900"
                  />
                </label>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => nudge(row, 1)}
                  className="inline-flex h-14 min-w-14 flex-1 items-center justify-center rounded-2xl bg-sky-600 text-white hover:bg-sky-700 disabled:opacity-40 sm:flex-none"
                  aria-label="Increase stock"
                >
                  <Plus className="h-7 w-7" strokeWidth={3} />
                </button>
              </div>
            </article>
          );
        })}

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center text-sm text-slate-600">
            {inventory.length === 0
              ? "No USA inventory rows yet. Apply migration 20261124160000_multi_warehouse_inventory.sql in Supabase."
              : "No SKUs match your search."}
          </div>
        ) : null}
      </div>
    </div>
  );
}
