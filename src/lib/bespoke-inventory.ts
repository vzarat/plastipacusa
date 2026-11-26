export const BESPOKE_WAREHOUSE_CODE = "USA" as const;

export const BESPOKE_CATEGORIES = [
  "stretch_film",
  "foam",
  "corner_board",
  "other",
] as const;

export type BespokeCategory = (typeof BESPOKE_CATEGORIES)[number];

export const BESPOKE_UOMS = ["RLL", "CJA", "PZA", "PAQ"] as const;
export type BespokeUom = (typeof BESPOKE_UOMS)[number];

export const BESPOKE_CATEGORY_LABELS: Record<BespokeCategory, string> = {
  stretch_film: "STRETCH FILM",
  foam: "FOAM",
  corner_board: "ESQUINEROS",
  other: "OTROS",
};

/** Derived tarimas from physical qty when pack size is known. */
export function derivePalletCount(
  physicalQty: number,
  unitsPerPalletOrPack: number
): number {
  const per = Number(unitsPerPalletOrPack) || 0;
  if (per <= 0) return 0;
  return Math.round((Number(physicalQty) || 0) / per * 10000) / 10000;
}

export type BespokeInventoryItem = {
  id: string;
  warehouseCode: string;
  itemName: string;
  category: BespokeCategory;
  clientName: string;
  clientPartNumber: string;
  unitOfMeasure: BespokeUom;
  unitsPerPalletOrPack: number;
  minInventory: number;
  physicalQty: number;
  palletCount: number;
  isObsolete: boolean;
  countNotes: string;
  countedDate: string | null;
  sortOrder: number;
  updatedAt: string | null;
};

export type BespokeCountSnapshot = {
  id: string;
  itemId: string;
  warehouseCode: string;
  itemName: string;
  category: string;
  clientName: string;
  clientPartNumber: string;
  unitOfMeasure: string;
  physicalQty: number;
  palletCount: number;
  countNotes: string;
  countedDate: string | null;
  countedBy: string | null;
  createdAt: string;
};

function asNumber(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function asCategory(value: unknown): BespokeCategory {
  const raw = String(value || "");
  return (BESPOKE_CATEGORIES as readonly string[]).includes(raw)
    ? (raw as BespokeCategory)
    : "other";
}

function asUom(value: unknown): BespokeUom {
  const raw = String(value || "").toUpperCase();
  return (BESPOKE_UOMS as readonly string[]).includes(raw)
    ? (raw as BespokeUom)
    : "PZA";
}

export function mapBespokeInventoryItem(
  row: Record<string, unknown>
): BespokeInventoryItem {
  return {
    id: String(row.id || ""),
    warehouseCode: String(row.warehouse_code || BESPOKE_WAREHOUSE_CODE),
    itemName: String(row.item_name || ""),
    category: asCategory(row.category),
    clientName: String(row.client_name || ""),
    clientPartNumber: String(row.client_part_number || ""),
    unitOfMeasure: asUom(row.unit_of_measure),
    unitsPerPalletOrPack: asNumber(row.units_per_pallet_or_pack),
    minInventory: asNumber(row.min_inventory),
    physicalQty: asNumber(row.physical_qty),
    palletCount: asNumber(row.pallet_count),
    isObsolete: Boolean(row.is_obsolete),
    countNotes: String(row.count_notes || ""),
    countedDate: row.counted_date ? String(row.counted_date).slice(0, 10) : null,
    sortOrder: Math.floor(asNumber(row.sort_order)),
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  };
}

export function isBelowMinInventory(item: BespokeInventoryItem): boolean {
  return item.minInventory > 0 && item.physicalQty < item.minInventory;
}

export function bespokeCsvEscape(value: string | number | null | undefined): string {
  const raw = value == null ? "" : String(value);
  if (/[",\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

export function buildBespokeInventoryCsv(items: BespokeInventoryItem[]): string {
  const header = [
    "warehouse_code",
    "category",
    "item_name",
    "client_name",
    "client_part_number",
    "unit_of_measure",
    "units_per_pallet_or_pack",
    "min_inventory",
    "physical_qty",
    "pallet_count",
    "is_obsolete",
    "count_notes",
    "counted_date",
    "updated_at",
  ];
  const lines = [header.join(",")];
  for (const item of items) {
    lines.push(
      [
        bespokeCsvEscape(item.warehouseCode),
        bespokeCsvEscape(item.category),
        bespokeCsvEscape(item.itemName),
        bespokeCsvEscape(item.clientName),
        bespokeCsvEscape(item.clientPartNumber),
        bespokeCsvEscape(item.unitOfMeasure),
        bespokeCsvEscape(item.unitsPerPalletOrPack),
        bespokeCsvEscape(item.minInventory),
        bespokeCsvEscape(item.physicalQty),
        bespokeCsvEscape(item.palletCount),
        bespokeCsvEscape(item.isObsolete ? "OBSOLETO" : ""),
        bespokeCsvEscape(item.countNotes),
        bespokeCsvEscape(item.countedDate),
        bespokeCsvEscape(item.updatedAt),
      ].join(",")
    );
  }
  return `${lines.join("\n")}\n`;
}
