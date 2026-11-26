"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardList,
  Download,
  Plus,
  Printer,
  Search,
  X,
} from "lucide-react";
import {
  adjustBespokeInventoryMovement,
  deleteBespokeInventoryItem,
  setBespokeItemObsolete,
  updateBespokeInventoryCount,
  upsertBespokeInventoryItem,
} from "@/actions/bespoke-inventory";
import {
  BESPOKE_CATEGORIES,
  BESPOKE_CATEGORY_LABELS,
  buildBespokeInventoryCsv,
  computeBespokeWarehouseStats,
  defaultUomForCategory,
  derivePalletCount,
  isBelowMinInventory,
  uomsForCategory,
  type BespokeCategory,
  type BespokeInventoryItem,
  type BespokeUom,
} from "@/lib/bespoke-inventory";
import { useWarehouseLang } from "@/components/admin/inventory/WarehouseLangContext";

type MoveMode = "in" | "out" | "count";

type MoveState = {
  item: BespokeInventoryItem;
  mode: MoveMode;
  quantity: string;
  notes: string;
  countedDate: string;
};

type NewItemState = {
  itemName: string;
  category: BespokeCategory;
  clientName: string;
  clientPartNumber: string;
  unitOfMeasure: BespokeUom;
  unitsPerPalletOrPack: string;
  minInventory: string;
  initialQty: string;
  isObsolete: boolean;
};

const EMPTY_NEW: NewItemState = {
  itemName: "",
  category: "stretch_film",
  clientName: "",
  clientPartNumber: "",
  unitOfMeasure: "RLL",
  unitsPerPalletOrPack: "",
  minInventory: "",
  initialQty: "",
  isObsolete: false,
};

function todayLocal(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatQty(n: number): string {
  if (!Number.isFinite(n)) return "0";
  return Number.isInteger(n)
    ? n.toLocaleString("en-US")
    : n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

const ACTION_BTN =
  "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border text-[11px] font-bold disabled:opacity-40";

export function BespokeInventorySheet({
  items,
  canManageMaster,
  canDelete = false,
}: {
  items: BespokeInventoryItem[];
  canManageMaster: boolean;
  canDelete?: boolean;
}) {
  const router = useRouter();
  const { t } = useWarehouseLang();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [showObsolete, setShowObsolete] = useState(false);
  const [move, setMove] = useState<MoveState | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newItem, setNewItem] = useState<NewItemState>(EMPTY_NEW);
  const [showStats, setShowStats] = useState(false);
  const [editingQtyId, setEditingQtyId] = useState<string | null>(null);
  const [editingQtyValue, setEditingQtyValue] = useState("");

  const stats = useMemo(() => computeBespokeWarehouseStats(items), [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((item) => {
      if (!showObsolete && item.isObsolete) return false;
      if (!q) return true;
      const hay = [
        item.itemName,
        item.clientName,
        item.clientPartNumber,
        item.unitOfMeasure,
        item.countNotes,
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [items, query, showObsolete]);

  const grouped = useMemo(() => {
    const map = new Map<BespokeCategory, BespokeInventoryItem[]>();
    for (const cat of BESPOKE_CATEGORIES) map.set(cat, []);
    for (const item of filtered) {
      map.get(item.category)?.push(item);
    }
    return BESPOKE_CATEGORIES.map((cat) => ({
      category: cat,
      label: BESPOKE_CATEGORY_LABELS[cat],
      rows: map.get(cat) || [],
    })).filter((g) => g.rows.length > 0);
  }, [filtered]);

  function openMove(item: BespokeInventoryItem, mode: MoveMode) {
    setMove({
      item,
      mode,
      quantity: mode === "count" ? String(item.physicalQty) : "",
      notes: "",
      countedDate: item.countedDate || todayLocal(),
    });
  }

  function startEditQty(item: BespokeInventoryItem) {
    setEditingQtyId(item.id);
    setEditingQtyValue(String(item.physicalQty));
  }

  function commitEditQty(item: BespokeInventoryItem) {
    if (editingQtyId !== item.id) return;
    const next = Number(editingQtyValue);
    setEditingQtyId(null);
    if (!Number.isFinite(next) || next < 0 || next === item.physicalQty) return;
    startTransition(async () => {
      const res = await updateBespokeInventoryCount({
        itemId: item.id,
        physicalQty: next,
        countedDate: todayLocal(),
        countNotes: item.countNotes,
      });
      if (!res.ok) {
        toast.error(res.error || t("No se pudo guardar", "Could not save"));
        return;
      }
      toast.success(t("Cant. física actualizada", "Physical qty updated"));
      router.refresh();
    });
  }

  function exportCsv() {
    const csv = buildBespokeInventoryCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lista-inventario-bespoke-usa-${todayLocal()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV listo");
  }

  function submitMove() {
    if (!move) return;
    const qty = Number(move.quantity);
    if (!Number.isFinite(qty) || qty < 0) {
      toast.error("Cantidad inválida");
      return;
    }
    if (move.mode !== "count" && qty <= 0) {
      toast.error("Indica cuánto entra o sale");
      return;
    }

    startTransition(async () => {
      if (move.mode === "count") {
        const res = await updateBespokeInventoryCount({
          itemId: move.item.id,
          physicalQty: qty,
          countedDate: move.countedDate || todayLocal(),
          countNotes: move.notes.trim() || move.item.countNotes,
        });
        if (!res.ok) {
          toast.error(res.error || "No se pudo guardar el conteo");
          return;
        }
        toast.success("Conteo físico guardado");
      } else {
        const res = await adjustBespokeInventoryMovement({
          itemId: move.item.id,
          direction: move.mode,
          quantity: qty,
          notes: move.notes,
        });
        if (!res.ok) {
          toast.error(res.error || "No se pudo registrar el movimiento");
          return;
        }
        toast.success(move.mode === "in" ? "Entrada registrada" : "Salida registrada");
      }
      setMove(null);
      router.refresh();
    });
  }

  function saveNewItem() {
    startTransition(async () => {
      const res = await upsertBespokeInventoryItem({
        itemName: newItem.itemName,
        category: newItem.category,
        clientName: newItem.clientName,
        clientPartNumber: newItem.isObsolete
          ? "OBSOLETO"
          : newItem.clientPartNumber,
        unitOfMeasure: newItem.unitOfMeasure,
        unitsPerPalletOrPack: Number(newItem.unitsPerPalletOrPack) || 0,
        minInventory: Number(newItem.minInventory) || 0,
        isObsolete: newItem.isObsolete,
      });
      if (!res.ok || !res.item) {
        toast.error(res.error || "No se pudo agregar");
        return;
      }

      const initialQty = Number(newItem.initialQty);
      if (Number.isFinite(initialQty) && initialQty > 0) {
        const countRes = await updateBespokeInventoryCount({
          itemId: res.item.id,
          physicalQty: initialQty,
          countedDate: todayLocal(),
          countNotes: "Cantidad inicial al agregar",
        });
        if (!countRes.ok) {
          toast.error(
            countRes.error ||
              "Artículo creado, pero no se pudo guardar la cantidad inicial"
          );
          setAddOpen(false);
          setNewItem(EMPTY_NEW);
          router.refresh();
          return;
        }
      }

      toast.success(
        initialQty > 0
          ? "Artículo agregado con cantidad en piso"
          : "Artículo agregado a la lista"
      );
      setAddOpen(false);
      setNewItem(EMPTY_NEW);
      router.refresh();
    });
  }

  function toggleObsolete(item: BespokeInventoryItem) {
    startTransition(async () => {
      const res = await setBespokeItemObsolete(item.id, !item.isObsolete);
      if (!res.ok) {
        toast.error(res.error || "No se pudo actualizar");
        return;
      }
      toast.success(item.isObsolete ? "Artículo reactivado" : "Marcado OBSOLETO");
      router.refresh();
    });
  }

  function removeItem(item: BespokeInventoryItem) {
    if (!canDelete) return;
    if (!window.confirm(`¿Eliminar “${item.itemName}” de la lista?`)) return;
    startTransition(async () => {
      const res = await deleteBespokeInventoryItem(item.id);
      if (!res.ok) {
        toast.error(res.error || "No se pudo eliminar");
        return;
      }
      toast.success("Artículo eliminado");
      router.refresh();
    });
  }

  const previewPallets =
    move && move.mode === "count"
      ? derivePalletCount(
          Number(move.quantity) || 0,
          move.item.unitsPerPalletOrPack
        )
      : null;

  return (
    <div className="space-y-4 print:space-y-3">
      <div className="flex flex-col gap-3 border-b border-slate-300 pb-4 print:border-black">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
              {t("Almacén USA", "USA Warehouse")}
            </p>
            <h2 className="mt-1 flex items-center gap-2 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
              <ClipboardList className="h-6 w-6 shrink-0 text-emerald-700 print:hidden" />
              <span>
                {t(
                  "LISTA DE ARTICULOS INVENTARIO BESPOKE",
                  "BESPOKE INVENTORY ITEM LIST"
                )}
              </span>
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-slate-600">
              {t(
                "Actualiza el inventario aquí: Agregar artículo, Entrada, Salida o Conteo.",
                "Update inventory here: Add item, In, Out, or Count."
              )}
            </p>
          </div>
          <div className="print:hidden flex flex-wrap items-center gap-2 lg:justify-end">
            {canManageMaster ? (
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 text-xs font-bold text-white hover:bg-emerald-700"
              >
                <Plus className="h-3.5 w-3.5" />
                {t("Agregar artículo", "Add item")}
              </button>
            ) : null}
            <button
              type="button"
              onClick={exportCsv}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <Download className="h-3.5 w-3.5" />
              {t("Exportar CSV", "Export CSV")}
            </button>
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
            >
              <Printer className="h-3.5 w-3.5" />
              {t("Imprimir", "Print")}
            </button>
          </div>
        </div>

        <div className="print:hidden flex flex-col gap-2 sm:flex-row sm:items-center">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t(
                "Buscar artículo, cliente o parte…",
                "Search item, client, or part #"
              )}
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </label>
          <label className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-xs font-semibold text-slate-700">
            <input
              type="checkbox"
              checked={showObsolete}
              onChange={(e) => setShowObsolete(e.target.checked)}
            />
            {t("Mostrar OBSOLETO", "Show OBSOLETE")}
          </label>
          <button
            type="button"
            onClick={() => setShowStats((v) => !v)}
            className="inline-flex h-10 shrink-0 items-center rounded-lg border border-slate-300 bg-white px-3 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            {showStats
              ? t("Ocultar resumen", "Hide summary")
              : t("Ver resumen", "Show summary")}
          </button>
        </div>
      </div>

      {showStats && items.length > 0 ? (
        <div className="print:hidden grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
          {[
            {
              label: t("Artículos", "Items"),
              value: formatQty(stats.activeSkus),
            },
            {
              label: t("Clientes", "Clients"),
              value: formatQty(stats.clients),
            },
            {
              label: t("Cant. física", "Physical qty"),
              value: formatQty(stats.totalPhysicalQty),
            },
            {
              label: t("Tarimas", "Pallets"),
              value: formatQty(stats.totalPallets),
            },
            {
              label: t("Bajo mín", "Below min"),
              value: formatQty(stats.lowStockSkus),
              warn: stats.lowStockSkus > 0,
            },
            {
              label: t("Sin stock", "Zero stock"),
              value: formatQty(stats.zeroStockSkus),
              warn: stats.zeroStockSkus > 0,
            },
          ].map((card) => (
            <div
              key={card.label}
              className={`border px-3 py-2 ${
                card.warn
                  ? "border-amber-400 bg-amber-50"
                  : "border-slate-300 bg-white"
              }`}
            >
              <p className="text-[10px] font-bold uppercase text-slate-500">
                {card.label}
              </p>
              <p className="text-lg font-black tabular-nums text-slate-900">
                {card.value}
              </p>
            </div>
          ))}
        </div>
      ) : null}

      {items.length === 0 ? (
        <div className="rounded-xl border border-slate-300 bg-white px-4 py-10 text-center">
          <p className="text-sm font-bold text-slate-800">
            {t(
              "Aún no hay artículos en inventario",
              "No inventory items yet"
            )}
          </p>
          <p className="mx-auto mt-1 max-w-lg text-xs text-slate-600">
            {t(
              "Usa Agregar artículo para cargar productos nuevos.",
              "Use Add item to load new products."
            )}
          </p>
          {canManageMaster ? (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="mt-4 inline-flex h-10 items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 text-xs font-bold text-white hover:bg-emerald-700"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("Agregar artículo", "Add item")}
            </button>
          ) : null}
        </div>
      ) : grouped.length === 0 ? (
        <div className="rounded-xl border border-slate-300 bg-white px-4 py-8 text-center text-sm text-slate-600">
          {t(
            "Ningún renglón con ese filtro.",
            "No rows match this filter."
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map((group) => (
            <section
              key={group.category}
              className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm print:break-inside-avoid print:shadow-none"
            >
              <div className="border-b border-slate-300 bg-slate-100 px-3 py-2.5">
                <h3 className="text-xs font-black uppercase tracking-wide text-slate-800">
                  {group.label}
                  <span className="ml-2 font-semibold text-slate-500">
                    ({group.rows.length})
                  </span>
                </h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] border-collapse text-[12px]">
                  <thead>
                    <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-700">
                      <th className="w-10 border border-slate-300 px-2 py-2 text-center">
                        #
                      </th>
                      <th className="border border-slate-300 px-2 py-2 text-left">
                        {t("Artículo", "Item")}
                      </th>
                      <th className="border border-slate-300 px-2 py-2 text-left">
                        {t("Cliente", "Client")}
                      </th>
                      <th className="border border-slate-300 px-2 py-2 text-left">
                        {t("No. parte cliente", "Client part #")}
                      </th>
                      <th className="w-16 border border-slate-300 px-2 py-2 text-center">
                        {t("U. medida", "UOM")}
                      </th>
                      <th className="w-24 border border-slate-300 px-2 py-2 text-right">
                        {t("Cant x tarima", "Qty / pallet")}
                      </th>
                      <th className="w-20 border border-slate-300 px-2 py-2 text-right">
                        {t("Inv mín", "Min inv")}
                      </th>
                      <th className="w-24 border border-slate-300 px-2 py-2 text-right">
                        {t("Cant física", "Physical qty")}
                      </th>
                      <th className="w-20 border border-slate-300 px-2 py-2 text-right">
                        {t("Tarimas", "Pallets")}
                      </th>
                      <th className="w-[176px] border border-slate-300 px-2 py-2 text-center print:hidden">
                        {t("Movimiento", "Move")}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.rows.map((item, idx) => {
                      const low = isBelowMinInventory(item);
                      const pallets =
                        item.palletCount > 0
                          ? item.palletCount
                          : derivePalletCount(
                              item.physicalQty,
                              item.unitsPerPalletOrPack
                            );
                      const editing = editingQtyId === item.id;
                      const cellBg = item.isObsolete
                        ? "bg-slate-50 text-slate-400"
                        : low
                          ? "bg-amber-50"
                          : "bg-white";
                      return (
                        <tr key={item.id}>
                          <td
                            className={`border border-slate-300 px-2 py-2 text-center tabular-nums text-slate-500 ${cellBg}`}
                          >
                            {idx + 1}
                          </td>
                          <td
                            className={`border border-slate-300 px-2 py-2 font-semibold text-slate-900 ${cellBg}`}
                          >
                            <span className="line-clamp-2">{item.itemName}</span>
                            {item.isObsolete ? (
                              <span className="ml-1 text-[9px] font-bold uppercase text-slate-500">
                                OBSOLETO
                              </span>
                            ) : null}
                            {low && !item.isObsolete ? (
                              <span className="ml-1 text-[9px] font-bold uppercase text-amber-800">
                                {t("BAJO MÍN", "LOW")}
                              </span>
                            ) : null}
                          </td>
                          <td
                            className={`border border-slate-300 px-2 py-2 text-slate-800 ${cellBg}`}
                          >
                            <span className="line-clamp-2">
                              {item.clientName || "—"}
                            </span>
                          </td>
                          <td
                            className={`border border-slate-300 px-2 py-2 font-mono text-[11px] ${cellBg}`}
                          >
                            {item.isObsolete
                              ? "OBSOLETO"
                              : item.clientPartNumber || "—"}
                          </td>
                          <td
                            className={`border border-slate-300 px-2 py-2 text-center font-mono text-[11px] font-bold ${cellBg}`}
                          >
                            {item.unitOfMeasure}
                          </td>
                          <td
                            className={`border border-slate-300 px-2 py-2 text-right tabular-nums ${cellBg}`}
                          >
                            {item.unitsPerPalletOrPack > 0
                              ? formatQty(item.unitsPerPalletOrPack)
                              : "—"}
                          </td>
                          <td
                            className={`border border-slate-300 px-2 py-2 text-right tabular-nums ${cellBg}`}
                          >
                            {item.minInventory > 0
                              ? formatQty(item.minInventory)
                              : "—"}
                          </td>
                          <td
                            className={`border border-slate-300 px-1 py-1.5 text-right ${cellBg}`}
                            onDoubleClick={() => {
                              if (!item.isObsolete) startEditQty(item);
                            }}
                          >
                            {editing ? (
                              <input
                                autoFocus
                                type="number"
                                min={0}
                                step="any"
                                value={editingQtyValue}
                                onChange={(e) =>
                                  setEditingQtyValue(e.target.value)
                                }
                                onBlur={() => commitEditQty(item)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.currentTarget.blur();
                                  }
                                  if (e.key === "Escape") {
                                    setEditingQtyId(null);
                                  }
                                }}
                                className="w-full rounded-md border border-emerald-400 bg-white px-1.5 py-1 text-right text-sm font-bold outline-none ring-2 ring-emerald-500/30"
                              />
                            ) : (
                              <button
                                type="button"
                                disabled={pending || item.isObsolete}
                                onClick={() => startEditQty(item)}
                                className="w-full rounded-md px-1.5 py-1 text-right font-bold tabular-nums text-slate-900 hover:bg-emerald-50 disabled:opacity-50"
                                title={t(
                                  "Clic para editar cant. física",
                                  "Click to edit physical qty"
                                )}
                              >
                                {formatQty(item.physicalQty)}
                              </button>
                            )}
                          </td>
                          <td
                            className={`border border-slate-300 px-2 py-2 text-right tabular-nums text-slate-700 ${cellBg}`}
                          >
                            {pallets > 0 ? formatQty(pallets) : "—"}
                          </td>
                          <td
                            className={`border border-slate-300 px-1.5 py-1.5 print:hidden ${cellBg}`}
                          >
                            <div
                              className={`mx-auto flex items-center justify-center gap-1 ${
                                canDelete ? "w-[168px]" : "w-[136px]"
                              }`}
                            >
                              <button
                                type="button"
                                disabled={pending || item.isObsolete}
                                onClick={() => openMove(item, "in")}
                                className={`${ACTION_BTN} border-sky-200 bg-sky-50 text-sky-800 hover:bg-sky-100`}
                                title={t("Entrada", "In")}
                                aria-label={t("Entrada", "In")}
                              >
                                <ArrowDownToLine className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={pending || item.isObsolete}
                                onClick={() => openMove(item, "out")}
                                className={`${ACTION_BTN} border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100`}
                                title={t("Salida", "Out")}
                                aria-label={t("Salida", "Out")}
                              >
                                <ArrowUpFromLine className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => openMove(item, "count")}
                                className={`${ACTION_BTN} border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100`}
                                title={t("Conteo", "Count")}
                                aria-label={t("Conteo", "Count")}
                              >
                                Σ
                              </button>
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => toggleObsolete(item)}
                                className={`${ACTION_BTN} border-slate-200 bg-white text-slate-600 hover:bg-slate-100`}
                                title={
                                  item.isObsolete
                                    ? t("Reactivar", "Restore")
                                    : t("Obsoleto", "Obsolete")
                                }
                                aria-label={
                                  item.isObsolete
                                    ? t("Reactivar", "Restore")
                                    : t("Obsoleto", "Obsolete")
                                }
                              >
                                Ø
                              </button>
                              {canDelete ? (
                                <button
                                  type="button"
                                  disabled={pending}
                                  onClick={() => removeItem(item)}
                                  className={`${ACTION_BTN} border-red-200 bg-red-50 text-red-700 hover:bg-red-100`}
                                  title={t("Borrar", "Delete")}
                                  aria-label={t("Borrar", "Delete")}
                                >
                                  ×
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
        </div>
      )}

      {move ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center print:hidden">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <h4 className="font-bold text-slate-900">
                  {move.mode === "in"
                    ? "Entrada al almacén"
                    : move.mode === "out"
                      ? "Salida del almacén"
                      : "Conteo físico"}
                </h4>
                <p className="text-xs text-slate-500 line-clamp-2">
                  {move.item.itemName}
                  {move.item.clientName ? ` · ${move.item.clientName}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setMove(null)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 px-4 py-4">
              <p className="rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600">
                En piso ahora:{" "}
                <strong>
                  {formatQty(move.item.physicalQty)} {move.item.unitOfMeasure}
                </strong>
              </p>
              <label className="block text-xs font-bold text-slate-600">
                {move.mode === "count"
                  ? "Cantidad física (lo que hay hoy)"
                  : move.mode === "in"
                    ? "Cantidad que entra"
                    : "Cantidad que sale"}
                <input
                  type="number"
                  min={0}
                  step="any"
                  autoFocus
                  value={move.quantity}
                  onChange={(e) =>
                    setMove({ ...move, quantity: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
                />
              </label>
              {move.mode === "count" ? (
                <label className="block text-xs font-bold text-slate-600">
                  Fecha de conteo
                  <input
                    type="date"
                    value={move.countedDate}
                    onChange={(e) =>
                      setMove({ ...move, countedDate: e.target.value })
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </label>
              ) : null}
              {previewPallets != null && move.item.unitsPerPalletOrPack > 0 ? (
                <p className="text-xs text-slate-500">
                  ≈ {formatQty(previewPallets)} tarima
                  {previewPallets === 1 ? "" : "s"} (según cant. x tarima)
                </p>
              ) : null}
              <label className="block text-xs font-bold text-slate-600">
                Nota (opcional)
                <input
                  value={move.notes}
                  onChange={(e) => setMove({ ...move, notes: e.target.value })}
                  placeholder="Ej. trailer, PO, same inv, no movimientos…"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
              <button
                type="button"
                onClick={() => setMove(null)}
                className="rounded-xl px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={submitMove}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {pending ? "Guardando…" : "Guardar"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {addOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center print:hidden">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <h4 className="font-bold text-slate-900">
                  {t("Agregar artículo", "Add item")}
                </h4>
                <p className="text-xs text-slate-500">
                  {t(
                    "Úsalo cuando llegue un producto nuevo. Luego actualizas con Entrada / Salida / Conteo.",
                    "Use when a new product arrives. Then update with In / Out / Count."
                  )}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-3 px-4 py-4 sm:grid-cols-2">
              <label className="block text-xs font-bold text-slate-600 sm:col-span-2">
                Artículo
                <input
                  value={newItem.itemName}
                  onChange={(e) =>
                    setNewItem({ ...newItem, itemName: e.target.value })
                  }
                  placeholder='Ej. STRETCH FILM 18" X 80 X 1500FT'
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-bold text-slate-600">
                Sección
                <select
                  value={newItem.category}
                  onChange={(e) => {
                    const category = e.target.value as BespokeCategory;
                    const allowed = uomsForCategory(category);
                    setNewItem({
                      ...newItem,
                      category,
                      unitOfMeasure: allowed.includes(newItem.unitOfMeasure)
                        ? newItem.unitOfMeasure
                        : defaultUomForCategory(category),
                    });
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  {BESPOKE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {BESPOKE_CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-bold text-slate-600">
                Unidad de medida
                <select
                  value={newItem.unitOfMeasure}
                  onChange={(e) =>
                    setNewItem({
                      ...newItem,
                      unitOfMeasure: e.target.value as BespokeUom,
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                >
                  {uomsForCategory(newItem.category).map((u) => (
                    <option key={u} value={u}>
                      {u}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-xs font-bold text-slate-600">
                Cliente
                <input
                  value={newItem.clientName}
                  onChange={(e) =>
                    setNewItem({ ...newItem, clientName: e.target.value })
                  }
                  placeholder="Ej. TERREPOWER SPARTA"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-bold text-slate-600">
                No. parte cliente
                <input
                  value={newItem.clientPartNumber}
                  disabled={newItem.isObsolete}
                  onChange={(e) =>
                    setNewItem({ ...newItem, clientPartNumber: e.target.value })
                  }
                  placeholder="Ej. 405500"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm disabled:bg-slate-50"
                />
              </label>
              <label className="block text-xs font-bold text-slate-600">
                Cant x tarima / paq
                <input
                  type="number"
                  min={0}
                  value={newItem.unitsPerPalletOrPack}
                  onChange={(e) =>
                    setNewItem({
                      ...newItem,
                      unitsPerPalletOrPack: e.target.value,
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-bold text-slate-600">
                Inv mín
                <input
                  type="number"
                  min={0}
                  value={newItem.minInventory}
                  onChange={(e) =>
                    setNewItem({ ...newItem, minInventory: e.target.value })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-bold text-slate-600 sm:col-span-2">
                {t(
                  "Cant. física inicial (si ya llegó)",
                  "Initial physical qty (if already on floor)"
                )}
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={newItem.initialQty}
                  onChange={(e) =>
                    setNewItem({ ...newItem, initialQty: e.target.value })
                  }
                  placeholder="0"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-bold text-slate-700 sm:col-span-2">
                <input
                  type="checkbox"
                  checked={newItem.isObsolete}
                  onChange={(e) =>
                    setNewItem({ ...newItem, isObsolete: e.target.checked })
                  }
                />
                Marcar como OBSOLETO
              </label>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="rounded-xl px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={pending || !newItem.itemName.trim()}
                onClick={saveNewItem}
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {pending ? "Guardando…" : "Agregar a la lista"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}
