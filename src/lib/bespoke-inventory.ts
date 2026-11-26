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

/** UOM allowed per section (esquineros/foam never use rolls). */
export const BESPOKE_UOMS_BY_CATEGORY: Record<BespokeCategory, readonly BespokeUom[]> = {
  stretch_film: ["RLL", "CJA", "PAQ"],
  foam: ["PZA", "PAQ", "CJA"],
  corner_board: ["PZA"],
  other: ["PZA", "PAQ", "CJA", "RLL"],
};

export function defaultUomForCategory(category: BespokeCategory): BespokeUom {
  return BESPOKE_UOMS_BY_CATEGORY[category][0] ?? "PZA";
}

export function uomsForCategory(category: BespokeCategory): readonly BespokeUom[] {
  return BESPOKE_UOMS_BY_CATEGORY[category] ?? BESPOKE_UOMS;
}

export function normalizeUomForCategory(
  category: BespokeCategory,
  unitOfMeasure: unknown
): BespokeUom {
  const raw = String(unitOfMeasure || "").toUpperCase();
  const allowed = uomsForCategory(category);
  if ((allowed as readonly string[]).includes(raw)) return raw as BespokeUom;
  return defaultUomForCategory(category);
}

/** Derived tarimas from physical qty when pack size is known. */
export function derivePalletCount(
  physicalQty: number,
  unitsPerPalletOrPack: number
): number {
  const per = Number(unitsPerPalletOrPack) || 0;
  if (per <= 0) return 0;
  return Math.round((Number(physicalQty) || 0) / per * 10000) / 10000;
}

export type BespokeWarehouseStats = {
  totalSkus: number;
  activeSkus: number;
  obsoleteSkus: number;
  lowStockSkus: number;
  zeroStockSkus: number;
  clients: number;
  totalPhysicalQty: number;
  totalPallets: number;
  lastCountedDate: string | null;
  byCategory: Array<{
    category: BespokeCategory;
    label: string;
    skus: number;
    physicalQty: number;
    pallets: number;
    lowStock: number;
  }>;
  byClient: Array<{
    clientName: string;
    skus: number;
    physicalQty: number;
    pallets: number;
  }>;
};

export function computeBespokeWarehouseStats(
  items: BespokeInventoryItem[]
): BespokeWarehouseStats {
  const active = items.filter((i) => !i.isObsolete);
  const obsoleteSkus = items.length - active.length;
  let lowStockSkus = 0;
  let zeroStockSkus = 0;
  let totalPhysicalQty = 0;
  let totalPallets = 0;
  let lastCountedDate: string | null = null;
  const clients = new Set<string>();

  const catMap = new Map<
    BespokeCategory,
    { skus: number; physicalQty: number; pallets: number; lowStock: number }
  >();
  for (const cat of BESPOKE_CATEGORIES) {
    catMap.set(cat, { skus: 0, physicalQty: 0, pallets: 0, lowStock: 0 });
  }

  const clientMap = new Map<
    string,
    { skus: number; physicalQty: number; pallets: number }
  >();

  for (const item of items) {
    const pallets =
      item.palletCount > 0
        ? item.palletCount
        : derivePalletCount(item.physicalQty, item.unitsPerPalletOrPack);
    const low = isBelowMinInventory(item);

    if (item.clientName.trim()) clients.add(item.clientName.trim());
    if (item.countedDate) {
      if (!lastCountedDate || item.countedDate > lastCountedDate) {
        lastCountedDate = item.countedDate;
      }
    }

    if (!item.isObsolete) {
      totalPhysicalQty += item.physicalQty;
      totalPallets += pallets;
      if (low) lowStockSkus += 1;
      if (item.physicalQty <= 0) zeroStockSkus += 1;
    }

    const cat = catMap.get(item.category);
    if (cat && !item.isObsolete) {
      cat.skus += 1;
      cat.physicalQty += item.physicalQty;
      cat.pallets += pallets;
      if (low) cat.lowStock += 1;
    }

    const clientKey = item.clientName.trim() || "Sin cliente";
    if (!item.isObsolete) {
      const cur = clientMap.get(clientKey) || {
        skus: 0,
        physicalQty: 0,
        pallets: 0,
      };
      cur.skus += 1;
      cur.physicalQty += item.physicalQty;
      cur.pallets += pallets;
      clientMap.set(clientKey, cur);
    }
  }

  return {
    totalSkus: items.length,
    activeSkus: active.length,
    obsoleteSkus,
    lowStockSkus,
    zeroStockSkus,
    clients: clients.size,
    totalPhysicalQty,
    totalPallets,
    lastCountedDate,
    byCategory: BESPOKE_CATEGORIES.map((category) => {
      const row = catMap.get(category)!;
      return {
        category,
        label: BESPOKE_CATEGORY_LABELS[category],
        ...row,
      };
    }).filter((row) => row.skus > 0),
    byClient: Array.from(clientMap.entries())
      .map(([clientName, row]) => ({ clientName, ...row }))
      .sort((a, b) => b.physicalQty - a.physicalQty)
      .slice(0, 8),
  };
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
