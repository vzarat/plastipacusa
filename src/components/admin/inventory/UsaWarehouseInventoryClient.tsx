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
  markOrderPickedAndDispatched,
  receiveStretchByMeasures,
  type WarehouseDispatchOrder,
} from "@/actions/warehouse-inventory";
import type { UserProfile } from "@/actions/auth";
import { AdminInventoryShell } from "@/components/admin/inventory/AdminInventoryShell";
import { BespokeInventorySheet } from "@/components/admin/inventory/BespokeInventorySheet";
import {
  WarehouseLangProvider,
  useWarehouseLang,
} from "@/components/admin/inventory/WarehouseLangContext";
import type { BespokeImportBatch } from "@/actions/bespoke-inventory";
import type { BespokeInventoryItem } from "@/lib/bespoke-inventory";
import {
  assignStretchSkuForReceive,
  formatStretchSpec,
  matchStretchCatalog,
  tarimaBreakdown,
  tarimasToUnits,
  uniqueSortedNumbers,
  usStockAvailability,
  usStockStatusLabel,
  type StretchCatalogItem,
  type WarehouseInventoryRow,
} from "@/lib/warehouse-inventory";

type ReceiveDraft = {
  application: "hand" | "machine";
  widthInches: string;
  gauge: string;
  lengthFeet: string;
  pallets: string;
  productId: string;
};

const EMPTY_DRAFT: ReceiveDraft = {
  application: "hand",
  widthInches: "",
  gauge: "",
  lengthFeet: "",
  pallets: "1",
  productId: "",
};

type StagedReceive = {
  key: string;
  application: "hand" | "machine";
  widthInches: number;
  gauge: number;
  lengthFeet: number;
  pallets: number;
  productId: string;
  sku: string | null;
  productName: string;
};

export function UsaWarehouseInventoryClient(
  props: {
    profile: UserProfile;
    inventory: WarehouseInventoryRow[];
    dispatchQueue: WarehouseDispatchOrder[];
    stretchCatalog: StretchCatalogItem[];
    bespokeItems?: BespokeInventoryItem[];
    importBatches?: BespokeImportBatch[];
    warehouseReady?: boolean;
  }
) {
  return (
    <WarehouseLangProvider>
      <UsaWarehouseInventoryClientInner {...props} />
    </WarehouseLangProvider>
  );
}

function UsaWarehouseInventoryClientInner({
  profile,
  inventory,
  dispatchQueue,
  stretchCatalog,
  bespokeItems = [],
  importBatches = [],
  warehouseReady = true,
}: {
  profile: UserProfile;
  inventory: WarehouseInventoryRow[];
  dispatchQueue: WarehouseDispatchOrder[];
  stretchCatalog: StretchCatalogItem[];
  bespokeItems?: BespokeInventoryItem[];
  importBatches?: BespokeImportBatch[];
  warehouseReady?: boolean;
}) {
  const { t } = useWarehouseLang();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<"stretch" | "bespoke">("bespoke");
  const [query, setQuery] = useState("");
  const [bulkOpen, setBulkOpen] = useState(true);
  const [bulkNotes, setBulkNotes] = useState("");
  const [draft, setDraft] = useState<ReceiveDraft>(EMPTY_DRAFT);
  const [staged, setStaged] = useState<StagedReceive[]>([]);
  const [stepPalletsById, setStepPalletsById] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return inventory;
    return inventory.filter((row) => {
      const hay = [
        row.productName,
        row.productSlug,
        row.application,
        row.partNumber,
        row.gauge != null ? `${row.gauge} ga` : "",
        row.gauge != null ? String(row.gauge) : "",
        row.widthInches != null ? `${row.widthInches}"` : "",
        row.widthInches != null ? String(row.widthInches) : "",
        formatStretchSpec(row),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [inventory, query]);

  const totals = useMemo(() => {
    let pallets = 0;
    for (const row of inventory) {
      pallets += tarimaBreakdown(row.stockBoxes, row.application, row.boxesPerPallet).tarimas;
    }
    return { skus: inventory.length, pallets };
  }, [inventory]);

  const catalogForApp = useMemo(
    () => stretchCatalog.filter((item) => item.application === draft.application),
    [stretchCatalog, draft.application]
  );

  /** Always keep measure dropdowns filled — catalog first, master sheets as backup. */
  const measureSource = useMemo(() => {
    if (catalogForApp.length > 0) {
      return catalogForApp.map((item) => ({
        widthInches: item.widthInches,
        gauge: item.gauge,
        lengthFeet: item.lengthFeet,
      }));
    }
    if (draft.application === "machine") {
      return [
        { widthInches: 20, gauge: 51, lengthFeet: 7000 },
        { widthInches: 20, gauge: 51, lengthFeet: 9000 },
        { widthInches: 20, gauge: 70, lengthFeet: 5000 },
        { widthInches: 20, gauge: 80, lengthFeet: 5000 },
      ];
    }
    return [
      { widthInches: 15, gauge: 40, lengthFeet: 1500 },
      { widthInches: 15, gauge: 60, lengthFeet: 1000 },
      { widthInches: 15, gauge: 60, lengthFeet: 1500 },
      { widthInches: 15, gauge: 70, lengthFeet: 1500 },
      { widthInches: 15, gauge: 80, lengthFeet: 1500 },
      { widthInches: 18, gauge: 60, lengthFeet: 1000 },
      { widthInches: 18, gauge: 60, lengthFeet: 1500 },
      { widthInches: 18, gauge: 70, lengthFeet: 1500 },
      { widthInches: 18, gauge: 80, lengthFeet: 1500 },
    ];
  }, [catalogForApp, draft.application]);

  const widthOptions = useMemo(
    () => uniqueSortedNumbers(measureSource.map((item) => item.widthInches)),
    [measureSource]
  );

  const gaugeOptions = useMemo(() => {
    const width = Math.round(Number(draft.widthInches) || 0);
    return uniqueSortedNumbers(
      measureSource
        .filter((item) => !width || Math.round(Number(item.widthInches)) === width)
        .map((item) => item.gauge)
    );
  }, [measureSource, draft.widthInches]);

  const lengthOptions = useMemo(() => {
    const width = Math.round(Number(draft.widthInches) || 0);
    const gauge = Math.round(Number(draft.gauge) || 0);
    return uniqueSortedNumbers(
      measureSource
        .filter((item) => {
          if (width && Math.round(Number(item.widthInches)) !== width) return false;
          if (gauge && Math.round(Number(item.gauge)) !== gauge) return false;
          return true;
        })
        .map((item) => item.lengthFeet)
    );
  }, [measureSource, draft.widthInches, draft.gauge]);

  const draftMatches = useMemo(() => {
    const widthInches = Math.round(Number(draft.widthInches) || 0);
    const gauge = Math.round(Number(draft.gauge) || 0);
    const lengthFeet = Math.round(Number(draft.lengthFeet) || 0);
    if (widthInches < 1 || gauge < 1 || lengthFeet < 1) return [];
    return matchStretchCatalog(stretchCatalog, {
      application: draft.application,
      widthInches,
      gauge,
      lengthFeet,
    });
  }, [draft, stretchCatalog]);

  const assignedPreview = useMemo(() => {
    if (draftMatches.length === 0) return null;
    if (draft.productId) {
      return draftMatches.find((item) => item.productId === draft.productId) || null;
    }
    return assignStretchSkuForReceive(stretchCatalog, {
      application: draft.application,
      widthInches: Math.round(Number(draft.widthInches) || 0),
      gauge: Math.round(Number(draft.gauge) || 0),
      lengthFeet: Math.round(Number(draft.lengthFeet) || 0),
    });
  }, [draft, draftMatches, stretchCatalog]);

  function refresh() {
    router.refresh();
  }

  function updateDraft(patch: Partial<ReceiveDraft>) {
    setDraft((current) => {
      const next = { ...current, ...patch };
      if (patch.application && patch.application !== current.application) {
        next.widthInches = "";
        next.gauge = "";
        next.lengthFeet = "";
        next.productId = "";
      }
      if (patch.widthInches !== undefined && patch.widthInches !== current.widthInches) {
        next.gauge = "";
        next.lengthFeet = "";
        next.productId = "";
      }
      if (patch.gauge !== undefined && patch.gauge !== current.gauge) {
        next.lengthFeet = "";
        next.productId = "";
      }
      if (patch.lengthFeet !== undefined && patch.lengthFeet !== current.lengthFeet) {
        next.productId = "";
      }
      return next;
    });
  }

  function addReceiveLine() {
    const widthInches = Math.round(Number(draft.widthInches) || 0);
    const gauge = Math.round(Number(draft.gauge) || 0);
    const lengthFeet = Math.round(Number(draft.lengthFeet) || 0);
    const pallets = Math.max(0, Math.floor(Number(draft.pallets) || 0));
    if (widthInches < 1 || gauge < 1 || lengthFeet < 1 || pallets < 1) {
      toast.message("Pick width, gauge, length, and pallet count.");
      return;
    }
    if (!assignedPreview) {
      toast.error("No SKU matches those measures.");
      return;
    }

    const line: StagedReceive = {
      key: `${assignedPreview.productId}-${Date.now()}`,
      application: draft.application,
      widthInches,
      gauge,
      lengthFeet,
      pallets,
      productId: assignedPreview.productId,
      sku: assignedPreview.partNumber,
      productName: assignedPreview.productName,
    };
    setStaged((current) => [...current, line]);
    setDraft((current) => ({
      ...current,
      pallets: "1",
      productId: "",
    }));
    toast.success(
      `Queued ${pallets} pallet(s) → ${assignedPreview.partNumber || assignedPreview.productName}`
    );
  }

  function submitStagedReceive() {
    if (staged.length === 0) {
      toast.message("Add at least one measure + pallet line.");
      return;
    }

    startTransition(async () => {
      let receivedPallets = 0;
      for (const line of staged) {
        const result = await receiveStretchByMeasures({
          application: line.application,
          widthInches: line.widthInches,
          gauge: line.gauge,
          lengthFeet: line.lengthFeet,
          pallets: line.pallets,
          productId: line.productId,
          notes: bulkNotes || undefined,
        });
        if (!result.success) {
          toast.error(
            result.error ||
              `Failed on ${line.widthInches}" · ${line.gauge} GA · ${line.lengthFeet} ft`
          );
          refresh();
          return;
        }
        receivedPallets += line.pallets;
        toast.success(
          `${line.pallets} pallet(s) posted as ${result.sku || result.productName}`
        );
      }
      toast.success(`Received ${receivedPallets} pallet(s). SKUs assigned automatically.`);
      setStaged([]);
      setBulkNotes("");
      setDraft(EMPTY_DRAFT);
      refresh();
    });
  }

  function nudgePallets(row: WarehouseInventoryRow, direction: 1 | -1) {
    const stepPallets = Math.max(
      1,
      Math.floor(Number(stepPalletsById[row.productId]) || 1)
    );
    const deltaUnits =
      direction *
      tarimasToUnits(stepPallets, row.application, row.boxesPerPallet);

    if (direction < 0 && row.stockBoxes < Math.abs(deltaUnits)) {
      toast.error("Not enough pallets / units on hand.");
      return;
    }

    startTransition(async () => {
      const result = await adjustWarehouseInventory({
        productId: row.productId,
        delta: deltaUnits,
        reason: direction > 0 ? "received" : "recount",
        notes:
          direction > 0
            ? `+${stepPallets} stretch film pallet(s)`
            : `−${stepPallets} stretch film pallet(s)`,
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
        `${direction > 0 ? "+" : "−"}${stepPallets} pallet → ${next.tarimas} pallets on hand`
      );
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
    <AdminInventoryShell
      profile={profile}
      badgeLabel={
        tab === "bespoke"
          ? t("USA · Hoja Bespoke", "USA · Bespoke sheet")
          : t("USA · Tarimas stretch", "USA · Stretch pallets")
      }
    >
      <div className="space-y-6 pb-16">
        <div className="print:hidden flex w-full max-w-xl flex-wrap gap-1 rounded-2xl border border-slate-200 bg-slate-50 p-1 sm:w-fit">
          <button
            type="button"
            onClick={() => setTab("bespoke")}
            className={`min-h-10 flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition sm:flex-none ${
              tab === "bespoke"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-white"
            }`}
          >
            {t("Hoja Bespoke", "Bespoke sheet")}
          </button>
          <button
            type="button"
            onClick={() => setTab("stretch")}
            className={`min-h-10 flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition sm:flex-none ${
              tab === "stretch"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-white"
            }`}
          >
            {t("Tarimas stretch", "Stretch pallets")}
          </button>
        </div>

        {tab === "bespoke" ? (
          <BespokeInventorySheet
            items={bespokeItems}
            importBatches={importBatches}
            canManageMaster
            canDelete={profile.role === "admin"}
          />
        ) : null}

        {tab === "stretch" ? (
        <>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
              <Warehouse className="h-7 w-7 text-emerald-700" />
              Inventario USA · Tarimas
            </h1>
            <p className="mt-1 text-sm text-slate-600">
              Recibe film por medidas y tarimas. El sistema asigna el SKU.
            </p>
            <p className="mt-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              {totals.skus} SKUs · {totals.pallets.toLocaleString()} tarimas en piso
              {stretchCatalog.length > 0
                ? ` · ${stretchCatalog.length} medidas en catálogo`
                : " · catálogo aún no vinculado"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={refresh}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-bold text-slate-700"
            >
              <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />
              Actualizar
            </button>
            <button
              type="button"
              onClick={() => setBulkOpen((open) => !open)}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-sky-600 px-3.5 py-2 text-sm font-bold text-white"
            >
              <Truck className="h-4 w-4" />
              {bulkOpen ? "Ocultar recepción" : "Recibir por medidas"}
            </button>
          </div>
        </div>

        <section className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-sm">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide text-amber-950">
            <PackageCheck className="h-4 w-4" />
            Despacho pendiente ({dispatchQueue.length})
          </h2>
          {dispatchQueue.length === 0 ? (
            <p className="text-sm text-amber-900/80">
              No hay órdenes pagadas por surtir.
            </p>
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
                        {order.lines.map((line) => {
                          const spec = formatStretchSpec({
                            widthInches: line.widthInches,
                            gauge: line.gauge,
                            lengthFeet: line.lengthFeet,
                            application: line.application,
                          });
                          const pallets =
                            line.pallets ??
                            tarimaBreakdown(line.units, line.application, null)
                              .tarimas;
                          return (
                            <li key={`${order.id}-${line.productId}-${line.sku}`}>
                              <span className="font-bold text-slate-800">
                                {pallets} tarima{pallets === 1 ? "" : "s"}
                              </span>
                              {" · "}
                              {spec}
                              {" · "}
                              {line.units} {line.unitLabel}
                              {line.sku ? ` · ${line.sku}` : ""}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => dispatchOrder(order.id)}
                      className="min-h-11 rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Surtido y despachado
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {!warehouseReady ? (
          <div className="rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-950">
            Faltan las tablas del almacén USA. Corre{" "}
            <code className="rounded bg-white px-1 text-xs">
              20261124160000_multi_warehouse_inventory.sql
            </code>{" "}
            en Supabase y actualiza esta página.
          </div>
        ) : null}

        {warehouseReady && stretchCatalog.length === 0 ? (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            El catálogo stretch no cargó medidas desde productos. Los menús
            siguen mostrando tamaños oficiales; al publicar se necesita un
            producto que coincida (ancho / gauge / largo o slug como{" "}
            <code className="text-xs">stretch-film-18-x-80-ga-x-1500ft</code>).
          </div>
        ) : null}

        {bulkOpen ? (
          <section className="rounded-2xl border border-sky-200 bg-sky-50 p-4 shadow-sm">
            <h2 className="text-sm font-black uppercase tracking-wide text-sky-950">
              Recibir por medidas
            </h2>
            <p className="mt-1 text-xs text-sky-900/80">
              Elige tipo → ancho → gauge → largo, indica tarimas y agrega. El
              sistema asigna el SKU del catálogo.
            </p>

            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">
                Tipo de film
                <select
                  value={draft.application}
                  onChange={(event) =>
                    updateDraft({
                      application: event.target.value === "machine" ? "machine" : "hand",
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900"
                >
                  <option value="hand">Manual (hand)</option>
                  <option value="machine">Máquina (machine)</option>
                </select>
              </label>

              <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">
                Ancho (in)
                <select
                  value={draft.widthInches}
                  onChange={(event) => updateDraft({ widthInches: event.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900"
                >
                  <option value="">Elige ancho…</option>
                  {widthOptions.map((value) => (
                    <option key={`w-${value}`} value={String(value)}>
                      {value}&quot;
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">
                Gauge (calibre)
                <select
                  value={draft.gauge}
                  onChange={(event) => updateDraft({ gauge: event.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900"
                >
                  <option value="">Elige gauge…</option>
                  {gaugeOptions.map((value) => (
                    <option key={`g-${value}`} value={String(value)}>
                      {value} GA
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">
                Largo (ft)
                <select
                  value={draft.lengthFeet}
                  onChange={(event) => updateDraft({ lengthFeet: event.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900"
                >
                  <option value="">Elige largo…</option>
                  {lengthOptions.map((value) => (
                    <option key={`l-${value}`} value={String(value)}>
                      {value.toLocaleString()} ft
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">
                Tarimas recibidas
                <input
                  inputMode="numeric"
                  value={draft.pallets}
                  onChange={(event) => updateDraft({ pallets: event.target.value })}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-black text-slate-900"
                />
              </label>

              {draftMatches.length > 1 ? (
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-600">
                  SKU asignado (elige si hay varios)
                  <select
                    value={draft.productId || assignedPreview?.productId || ""}
                    onChange={(event) => updateDraft({ productId: event.target.value })}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-900"
                  >
                    {draftMatches.map((item) => (
                      <option key={item.productId} value={item.productId}>
                        {item.partNumber || item.productName}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>

            <div className="mt-3 rounded-xl border border-sky-200 bg-white px-3 py-3">
              {assignedPreview ? (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-sky-700">
                      SKU que asignará el sistema
                    </div>
                    <div className="text-base font-black text-slate-900">
                      {assignedPreview.partNumber || "SKU pendiente"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {formatStretchSpec(assignedPreview)} · {assignedPreview.productName}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={addReceiveLine}
                    className="min-h-10 rounded-xl bg-sky-700 px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
                  >
                    Agregar a recepción
                  </button>
                </div>
              ) : (
                <p className="text-sm text-slate-600">
                  {stretchCatalog.length === 0
                    ? "No cargó el catálogo stretch. Revisa que los productos tengan ancho, gauge y largo."
                    : "Elige las medidas para ver el SKU que se asignará."}
                </p>
              )}
            </div>

            <label className="mt-3 block text-xs font-semibold text-slate-600">
              Notas
              <input
                value={bulkNotes}
                onChange={(event) => setBulkNotes(event.target.value)}
                placeholder="Trailer / PO / transportista"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              />
            </label>

            {staged.length > 0 ? (
              <div className="mt-3 space-y-2">
                <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Listo para registrar ({staged.length})
                </div>
                {staged.map((line) => (
                  <div
                    key={line.key}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-white px-3 py-2"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900">
                        {line.pallets} tarima{line.pallets === 1 ? "" : "s"} ·{" "}
                        {line.widthInches}&quot; · {line.gauge} GA · {line.lengthFeet} ft
                      </div>
                      <div className="text-xs text-emerald-700">
                        → SKU {line.sku || line.productName}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setStaged((current) => current.filter((item) => item.key !== line.key))
                      }
                      className="text-xs font-bold uppercase text-rose-600"
                    >
                      Quitar
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  disabled={pending}
                  onClick={submitStagedReceive}
                  className="min-h-11 w-full rounded-xl bg-emerald-600 px-4 py-3 text-sm font-black text-white disabled:opacity-50"
                >
                  Registrar{" "}
                  {staged.reduce((sum, line) => sum + line.pallets, 0)} tarima(s) en
                  almacén USA
                </button>
              </div>
            ) : null}
          </section>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-black uppercase tracking-wide text-slate-700">
            Piso stretch film ({filtered.length})
          </h2>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder='Buscar gauge, ancho… ej. "80" o 18"'
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
            const spec = formatStretchSpec(row);
            return (
              <article
                key={row.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      {row.gauge != null ? (
                        <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-black uppercase tracking-wide text-amber-950">
                          {row.gauge} GA
                        </span>
                      ) : null}
                      {row.widthInches != null ? (
                        <span className="rounded-full bg-sky-100 px-2.5 py-1 text-xs font-black text-sky-950">
                          {row.widthInches}&quot; wide
                        </span>
                      ) : null}
                      {row.lengthFeet != null ? (
                        <span className="rounded-full bg-violet-100 px-2.5 py-1 text-xs font-black text-violet-950">
                          {row.lengthFeet.toLocaleString()} ft
                        </span>
                      ) : null}
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                        {row.application === "machine" ? "Máquina" : "Manual"}
                      </span>
                    </div>
                    <h3 className="text-lg font-black tracking-tight text-slate-900">
                      {spec}
                    </h3>
                    <p className="mt-0.5 text-xs font-semibold text-emerald-800">
                      Assigned SKU: {row.partNumber || "—"}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-slate-500">
                      {row.productName || row.productId}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-slate-400">
                      1 pallet = {meta.perTarima} {meta.unitLabel}
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
                  <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-right">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                      Pallets on hand
                    </div>
                    <div className="text-4xl font-black tabular-nums text-slate-900">
                      {meta.tarimas}
                    </div>
                    {meta.loose > 0 ? (
                      <div className="mt-1 text-xs font-semibold text-amber-700">
                        + {meta.loose} loose {meta.unitLabel}
                      </div>
                    ) : (
                      <div className="mt-1 text-xs text-slate-500">
                        {row.stockBoxes.toLocaleString()} {meta.unitLabel} total
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={pending || meta.tarimas < 1}
                    onClick={() => nudgePallets(row, -1)}
                    className="inline-flex h-14 min-w-14 flex-1 items-center justify-center rounded-2xl bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-40 sm:flex-none"
                    aria-label="Quitar tarimas"
                  >
                    <Minus className="h-7 w-7" strokeWidth={3} />
                  </button>
                  <label className="flex flex-col items-center text-[10px] font-bold uppercase text-slate-400">
                    Pallets
                    <input
                      inputMode="numeric"
                      value={stepPalletsById[row.productId] ?? "1"}
                      onChange={(event) =>
                        setStepPalletsById((current) => ({
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
                    onClick={() => nudgePallets(row, 1)}
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
                ? "Aún no hay filas de inventario USA. Aplica la migración multi-warehouse en Supabase."
                : "Ningún film coincide con tu búsqueda."}
            </div>
          ) : null}
        </div>
        </>
        ) : null}
      </div>
    </AdminInventoryShell>
  );
}
