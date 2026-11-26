"use client";

import { useCallback, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ClipboardList,
  Download,
  FileSpreadsheet,
  Plus,
  Printer,
  Search,
  Upload,
  X,
} from "lucide-react";
import {
  adjustBespokeInventoryMovement,
  deleteBespokeInventoryItem,
  importBespokeInventoryFromRows,
  setBespokeItemObsolete,
  updateBespokeInventoryCount,
  upsertBespokeInventoryItem,
  type BespokeImportBatch,
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
import {
  buildBespokeImportTemplateCsv,
  parseBespokeInventoryWorkbook,
} from "@/lib/bespoke-excel-import";
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

type ColKey =
  | "num"
  | "item"
  | "client"
  | "part"
  | "uom"
  | "perPallet"
  | "minInv"
  | "physical"
  | "pallets"
  | "move";

const DEFAULT_COL_WIDTHS: Record<ColKey, number> = {
  num: 40,
  item: 200,
  client: 120,
  part: 100,
  uom: 64,
  perPallet: 88,
  minInv: 72,
  physical: 96,
  pallets: 72,
  move: 168,
};

export function BespokeInventorySheet({
  items,
  importBatches = [],
  canManageMaster,
  canDelete = false,
}: {
  items: BespokeInventoryItem[];
  importBatches?: BespokeImportBatch[];
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
  const [importOpen, setImportOpen] = useState(false);
  const [importDate, setImportDate] = useState(todayLocal());
  const [importFileName, setImportFileName] = useState("");
  const [importPreviewCount, setImportPreviewCount] = useState(0);
  const [importDetectedColumns, setImportDetectedColumns] = useState<string[]>(
    []
  );
  const [importSheetName, setImportSheetName] = useState("");
  const [pendingRows, setPendingRows] = useState<
    ReturnType<typeof parseBespokeInventoryWorkbook>["rows"] | null
  >(null);
  const [newItem, setNewItem] = useState<NewItemState>(EMPTY_NEW);
  const [showStats, setShowStats] = useState(false);
  const [editingQtyId, setEditingQtyId] = useState<string | null>(null);
  const [editingQtyValue, setEditingQtyValue] = useState("");
  const [colWidths, setColWidths] = useState(DEFAULT_COL_WIDTHS);
  const [tableHeight, setTableHeight] = useState(520);
  const resizeRef = useRef<{
    key: ColKey;
    startX: number;
    startW: number;
  } | null>(null);
  const heightDragRef = useRef<{ startY: number; startH: number } | null>(
    null
  );

  const onColResizeStart = useCallback(
    (key: ColKey, clientX: number) => {
      resizeRef.current = {
        key,
        startX: clientX,
        startW: colWidths[key],
      };
      const onMove = (e: MouseEvent) => {
        const drag = resizeRef.current;
        if (!drag) return;
        const next = Math.max(56, drag.startW + (e.clientX - drag.startX));
        setColWidths((prev) => ({ ...prev, [drag.key]: next }));
      };
      const onUp = () => {
        resizeRef.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [colWidths]
  );

  const onHeightResizeStart = useCallback(
    (clientY: number) => {
      heightDragRef.current = { startY: clientY, startH: tableHeight };
      const onMove = (e: MouseEvent) => {
        const drag = heightDragRef.current;
        if (!drag) return;
        setTableHeight(
          Math.max(280, Math.min(900, drag.startH + (e.clientY - drag.startY)))
        );
      };
      const onUp = () => {
        heightDragRef.current = null;
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
      };
      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [tableHeight]
  );

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

  function downloadTemplate() {
    const csv = buildBespokeImportTemplateCsv();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla-inventario-bespoke-usa.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function onPickImportFile(file: File | null) {
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (!/\.(xlsx|xls|csv|txt)$/.test(lower)) {
      toast.error(t("Sube un Excel (.xlsx) o CSV", "Upload Excel (.xlsx) or CSV"));
      return;
    }
    try {
      const buffer = await file.arrayBuffer();
      const parsed = parseBespokeInventoryWorkbook(buffer, file.name);
      setImportDetectedColumns(parsed.detectedColumns || []);
      setImportSheetName(parsed.sheetName || "");
      if (parsed.errors.length && !parsed.rows.length) {
        toast.error(parsed.errors[0]);
        setPendingRows(null);
        setImportPreviewCount(0);
        setImportFileName("");
        return;
      }
      if (parsed.errors.length) {
        toast.message(parsed.errors[0]);
      }
      setPendingRows(parsed.rows);
      setImportPreviewCount(parsed.rows.length);
      setImportFileName(file.name);
      const clientsFound = new Set(
        parsed.rows.map((r) => r.clientName.trim()).filter(Boolean)
      ).size;
      toast.success(
        t(
          `${parsed.rows.length} renglones · ${clientsFound} clientes`,
          `${parsed.rows.length} rows · ${clientsFound} clients`
        )
      );
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : t("No se pudo leer el archivo", "Could not read file");
      toast.error(message);
    }
  }

  function confirmImport() {
    if (!pendingRows?.length) {
      toast.error("Primero elige un archivo Excel/CSV");
      return;
    }
    startTransition(async () => {
      const res = await importBespokeInventoryFromRows({
        rows: pendingRows,
        countedDate: importDate || todayLocal(),
        fileName: importFileName || "import.xlsx",
      });
      if (!res.ok) {
        toast.error(res.error || "No se pudo importar");
        return;
      }
      toast.success(
        `Guardado por fecha ${importDate}: +${res.created || 0} nuevos, ${res.updated || 0} actualizados`
      );
      setImportOpen(false);
      setPendingRows(null);
      setImportPreviewCount(0);
      setImportFileName("");
      router.refresh();
    });
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
    <div className="space-y-5 print:space-y-3">
      <div className="flex flex-col gap-3 border-b border-slate-300 pb-4 sm:flex-row sm:items-end sm:justify-between print:border-black">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500">
            {t("Almacén USA", "USA Warehouse")}
          </p>
          <h2 className="mt-1 flex items-center gap-2 text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
            <ClipboardList className="h-6 w-6 text-emerald-700 print:hidden" />
            {t(
              "LISTA DE ARTICULOS INVENTARIO BESPOKE",
              "BESPOKE INVENTORY ITEM LIST"
            )}
          </h2>
          <p className="mt-1 text-sm text-slate-600">
            {t(
              "El inventario se actualiza aquí: producto nuevo, entradas, salidas y conteos. El Excel solo sirve para una carga inicial.",
              "Update inventory here: new items, receipts, shipments, and counts. Excel is only for an initial load."
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          {canManageMaster ? (
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-emerald-700"
            >
              <Plus className="h-3.5 w-3.5" />
              {t("Agregar artículo", "Add item")}
            </button>
          ) : null}
          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            {t("Exportar CSV", "Export CSV")}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            <Printer className="h-3.5 w-3.5" />
            {t("Imprimir", "Print")}
          </button>
          {canManageMaster ? (
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
              title={t(
                "Opcional: carga inicial o respaldo",
                "Optional: initial load or backup"
              )}
            >
              <Upload className="h-3.5 w-3.5" />
              {t("Carga Excel (opcional)", "Excel load (optional)")}
            </button>
          ) : null}
        </div>
      </div>

      <div className="print:hidden rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-3 sm:px-4">
        <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-900">
          {t("Flujo del almacén", "Warehouse flow")}
        </p>
        <ol className="mt-2 grid gap-2 text-xs text-emerald-950 sm:grid-cols-2 lg:grid-cols-4">
          <li className="rounded-lg bg-white/80 px-3 py-2 border border-emerald-100">
            <span className="font-black text-emerald-700">1.</span>{" "}
            {t(
              "Llega un producto nuevo → Agregar artículo (+ cant. si ya está en piso).",
              "New product arrives → Add item (+ qty if already on floor)."
            )}
          </li>
          <li className="rounded-lg bg-white/80 px-3 py-2 border border-emerald-100">
            <span className="font-black text-emerald-700">2.</span>{" "}
            {t(
              "Entra más de lo mismo → Entrada en esa fila.",
              "More of the same arrives → Receipt on that row."
            )}
          </li>
          <li className="rounded-lg bg-white/80 px-3 py-2 border border-emerald-100">
            <span className="font-black text-emerald-700">3.</span>{" "}
            {t(
              "Sale mercancía → Salida en esa fila.",
              "Goods leave → Shipment on that row."
            )}
          </li>
          <li className="rounded-lg bg-white/80 px-3 py-2 border border-emerald-100">
            <span className="font-black text-emerald-700">4.</span>{" "}
            {t(
              "Conteo físico → Conteo o editar Cant. física.",
              "Physical count → Count or edit Physical qty."
            )}
          </li>
        </ol>
      </div>

      <div className="print:hidden flex flex-col gap-2 lg:flex-row lg:items-center">
        <label className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t(
              "Buscar artículo, cliente o parte…",
              "Search item, client, or part #"
            )}
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700">
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
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
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

      <div className="rounded-xl border border-slate-300 bg-white shadow-sm print:rounded-none print:border-black print:shadow-none">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 bg-slate-50 px-3 py-2.5 print:bg-white">
          <p className="text-sm font-bold text-slate-800">
            {t("Lista de inventario", "Inventory list")}
          </p>
          <p className="hidden text-[11px] text-slate-500 sm:block print:hidden">
            {t(
              "Desplaza horizontal si hace falta · arrastra columnas o la barra inferior para ajustar vista",
              "Scroll sideways if needed · drag columns or the bottom bar to resize view"
            )}
          </p>
        </div>

        <div className="overflow-auto" style={{ height: tableHeight }}>
          <table
            className="w-full min-w-[920px] border-collapse text-[12px]"
            style={{ tableLayout: "fixed" }}
          >
            <thead className="sticky top-0 z-10">
              <tr className="bg-slate-100 text-[10px] font-bold uppercase tracking-wide text-slate-700">
                {(
                  [
                    ["num", "#", "center"],
                    ["item", t("Artículo", "Item"), "left"],
                    ["client", t("Cliente", "Client"), "left"],
                    ["part", t("No. parte cliente", "Client part #"), "left"],
                    ["uom", t("U. medida", "UOM"), "center"],
                    ["perPallet", t("Cant x tarima", "Qty / pallet"), "right"],
                    ["minInv", t("Inv mín", "Min inv"), "right"],
                    ["physical", t("Cant física", "Physical qty"), "right"],
                    ["pallets", t("Tarimas", "Pallets"), "right"],
                    ["move", t("Movimiento", "Move"), "center"],
                  ] as const
                ).map(([key, label, align]) => (
                  <th
                    key={key}
                    className={`relative border border-slate-300 bg-slate-100 px-2 py-2.5 font-bold ${
                      align === "center"
                        ? "text-center"
                        : align === "right"
                          ? "text-right"
                          : "text-left"
                    } ${key === "move" ? "print:hidden" : ""}`}
                    style={{ width: colWidths[key] }}
                  >
                    {label}
                    <span
                      role="separator"
                      aria-orientation="vertical"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        onColResizeStart(key, e.clientX);
                      }}
                      className="absolute right-0 top-0 z-10 h-full w-1.5 cursor-col-resize touch-none bg-transparent hover:bg-emerald-400/50 print:hidden"
                      title={t("Ajustar ancho", "Resize width")}
                    />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="border-b border-slate-100 px-4 py-10 text-center"
                  >
                    <p className="text-sm font-bold text-slate-800">
                      {t(
                        "Aún no hay artículos en inventario",
                        "No inventory items yet"
                      )}
                    </p>
                    <p className="mx-auto mt-1 max-w-lg text-xs text-slate-600">
                      {t(
                        "Empieza con Agregar artículo. El Excel es opcional solo para una carga inicial.",
                        "Start with Add item. Excel is optional only for an initial load."
                      )}
                    </p>
                    <div className="mt-4 flex flex-wrap justify-center gap-2">
                      {canManageMaster ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setAddOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            {t("Agregar artículo", "Add item")}
                          </button>
                          <button
                            type="button"
                            onClick={() => setImportOpen(true)}
                            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700"
                          >
                            <Upload className="h-3.5 w-3.5" />
                            {t("Carga Excel (opcional)", "Excel load (optional)")}
                          </button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ) : grouped.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-8 text-center text-sm text-slate-600"
                  >
                    {t(
                      "Ningún renglón con ese filtro.",
                      "No rows match this filter."
                    )}
                  </td>
                </tr>
              ) : (
                (() => {
                  let rowNum = 0;
                  return grouped.flatMap((group) => {
                    const sectionRow = (
                      <tr
                        key={`sec-${group.category}`}
                        className="break-inside-avoid"
                      >
                        <td
                          colSpan={10}
                          className="border border-slate-300 bg-slate-100 px-3 py-2 text-[11px] font-black uppercase tracking-wide text-slate-700"
                        >
                          {group.label}
                        </td>
                      </tr>
                    );
                    const dataRows = group.rows.map((item) => {
                      rowNum += 1;
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
                            style={{ width: colWidths.num }}
                          >
                            {rowNum}
                          </td>
                          <td
                            className={`border border-slate-300 px-2 py-2 font-semibold text-slate-900 ${cellBg}`}
                            style={{ width: colWidths.item }}
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
                            style={{ width: colWidths.client }}
                          >
                            <span className="line-clamp-2">
                              {item.clientName || "—"}
                            </span>
                          </td>
                          <td
                            className={`border border-slate-300 px-2 py-2 font-mono text-[11px] ${cellBg}`}
                            style={{ width: colWidths.part }}
                          >
                            {item.isObsolete
                              ? "OBSOLETO"
                              : item.clientPartNumber || "—"}
                          </td>
                          <td
                            className={`border border-slate-300 px-2 py-2 text-center font-mono text-[11px] font-bold ${cellBg}`}
                            style={{ width: colWidths.uom }}
                          >
                            {item.unitOfMeasure}
                          </td>
                          <td
                            className={`border border-slate-300 px-2 py-2 text-right tabular-nums ${cellBg}`}
                            style={{ width: colWidths.perPallet }}
                          >
                            {item.unitsPerPalletOrPack > 0
                              ? formatQty(item.unitsPerPalletOrPack)
                              : "—"}
                          </td>
                          <td
                            className={`border border-slate-300 px-2 py-2 text-right tabular-nums ${cellBg}`}
                            style={{ width: colWidths.minInv }}
                          >
                            {item.minInventory > 0
                              ? formatQty(item.minInventory)
                              : "—"}
                          </td>
                          <td
                            className={`border border-slate-300 px-1 py-1.5 text-right ${cellBg}`}
                            style={{ width: colWidths.physical }}
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
                            style={{ width: colWidths.pallets }}
                          >
                            {pallets > 0 ? formatQty(pallets) : "—"}
                          </td>
                          <td
                            className={`border border-slate-300 px-1 py-1 print:hidden ${cellBg}`}
                            style={{ width: colWidths.move }}
                          >
                            <div className="flex flex-nowrap items-center justify-center gap-0.5">
                              <button
                                type="button"
                                disabled={pending || item.isObsolete}
                                onClick={() => openMove(item, "in")}
                                className="inline-flex items-center gap-0.5 rounded-md bg-sky-50 px-1.5 py-1 text-[10px] font-bold text-sky-800 hover:bg-sky-100 disabled:opacity-40"
                                title={t("Entrada", "In")}
                              >
                                <ArrowDownToLine className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={pending || item.isObsolete}
                                onClick={() => openMove(item, "out")}
                                className="inline-flex items-center gap-0.5 rounded-md bg-rose-50 px-1.5 py-1 text-[10px] font-bold text-rose-800 hover:bg-rose-100 disabled:opacity-40"
                                title={t("Salida", "Out")}
                              >
                                <ArrowUpFromLine className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => openMove(item, "count")}
                                className="inline-flex items-center gap-0.5 rounded-md bg-emerald-50 px-1.5 py-1 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100 disabled:opacity-40"
                                title={t("Conteo", "Count")}
                              >
                                Σ
                              </button>
                              <button
                                type="button"
                                disabled={pending}
                                onClick={() => toggleObsolete(item)}
                                className="rounded-md px-1.5 py-1 text-[10px] font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                                title={
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
                                  className="rounded-md px-1.5 py-1 text-[10px] font-bold text-red-700 hover:bg-red-50 disabled:opacity-40"
                                  title={t("Borrar", "Delete")}
                                >
                                  ×
                                </button>
                              ) : null}
                            </div>
                          </td>
                        </tr>
                      );
                    });
                    return [sectionRow, ...dataRows];
                  });
                })()
              )}
            </tbody>
          </table>
        </div>
        <div
          role="separator"
          aria-orientation="horizontal"
          onMouseDown={(e) => {
            e.preventDefault();
            onHeightResizeStart(e.clientY);
          }}
          className="flex h-3 cursor-row-resize items-center justify-center border-t border-slate-300 bg-slate-50 print:hidden"
          title={t("Arrastra para ajustar alto", "Drag to resize height")}
        >
          <span className="h-1 w-10 rounded-full bg-slate-300" />
        </div>
      </div>

      {importBatches.length > 0 ? (
        <details className="print:hidden rounded-xl border border-slate-200 bg-slate-50">
          <summary className="cursor-pointer list-none px-3 py-2.5 text-xs font-bold text-slate-600 flex items-center gap-2">
            <FileSpreadsheet className="h-3.5 w-3.5 text-slate-500" />
            {t(
              `Historial de cargas Excel (${importBatches.length})`,
              `Excel load history (${importBatches.length})`
            )}
          </summary>
          <div className="overflow-x-auto border-t border-slate-200 bg-white">
            <table className="min-w-full border-collapse text-xs">
              <thead className="bg-slate-50">
                <tr>
                  <th className="border border-slate-200 px-3 py-1.5 text-left font-bold">
                    {t("Fecha", "Date")}
                  </th>
                  <th className="border border-slate-200 px-3 py-1.5 text-left font-bold">
                    {t("Archivo", "File")}
                  </th>
                  <th className="border border-slate-200 px-3 py-1.5 text-right font-bold">
                    {t("Filas", "Rows")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {importBatches.slice(0, 12).map((batch) => (
                  <tr key={batch.id}>
                    <td className="border border-slate-200 px-3 py-1.5 tabular-nums">
                      {batch.countedDate}
                    </td>
                    <td className="border border-slate-200 px-3 py-1.5">
                      {batch.fileName}
                    </td>
                    <td className="border border-slate-200 px-3 py-1.5 text-right tabular-nums">
                      {batch.rowCount}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : null}

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

      {importOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 sm:items-center print:hidden">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <h4 className="font-bold text-slate-900">
                  Carga Excel / CSV (opcional)
                </h4>
                <p className="text-xs text-slate-500">
                  Solo para carga inicial o respaldo. El día a día se actualiza
                  con Agregar / Entrada / Salida / Conteo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setImportOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-3 px-4 py-4">
              <label className="block text-xs font-bold text-slate-600">
                Fecha de este conteo
                <input
                  type="date"
                  value={importDate}
                  onChange={(e) => setImportDate(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </label>
              <label className="block text-xs font-bold text-slate-600">
                Archivo (.xlsx, .xls o .csv)
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                  onChange={(e) =>
                    void onPickImportFile(e.target.files?.[0] || null)
                  }
                  className="mt-1 block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-50 file:px-3 file:py-2 file:text-xs file:font-bold file:text-sky-900"
                />
              </label>
              {importFileName ? (
                <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
                  <p>
                    <strong>{importFileName}</strong>
                    {importSheetName ? ` · ${importSheetName}` : ""} ·{" "}
                    {importPreviewCount}{" "}
                    {t("renglones", "rows")}
                  </p>
                  {importDetectedColumns.length > 0 ? (
                    <p className="text-[11px] leading-relaxed text-slate-600">
                      {t("Columnas leídas", "Columns read")}:{" "}
                      {importDetectedColumns.join(" · ")}
                    </p>
                  ) : null}
                  {pendingRows && pendingRows.length > 0 ? (
                    <div className="overflow-x-auto rounded border border-slate-200 bg-white">
                      <table className="min-w-full text-[11px]">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="px-2 py-1 text-left">
                              {t("Artículo", "Item")}
                            </th>
                            <th className="px-2 py-1 text-left">
                              {t("Cliente", "Client")}
                            </th>
                            <th className="px-2 py-1 text-left">
                              {t("Parte", "Part")}
                            </th>
                            <th className="px-2 py-1 text-right">
                              {t("Cant física", "Qty")}
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingRows.slice(0, 6).map((row, idx) => (
                            <tr
                              key={`${row.itemName}-${idx}`}
                              className="border-t border-slate-100"
                            >
                              <td className="px-2 py-1 font-semibold">
                                {row.itemName}
                              </td>
                              <td
                                className={`px-2 py-1 ${
                                  row.clientName
                                    ? "text-emerald-800 font-semibold"
                                    : "text-rose-600"
                                }`}
                              >
                                {row.clientName ||
                                  t("(vacío)", "(empty)")}
                              </td>
                              <td className="px-2 py-1">
                                {row.clientPartNumber || "—"}
                              </td>
                              <td className="px-2 py-1 text-right tabular-nums">
                                {row.physicalQty}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : null}
                </div>
              ) : (
                <p className="text-xs text-slate-500">
                  {t(
                    "Columnas esperadas en este orden: Artículo, Cliente, No. parte, Unidad, Cant x tarima, Inv mín, Cant física.",
                    "Expected columns in this order: Item, Client, Part #, UOM, Qty per pallet, Min inv, Physical qty."
                  )}
                </p>
              )}
              <button
                type="button"
                onClick={downloadTemplate}
                className="text-xs font-bold text-sky-700 hover:underline"
              >
                Descargar plantilla CSV
              </button>
              {importBatches.length > 0 ? (
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                    {t("Historial de cargas", "Load history")}
                  </p>
                  <ul className="mt-1 max-h-28 space-y-1 overflow-y-auto text-xs text-slate-700">
                    {importBatches.slice(0, 8).map((batch) => (
                      <li key={batch.id} className="flex justify-between gap-2">
                        <span className="truncate">
                          {batch.countedDate} · {batch.fileName}
                        </span>
                        <span className="shrink-0 tabular-nums text-slate-500">
                          {batch.rowCount}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
              <button
                type="button"
                onClick={() => setImportOpen(false)}
                className="rounded-xl px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={pending || !pendingRows?.length}
                onClick={confirmImport}
                className="rounded-xl bg-sky-600 px-4 py-2 text-xs font-bold text-white hover:bg-sky-700 disabled:opacity-50"
              >
                {pending ? "Importando…" : "Guardar por fecha"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
