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
  BESPOKE_UOMS,
  buildBespokeInventoryCsv,
  derivePalletCount,
  isBelowMinInventory,
  type BespokeCategory,
  type BespokeInventoryItem,
  type BespokeUom,
} from "@/lib/bespoke-inventory";

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
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [showObsolete, setShowObsolete] = useState(false);
  const [move, setMove] = useState<MoveState | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [newItem, setNewItem] = useState<NewItemState>(EMPTY_NEW);

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
      if (!res.ok) {
        toast.error(res.error || "No se pudo agregar");
        return;
      }
      toast.success("Artículo agregado a la lista");
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
    <div className="space-y-5 print:space-y-3">
      <div className="flex flex-col gap-3 border-b border-slate-300 pb-4 sm:flex-row sm:items-end sm:justify-between print:border-black">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
            USA Warehouse
          </p>
          <h2 className="mt-1 flex items-center gap-2 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
            <ClipboardList className="h-6 w-6 text-emerald-700 print:hidden" />
            LISTA DE ARTICULOS INVENTARIO BESPOKE
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            Misma hoja del almacén: artículo, cliente, parte, unidad, cant. x
            tarima, inv. mín. y cant. física. Registra entradas, salidas o
            conteo.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600">
            Fecha: {todayLocal()}
          </span>
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <Printer className="h-3.5 w-3.5" />
            Imprimir
          </button>
          {canManageMaster ? (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
            >
              <Plus className="h-3.5 w-3.5" />
              Agregar artículo
            </button>
          ) : null}
        </div>
      </div>

      <div className="print:hidden flex flex-col gap-2 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar artículo, cliente o no. de parte…"
            className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
          />
        </label>
        <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700">
          <input
            type="checkbox"
            checked={showObsolete}
            onChange={(e) => setShowObsolete(e.target.checked)}
          />
          Mostrar OBSOLETO
        </label>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-14 text-center">
          <p className="text-base font-bold text-slate-800">
            La lista está vacía
          </p>
          <p className="mt-2 text-sm text-slate-600 max-w-md mx-auto">
            Agrega los mismos renglones de tu hoja de papel (stretch film, foam,
            esquineros). Después solo registras entradas, salidas o el conteo
            físico.
          </p>
          {canManageMaster ? (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="mt-5 inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700"
            >
              <Plus className="h-4 w-4" />
              Agregar primer artículo
            </button>
          ) : null}
        </div>
      ) : grouped.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-6 py-10 text-center text-sm text-slate-600">
          No hay renglones con ese filtro.
        </div>
      ) : (
        grouped.map((group) => (
          <section key={group.category} className="space-y-2 break-inside-avoid">
            {group.category !== "stretch_film" ? (
              <h3 className="px-1 text-sm font-black uppercase tracking-wide text-slate-800">
                {group.label}
              </h3>
            ) : null}
            <div className="overflow-x-auto rounded-xl border border-slate-300 bg-white print:rounded-none print:border-black">
              <table className="min-w-full border-collapse text-left text-[13px]">
                <thead>
                  <tr className="bg-slate-100 text-[10px] uppercase tracking-wide text-slate-700 print:bg-white">
                    <th className="border-b border-slate-300 px-2.5 py-2 font-bold">
                      Artículo
                    </th>
                    <th className="border-b border-slate-300 px-2.5 py-2 font-bold">
                      Cliente
                    </th>
                    <th className="border-b border-slate-300 px-2.5 py-2 font-bold">
                      No. parte cliente
                    </th>
                    <th className="border-b border-slate-300 px-2.5 py-2 font-bold text-center">
                      Unidad de medida
                    </th>
                    <th className="border-b border-slate-300 px-2.5 py-2 font-bold text-right">
                      Cant x tarima / paq
                    </th>
                    <th className="border-b border-slate-300 px-2.5 py-2 font-bold text-right">
                      Inv mín
                    </th>
                    <th className="border-b border-slate-300 px-2.5 py-2 font-bold text-right">
                      Cant física
                    </th>
                    <th className="border-b border-slate-300 px-2.5 py-2 font-bold text-right print:hidden">
                      Movimiento
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((item) => {
                    const low = isBelowMinInventory(item);
                    const pallets =
                      item.palletCount > 0
                        ? item.palletCount
                        : derivePalletCount(
                            item.physicalQty,
                            item.unitsPerPalletOrPack
                          );
                    return (
                      <tr
                        key={item.id}
                        className={[
                          "border-b border-slate-200 last:border-b-0",
                          item.isObsolete ? "bg-slate-50 text-slate-400" : "",
                          low && !item.isObsolete ? "bg-amber-50" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        <td className="px-2.5 py-2 align-top font-semibold text-slate-900">
                          {item.itemName}
                          {item.isObsolete ? (
                            <span className="ml-2 inline-block rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-bold uppercase text-slate-600">
                              Obsoleto
                            </span>
                          ) : null}
                          {low && !item.isObsolete ? (
                            <span className="ml-2 inline-block rounded bg-amber-200 px-1.5 py-0.5 text-[9px] font-bold uppercase text-amber-950">
                              Bajo mín
                            </span>
                          ) : null}
                        </td>
                        <td className="px-2.5 py-2 align-top text-slate-800">
                          {item.clientName || "—"}
                        </td>
                        <td className="px-2.5 py-2 align-top font-mono text-xs text-slate-700">
                          {item.isObsolete
                            ? "OBSOLETO"
                            : item.clientPartNumber || "—"}
                        </td>
                        <td className="px-2.5 py-2 align-top text-center font-mono text-xs font-bold">
                          {item.unitOfMeasure}
                        </td>
                        <td className="px-2.5 py-2 align-top text-right tabular-nums">
                          {item.unitsPerPalletOrPack > 0
                            ? formatQty(item.unitsPerPalletOrPack)
                            : "—"}
                        </td>
                        <td className="px-2.5 py-2 align-top text-right tabular-nums">
                          {item.minInventory > 0
                            ? formatQty(item.minInventory)
                            : "—"}
                        </td>
                        <td className="px-2.5 py-2 align-top text-right">
                          <div className="font-black tabular-nums text-slate-900">
                            {formatQty(item.physicalQty)}
                          </div>
                          {pallets > 0 ? (
                            <div className="text-[10px] font-bold uppercase text-slate-500">
                              {formatQty(pallets)} pallet
                              {pallets === 1 ? "" : "s"}
                            </div>
                          ) : null}
                          {item.countedDate ? (
                            <div className="text-[10px] text-slate-400">
                              {item.countedDate}
                            </div>
                          ) : null}
                        </td>
                        <td className="px-2.5 py-2 align-top print:hidden">
                          <div className="flex flex-wrap gap-1">
                            <button
                              type="button"
                              disabled={pending || item.isObsolete}
                              onClick={() => openMove(item, "in")}
                              className="inline-flex items-center gap-1 rounded-lg bg-sky-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-sky-700 disabled:opacity-40"
                              title="Entrada"
                            >
                              <ArrowDownToLine className="h-3 w-3" />
                              Entrada
                            </button>
                            <button
                              type="button"
                              disabled={pending || item.isObsolete}
                              onClick={() => openMove(item, "out")}
                              className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2 py-1 text-[10px] font-bold text-white hover:bg-rose-700 disabled:opacity-40"
                              title="Salida"
                            >
                              <ArrowUpFromLine className="h-3 w-3" />
                              Salida
                            </button>
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => openMove(item, "count")}
                              className="rounded-lg border border-emerald-300 bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-900 hover:bg-emerald-100 disabled:opacity-40"
                            >
                              Conteo
                            </button>
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => toggleObsolete(item)}
                              className="rounded-lg border border-slate-200 px-2 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                            >
                              {item.isObsolete ? "Reactivar" : "Obsoleto"}
                            </button>
                            {canDelete ? (
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => removeItem(item)}
                                className="rounded-lg border border-red-200 px-2 py-1 text-[10px] font-bold text-red-700 hover:bg-red-50 disabled:opacity-40"
                              >
                                Borrar
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
        ))
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
              <h4 className="font-bold text-slate-900">
                Agregar artículo a la lista
              </h4>
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
                  onChange={(e) =>
                    setNewItem({
                      ...newItem,
                      category: e.target.value as BespokeCategory,
                    })
                  }
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
                  {BESPOKE_UOMS.map((u) => (
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
