import { HAND_FULL_PALLET_ROLLS } from "@/lib/pricing";
import { MANUAL_FILM_MASTER } from "@/lib/manual-film-master";
import {
  MACHINE_FILM_MASTER,
  MACHINE_FULL_PALLET_ROLLS,
} from "@/lib/machine-film-master";

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

export type BespokeArticleOption = {
  label: string;
  category: BespokeCategory;
  unitOfMeasure: BespokeUom;
  /** Default cant x tarima / paq when known. */
  unitsPerPalletOrPack?: number;
};

function formatStretchSheetLabel(
  widthInches: number,
  gauge: number,
  lengthFeet: number
): string {
  return `STRETCH FILM ${widthInches}" X ${gauge} X ${lengthFeet}FT`;
}

function uniqueArticleOptions(
  rows: BespokeArticleOption[]
): BespokeArticleOption[] {
  const seen = new Set<string>();
  const out: BespokeArticleOption[] = [];
  for (const row of rows) {
    const key = `${row.category}::${row.label}`.toUpperCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(row);
  }
  return out.sort((a, b) => a.label.localeCompare(b.label, "en"));
}

/**
 * Dropdown measures for ARTICULO — catalog masters + USA bespoke sheet lines.
 */
export const BESPOKE_ARTICLE_OPTIONS: readonly BespokeArticleOption[] =
  uniqueArticleOptions([
    ...MANUAL_FILM_MASTER.map((row) => ({
      label: formatStretchSheetLabel(row.widthInches, row.gauge, row.lengthFeet),
      category: "stretch_film" as const,
      unitOfMeasure: "RLL" as const,
      unitsPerPalletOrPack: HAND_FULL_PALLET_ROLLS,
    })),
    ...MACHINE_FILM_MASTER.map((row) => ({
      label: formatStretchSheetLabel(row.widthInches, row.gauge, row.lengthFeet),
      category: "stretch_film" as const,
      unitOfMeasure: "RLL" as const,
      unitsPerPalletOrPack: MACHINE_FULL_PALLET_ROLLS,
    })),
    // Extra USA warehouse sheet measures (client holds / specials).
    {
      label: 'STRETCH FILM 20" TRICO TITAN',
      category: "stretch_film",
      unitOfMeasure: "RLL",
    },
    {
      label: 'STRETCH FILM 20" X 50 X 6000FT',
      category: "stretch_film",
      unitOfMeasure: "RLL",
      unitsPerPalletOrPack: MACHINE_FULL_PALLET_ROLLS,
    },
    {
      label: 'STRETCH FILM 20" X 80 X 6000FT',
      category: "stretch_film",
      unitOfMeasure: "RLL",
      unitsPerPalletOrPack: MACHINE_FULL_PALLET_ROLLS,
    },
    {
      label: 'STRETCH FILM 20" X 55/60 X 7000',
      category: "stretch_film",
      unitOfMeasure: "RLL",
      unitsPerPalletOrPack: MACHINE_FULL_PALLET_ROLLS,
    },
    {
      label: 'STRETCH FILM 15" X 40 X 2000FT',
      category: "stretch_film",
      unitOfMeasure: "RLL",
      unitsPerPalletOrPack: HAND_FULL_PALLET_ROLLS,
    },
    {
      label: 'STRETCH FILM 18" X 80 X 1500FT EN CAJA',
      category: "stretch_film",
      unitOfMeasure: "CJA",
      unitsPerPalletOrPack: 48,
    },
    {
      label: 'STRETCH FILM 5" PAQ C 12 RLLS',
      category: "stretch_film",
      unitOfMeasure: "PAQ",
      unitsPerPalletOrPack: 12,
    },
    {
      label: "FOAM EN CUADRITO BLANCO",
      category: "foam",
      unitOfMeasure: "PZA",
    },
    {
      label: 'ESQUINERO 1.5 X 1.5 X 39 1/4"',
      category: "corner_board",
      unitOfMeasure: "PZA",
    },
    {
      label: 'ESQUINERO 1.5 X 1.5 X 37 1/4"',
      category: "corner_board",
      unitOfMeasure: "PZA",
    },
    {
      label: 'ESQUINERO 1.75 X 1.75 X 40 3/8"',
      category: "corner_board",
      unitOfMeasure: "PZA",
    },
    {
      label: 'ESQUINERO 1.75 X 1.75 X 38 1/4"',
      category: "corner_board",
      unitOfMeasure: "PZA",
    },
    {
      label: 'ESQUINERO 1.75 X 1.75 X 26 3/8"',
      category: "corner_board",
      unitOfMeasure: "PZA",
    },
    {
      label: 'ESQ BCO 2 1/2" X 2 1/2" X 29 1/2" C120',
      category: "corner_board",
      unitOfMeasure: "PZA",
    },
    {
      label: 'ESQ BCO 2 1/2" X 2 1/2" X 32" C120',
      category: "corner_board",
      unitOfMeasure: "PZA",
    },
  ]);

export function bespokeArticlesForCategory(
  category: BespokeCategory | "all"
): BespokeArticleOption[] {
  if (category === "all") return [...BESPOKE_ARTICLE_OPTIONS];
  return BESPOKE_ARTICLE_OPTIONS.filter((row) => row.category === category);
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
