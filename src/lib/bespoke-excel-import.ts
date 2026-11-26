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

type ColMap = {
  articulo: number;
  cliente: number;
  parte: number;
  uom: number;
  perPack: number;
  min: number;
  qty: number;
  pallets: number;
  category: number;
  notes: number;
};

function normHeader(value: unknown): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

/**
 * Prefer exact header match, then shortest includes-match.
 * Optional exclude avoids "CLIENTE" matching "NO PARTE CLIENTE".
 */
function pickCol(
  headers: string[],
  aliases: string[],
  opts?: { exclude?: string[] }
): number {
  const exclude = opts?.exclude || [];
  const usable = (h: string) => !exclude.some((ex) => h.includes(ex));

  for (const alias of aliases) {
    const exact = headers.findIndex((h) => h === alias && usable(h));
    if (exact >= 0) return exact;
  }

  let best = -1;
  let bestLen = Number.POSITIVE_INFINITY;
  for (const alias of aliases) {
    for (let i = 0; i < headers.length; i += 1) {
      const h = headers[i];
      if (!h || !usable(h) || !h.includes(alias)) continue;
      if (h.length < bestLen) {
        best = i;
        bestLen = h.length;
      }
    }
  }
  return best;
}

function resolveColumns(headers: string[]): ColMap {
  return {
    articulo: pickCol(headers, ["ARTICULO", "ITEM", "PRODUCTO"]),
    // Never confuse with "NO PARTE CLIENTE"
    cliente: pickCol(
      headers,
      ["CLIENTE", "CUSTOMER", "CLIENT", "COMPANY"],
      { exclude: ["PARTE", "PART", "NO "] }
    ),
    parte: pickCol(headers, [
      "NO PARTE CLIENTE",
      "NUMERO PARTE CLIENTE",
      "NO DE PARTE",
      "PARTE CLIENTE",
      "NO PARTE",
      "PART NUMBER",
      "PARTE",
    ]),
    uom: pickCol(headers, [
      "UNIDAD DE MEDIDA",
      "UNIDAD MEDIDA",
      "UNIDAD",
      "UOM",
    ]),
    perPack: pickCol(headers, [
      "CANT X TARIMA PAQ",
      "CANT X TARIMA",
      "CANT POR TARIMA",
      "TARIMA PAQ",
      "X TARIMA",
    ]),
    min: pickCol(headers, ["INV MIN", "INVENTARIO MIN", "MIN"]),
    qty: pickCol(headers, [
      "CANT FISICA",
      "CANTIDAD FISICA",
      "FISICA",
      "QTY",
    ]),
    pallets: pickCol(headers, ["TARIMAS", "PALLETS", "PALLET"]),
    category: pickCol(headers, ["SECCION", "CATEGORIA", "CATEGORY"]),
    notes: pickCol(headers, ["NOTAS", "NOTES", "OBSERVACIONES"]),
  };
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

function looksLikeHeaderRow(row: unknown[]): boolean {
  const headers = row.map(normHeader);
  return headers.some((h) => h === "ARTICULO" || h.includes("ARTICULO"));
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
    raw: false,
  }) as unknown[][];

  if (!matrix.length) {
    return { rows: [], skipped: 0, errors: ["Hoja vacía."] };
  }

  // Find first header row (contains ARTICULO).
  let headerIdx = -1;
  for (let i = 0; i < Math.min(matrix.length, 40); i += 1) {
    if (looksLikeHeaderRow(matrix[i] || [])) {
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

  let cols = resolveColumns((matrix[headerIdx] || []).map(normHeader));
  if (cols.articulo < 0) {
    return {
      rows: [],
      skipped: 0,
      errors: ["Falta la columna Artículo."],
    };
  }

  // Fallback positional map if Cliente header was missed but sheet matches paper layout:
  // 0 Articulo | 1 Cliente | 2 No. parte | 3 UOM | 4 Cant x tarima | 5 Inv min | 6 Cant fisica
  if (cols.cliente < 0) {
    cols = {
      ...cols,
      cliente: 1,
      parte: cols.parte < 0 ? 2 : cols.parte,
      uom: cols.uom < 0 ? 3 : cols.uom,
      perPack: cols.perPack < 0 ? 4 : cols.perPack,
      min: cols.min < 0 ? 5 : cols.min,
      qty: cols.qty < 0 ? 6 : cols.qty,
    };
  }

  const rows: BespokeImportRow[] = [];
  const errors: string[] = [];
  let skipped = 0;
  let currentCategory: BespokeCategory = "stretch_film";
  let missingClientSamples = 0;

  for (let r = headerIdx + 1; r < matrix.length; r += 1) {
    const row = (matrix[r] || []) as unknown[];

    // Re-bind columns when the sheet repeats headers (FOAM / ESQUINEROS blocks).
    if (looksLikeHeaderRow(row)) {
      const next = resolveColumns(row.map(normHeader));
      if (next.articulo >= 0) {
        cols = next;
        if (cols.cliente < 0) cols = { ...cols, cliente: 1 };
      }
      skipped += 1;
      continue;
    }

    const itemName = cellStr(row, cols.articulo);
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

    const categoryFromCol =
      cols.category >= 0
        ? inferCategoryLabel(cellStr(row, cols.category))
        : null;
    const category = detectCategoryFromName(
      itemName,
      categoryFromCol || currentCategory
    );

    const clientName = cellStr(row, cols.cliente);
    const clientPartNumber = cellStr(row, cols.parte);
    if (!clientName) missingClientSamples += 1;

    const isObsolete = isObsoletePart(clientPartNumber, itemName);
    const unitRaw = cellStr(row, cols.uom);
    const unitOfMeasure = normalizeUomForCategory(
      category,
      unitRaw || defaultUomForCategory(category)
    );

    const physicalQty = cellNum(row, cols.qty);
    const unitsPerPalletOrPack = cellNum(row, cols.perPack);
    const minInventory = cellNum(row, cols.min);
    let palletCount = cellNum(row, cols.pallets);
    if (palletCount <= 0 && unitsPerPalletOrPack > 0 && physicalQty > 0) {
      palletCount =
        Math.round((physicalQty / unitsPerPalletOrPack) * 10000) / 10000;
    }

    rows.push({
      itemName,
      category,
      clientName,
      clientPartNumber: isObsolete ? "OBSOLETO" : clientPartNumber,
      unitOfMeasure,
      unitsPerPalletOrPack,
      minInventory,
      physicalQty,
      palletCount,
      isObsolete,
      countNotes: cellStr(row, cols.notes),
    });
  }

  if (!rows.length) {
    errors.push(
      `No se extrajeron artículos de ${fileName || "el archivo"}. Revisa columnas y filas.`
    );
  } else if (missingClientSamples === rows.length) {
    errors.push(
      "Se leyeron artículos pero ningún Cliente. Revisa que la columna se llame CLIENTE (no 'No. parte cliente')."
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
