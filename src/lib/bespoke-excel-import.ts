import * as XLSX from "xlsx";
import {
  BESPOKE_CATEGORY_LABELS,
  defaultUomForCategory,
  normalizeUomForCategory,
  type BespokeCategory,
  type BespokeUom,
} from "@/lib/bespoke-inventory";

export type BespokeImportRow = {
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
};

export type BespokeParseResult = {
  rows: BespokeImportRow[];
  skipped: number;
  errors: string[];
};

const SECTION_HEADERS: Record<string, BespokeCategory> = {
  FOAM: "foam",
  ESQUINEROS: "corner_board",
  ESQUINERO: "corner_board",
  "CORNER BOARD": "corner_board",
  "STRETCH FILM": "stretch_film",
  OTROS: "other",
  OTHER: "other",
};

function normHeader(value: unknown): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

function pickCol(
  headers: string[],
  aliases: string[]
): number {
  for (const alias of aliases) {
    const idx = headers.findIndex((h) => h === alias || h.includes(alias));
    if (idx >= 0) return idx;
  }
  return -1;
}

function cellStr(row: unknown[], idx: number): string {
  if (idx < 0 || idx >= row.length) return "";
  const v = row[idx];
  if (v == null) return "";
  return String(v).trim();
}

function cellNum(row: unknown[], idx: number): number {
  const raw = cellStr(row, idx).replace(/,/g, "");
  if (!raw) return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function detectCategoryFromName(
  itemName: string,
  fallback: BespokeCategory
): BespokeCategory {
  const u = itemName.toUpperCase();
  if (u.includes("ESQUINERO") || u.includes("ESQ BCO") || u.startsWith("ESQ ")) {
    return "corner_board";
  }
  if (u.includes("FOAM")) return "foam";
  if (u.includes("STRETCH") || u.includes("FILM")) return "stretch_film";
  return fallback;
}

function isSectionOnlyRow(itemName: string): BespokeCategory | null {
  const key = normHeader(itemName);
  return SECTION_HEADERS[key] ?? null;
}

function isObsoletePart(part: string, itemName: string): boolean {
  const blob = `${part} ${itemName}`.toUpperCase();
  return blob.includes("OBSOLETO");
}

/**
 * Parse .xlsx / .xls / .csv ArrayBuffer into bespoke inventory rows.
 * Accepts Spanish headers from LISTA DE ARTICULOS INVENTARIO BESPOKE.
 */
export function parseBespokeInventoryWorkbook(
  data: ArrayBuffer,
  fileName = ""
): BespokeParseResult {
  const workbook = XLSX.read(data, { type: "array", raw: false });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    return { rows: [], skipped: 0, errors: ["El archivo no tiene hojas."] };
  }

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: "",
    blankrows: false,
  }) as unknown[][];

  if (!matrix.length) {
    return { rows: [], skipped: 0, errors: ["Hoja vacía."] };
  }

  // Find header row (contains ARTICULO).
  let headerIdx = -1;
  for (let i = 0; i < Math.min(matrix.length, 30); i += 1) {
    const headers = (matrix[i] || []).map(normHeader);
    if (headers.some((h) => h.includes("ARTICULO"))) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx < 0) {
    return {
      rows: [],
      skipped: 0,
      errors: [
        "No encontré la fila de encabezados (Artículo / Cliente / Cant física). Usa la plantilla o el formato de la hoja del almacén.",
      ],
    };
  }

  const headers = (matrix[headerIdx] || []).map(normHeader);
  const colArticulo = pickCol(headers, ["ARTICULO"]);
  const colCliente = pickCol(headers, ["CLIENTE"]);
  const colParte = pickCol(headers, [
    "NO PARTE CLIENTE",
    "NO DE PARTE",
    "PARTE CLIENTE",
    "NO PARTE",
    "PARTE",
  ]);
  const colUom = pickCol(headers, [
    "UNIDAD DE MEDIDA",
    "UNIDAD MEDIDA",
    "UNIDAD",
    "UOM",
  ]);
  const colPerPack = pickCol(headers, [
    "CANT X TARIMA PAQ",
    "CANT X TARIMA",
    "CANT POR TARIMA",
    "TARIMA PAQ",
    "X TARIMA",
  ]);
  const colMin = pickCol(headers, ["INV MIN", "INVENTARIO MIN", "MIN"]);
  const colQty = pickCol(headers, [
    "CANT FISICA",
    "CANTIDAD FISICA",
    "FISICA",
    "QTY",
  ]);
  const colPallets = pickCol(headers, ["TARIMAS", "PALLETS", "PALLET"]);
  const colCategory = pickCol(headers, ["SECCION", "CATEGORIA", "CATEGORY"]);
  const colNotes = pickCol(headers, ["NOTAS", "NOTES", "OBSERVACIONES"]);

  if (colArticulo < 0) {
    return {
      rows: [],
      skipped: 0,
      errors: ["Falta la columna Artículo."],
    };
  }

  const rows: BespokeImportRow[] = [];
  const errors: string[] = [];
  let skipped = 0;
  let currentCategory: BespokeCategory = "stretch_film";

  for (let r = headerIdx + 1; r < matrix.length; r += 1) {
    const row = (matrix[r] || []) as unknown[];
    const itemName = cellStr(row, colArticulo);
    if (!itemName) {
      skipped += 1;
      continue;
    }

    const section = isSectionOnlyRow(itemName);
    if (section) {
      currentCategory = section;
      skipped += 1;
      continue;
    }

    // Skip repeated header rows mid-sheet.
    if (normHeader(itemName) === "ARTICULO") {
      skipped += 1;
      continue;
    }

    const categoryFromCol =
      colCategory >= 0
        ? inferCategoryLabel(cellStr(row, colCategory))
        : null;
    const category = detectCategoryFromName(
      itemName,
      categoryFromCol || currentCategory
    );

    const clientPartNumber = cellStr(row, colParte);
    const isObsolete = isObsoletePart(clientPartNumber, itemName);
    const unitRaw = cellStr(row, colUom);
    const unitOfMeasure = normalizeUomForCategory(
      category,
      unitRaw || defaultUomForCategory(category)
    );

    const physicalQty = cellNum(row, colQty);
    const unitsPerPalletOrPack = cellNum(row, colPerPack);
    const minInventory = cellNum(row, colMin);
    let palletCount = cellNum(row, colPallets);
    if (palletCount <= 0 && unitsPerPalletOrPack > 0 && physicalQty > 0) {
      palletCount =
        Math.round((physicalQty / unitsPerPalletOrPack) * 10000) / 10000;
    }

    rows.push({
      itemName,
      category,
      clientName: cellStr(row, colCliente),
      clientPartNumber: isObsolete ? "OBSOLETO" : clientPartNumber,
      unitOfMeasure,
      unitsPerPalletOrPack,
      minInventory,
      physicalQty,
      palletCount,
      isObsolete,
      countNotes: cellStr(row, colNotes),
    });
  }

  if (!rows.length) {
    errors.push(
      `No se extrajeron artículos de ${fileName || "el archivo"}. Revisa columnas y filas.`
    );
  }

  return { rows, skipped, errors };
}

function inferCategoryLabel(raw: string): BespokeCategory | null {
  const key = normHeader(raw);
  if (!key) return null;
  if (SECTION_HEADERS[key]) return SECTION_HEADERS[key];
  for (const [category, label] of Object.entries(BESPOKE_CATEGORY_LABELS)) {
    if (key.includes(normHeader(label)) || key.includes(normHeader(category))) {
      return category as BespokeCategory;
    }
  }
  return null;
}

/** Downloadable CSV template matching the warehouse sheet. */
export function buildBespokeImportTemplateCsv(): string {
  const header = [
    "Articulo",
    "Cliente",
    "No. parte cliente",
    "Unidad de medida",
    "Cant x tarima / paq",
    "Inv min",
    "Cant fisica",
    "Seccion",
    "Notas",
  ].join(",");
  const sample = [
    '"STRETCH FILM 18"" X 80 X 1500FT",TERREPOWER SPARTA,405500,RLL,192,192,0,STRETCH FILM,',
    '"FOAM EN CUADRITO BLANCO",SUNSETTER,457120,PZA,0,0,0,FOAM,',
    '"ESQUINERO 1.5 X 1.5 X 39 1/4""",MASTERBRAND,,PZA,2000,0,0,ESQUINEROS,',
  ];
  return `${header}\n${sample.join("\n")}\n`;
}

export function matchKeyForImportRow(row: {
  itemName: string;
  clientName: string;
  clientPartNumber: string;
}): string {
  return [
    row.itemName.trim().toUpperCase(),
    row.clientName.trim().toUpperCase(),
    row.clientPartNumber.trim().toUpperCase(),
  ].join("||");
}
