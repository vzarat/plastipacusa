"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
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
import { AdminInventoryShell } from "@/components/admin/inventory/AdminInventoryShell";
import {
  tarimaBreakdown,
  tarimasToUnits,
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
  const [bulkTarimas, setBulkTarimas] = useState<Record<string, string>>({});
  const [stepTarimasById, setStepTarimasById] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return inventory;
    return inventory.filter((row) => {
      const hay = `${row.productName || ""} ${row.productSlug || ""} ${row.application || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [inventory, query]);

  const totals = useMemo(() => {
    let tarimas = 0;
    for (const row of inventory) {
      tarimas += tarimaBreakdown(row.stockBoxes, row.application, row.boxesPerPallet).tarimas;
    }
    return { skus: inventory.length, tarimas };
  }, [inventory]);

  function refresh() {
    router.refresh();
  }

  function nudgeTarimas(row: WarehouseInventoryRow, direction: 1 | -1) {
    const stepTarimas = Math.max(
      1,
      Math.floor(Number(stepTarimasById[row.productId]) || 1)
    );
    const deltaUnits =
      direction *
      tarimasToUnits(stepTarimas, row.application, row.boxesPerPallet);

    if (direction < 0 && row.stockBoxes < Math.abs(deltaUnits)) {
      toast.error("Not enough tarimas / units on hand.");
      return;
    }

    startTransition(async () => {
      const result = await adjustWarehouseInventory({
        productId: row.productId,
        delta: deltaUnits,
        reason: direction > 0 ? "received" : "recount",
        notes:
          direction > 0
            ? `+${stepTarimas} tarima(s) stretch film`
            : `−${stepTarimas} tarima(s) stretch film`,
      });
      if (!result.success) {
        toast.error(result.error || "Adjustment failed.");
        return;
      }
      const next = tarimaBreakdown(
        result.stockBoxes || 0,
        row.application,
        row.boxesPerPallet
      );
      toast.success(
        `${direction > 0 ? "+" : "−"}${stepTarimas} tarima → ${next.tarimas} tarimas on hand`
      );
      refresh();
    });
  }

  function submitBulk() {
    const lines = Object.entries(bulkTarimas)
      .map(([productId, raw]) => {
        const row = inventory.find((item) => item.productId === productId);
        const tarimas = Math.max(0, Math.floor(Number(raw) || 0));
        if (!row || tarimas < 1) return null;
        return {
          productId,
          quantity: tarimasToUnits(tarimas, row.application, row.boxesPerPallet),
          tarimas,
        };
      })
      .filter((line): line is NonNullable<typeof line> => Boolean(line));

    if (lines.length === 0) {
      toast.message("Enter tarimas to receive.");
      return;
    }

    startTransition(async () => {
      const result = await bulkReceiveShipment({
        lines: lines.map(({ productId, quantity }) => ({ productId, quantity })),
        notes: bulkNotes || "Inbound stretch film tarimas",
      });
      if (!result.success) {
        toast.error(result.error || "Receive failed.");
        return;
      }
      const tarimaCount = lines.reduce((sum, line) => sum + line.tarimas, 0);
      toast.success(`Received ${tarimaCount} tarima(s) into USA warehouse.`);
      setBulkTarimas({});
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
    <AdminInventoryShell profile={profile}>
      <div className="space-y-6 pb-16">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              <Warehouse className="h-7 w-7 text-emerald-700" />
              Inventario USA · Tarimas
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Stretch film by tarima (pallet). Hand = 48 boxes / tarima · Machine = 40 rolls /
              tarima.
            </p>
            <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              {totals.skus} SKUs · {totals.tarimas.toLocaleString()} tarimas on floor
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
              {bulkOpen ? "Hide receive" : "Recibir tarimas"}
            </button>
          </div>
        </div>

        <section className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-amber-950">
            <PackageCheck className="h-4 w-4" />
            Pending dispatch ({dispatchQueue.length})
          </h2>
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
          <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-wide text-sky-950">
              Recibir tarimas (inbound)
            </h2>
            <p className="mt-1 text-xs text-sky-900/80">
              Enter how many stretch-film tarimas arrived per SKU.
            </p>
            <label className="mt-3 block text-xs font-semibold text-slate-600">
              Notes
              <input
                value={bulkNotes}
                onChange={(event) => setBulkNotes(event.target.value)}
                placeholder="Trailer / PO / carrier"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>
            <div className="mt-3 max-h-72 space-y-2 overflow-y-auto">
              {inventory.map((row) => {
                const meta = tarimaBreakdown(
                  row.stockBoxes,
                  row.application,
                  row.boxesPerPallet
                );
                return (
                  <div
                    key={`bulk-${row.productId}`}
                    className="flex items-center gap-2 rounded-lg bg-white px-2 py-1.5"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-slate-800">
                        {row.productName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {row.application === "machine" ? "Machine" : "Hand"} · 1 tarima ={" "}
                        {meta.perTarima} {meta.unitLabel}
                      </div>
                    </div>
                    <input
                      inputMode="numeric"
                      value={bulkTarimas[row.productId] || ""}
                      onChange={(event) =>
                        setBulkTarimas((current) => ({
                          ...current,
                          [row.productId]: event.target.value,
                        }))
                      }
                      placeholder="0"
                      className="w-20 rounded-lg border border-slate-200 px-2 py-1.5 text-center text-sm font-bold"
                      aria-label={`Tarimas for ${row.productName}`}
                    />
                    <span className="w-14 text-[11px] font-bold uppercase text-slate-400">
                      tarimas
                    </span>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={submitBulk}
              className="mt-3 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
            >
              Post tarimas received
            </button>
          </section>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">
            Stretch film floor ({filtered.length})
          </h2>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search film SKU…"
            className="w-full max-w-xs rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm sm:w-64"
          />
        </div>

        <div className="space-y-3">
          {filtered.map((row) => {
            const meta = tarimaBreakdown(
              row.stockBoxes,
              row.application,
              row.boxesPerPallet
            );
            const status = usStockAvailability({
              stockBoxes: row.stockBoxes,
              reorderPoint: row.reorderPoint,
              tracked: true,
            });
            const filmKind = row.application === "machine" ? "Machine" : "Hand";
            return (
              <article
                key={row.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                        {filmKind} stretch
                      </span>
                      <span className="text-[10px] font-semibold text-slate-400">
                        1 tarima = {meta.perTarima} {meta.unitLabel}
                      </span>
                    </div>
                    <h3 className="truncate text-base font-bold text-slate-900">
                      {row.productName || row.productId}
                    </h3>
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
                    <div className="text-4xl font-black tabular-nums text-slate-900">
                      {meta.tarimas}
                    </div>
                    <div className="text-xs font-black uppercase tracking-wide text-emerald-700">
                      tarimas
                    </div>
                    {meta.loose > 0 ? (
                      <div className="mt-1 text-xs font-semibold text-amber-700">
                        + {meta.loose} {meta.unitLabel} sueltos
                      </div>
                    ) : (
                      <div className="mt-1 text-xs text-slate-400">
                        {row.stockBoxes.toLocaleString()} {meta.unitLabel} total
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={pending || meta.tarimas < 1}
                    onClick={() => nudgeTarimas(row, -1)}
                    className="inline-flex h-14 min-w-14 flex-1 items-center justify-center rounded-2xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 sm:flex-none"
                    aria-label="Quitar tarimas"
                  >
                    <Minus className="h-7 w-7" strokeWidth={3} />
                  </button>
                  <label className="flex flex-col items-center text-[10px] font-bold uppercase text-slate-400">
                    Tarimas
                    <input
                      inputMode="numeric"
                      value={stepTarimasById[row.productId] ?? "1"}
                      onChange={(event) =>
                        setStepTarimasById((current) => ({
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
                    onClick={() => nudgeTarimas(row, 1)}
                    className="inline-flex h-14 min-w-14 flex-1 items-center justify-center rounded-2xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-40 sm:flex-none"
                    aria-label="Agregar tarimas"
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
                ? "No USA inventory rows yet. Apply the multi-warehouse migration in Supabase."
                : "No SKUs match your search."}
            </div>
          ) : null}
        </div>
      </div>
    </AdminInventoryShell>
  );
}
