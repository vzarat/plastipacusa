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
  /** Human-readable column mapping for debugging in the UI. */
  detectedColumns: string[];
  sheetName: string;
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

function emptyResult(
  partial: Partial<BespokeParseResult> & { errors: string[] }
): BespokeParseResult {
  return {
    rows: [],
    skipped: 0,
    detectedColumns: [],
    sheetName: "",
    ...partial,
  };
}

function normHeader(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u00a0/g, " ")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

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
      if (!h || !usable(h)) continue;
      // Prefer whole-token match over loose includes when possible.
      const tokens = h.split(" ").filter(Boolean);
      const tokenHit = tokens.includes(alias);
      const includesHit = h.includes(alias);
      if (!tokenHit && !includesHit) continue;
      const score = tokenHit ? h.length : h.length + 100;
      if (score < bestLen) {
        best = i;
        bestLen = score;
      }
    }
  }
  return best;
}

function resolveColumns(headers: string[]): ColMap {
  return {
    articulo: pickCol(headers, ["ARTICULO", "ARTICLE", "ITEM", "PRODUCTO"]),
    // Exact/token "CLIENTE" only — never "NO PARTE CLIENTE"
    cliente: pickCol(headers, ["CLIENTE", "CUSTOMER", "CLIENT"], {
      exclude: ["PARTE", "PART"],
    }),
    parte: pickCol(headers, [
      "NO PARTE CLIENTE",
      "NUMERO PARTE CLIENTE",
      "N PARTE CLIENTE",
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
      "CANTIDAD X TARIMA",
      "CANT POR TARIMA",
      "TARIMA PAQ",
      "X TARIMA",
    ]),
    min: pickCol(headers, ["INV MIN", "INVENTARIO MINIMO", "INVENTARIO MIN"]),
    qty: pickCol(headers, [
      "CANT FISICA",
      "CANTIDAD FISICA",
      "CANT FISICO",
      "FISICA",
    ]),
    pallets: pickCol(headers, ["TARIMAS", "PALLETS", "PALLET", "PALET"]),
    category: pickCol(headers, ["SECCION", "CATEGORIA", "CATEGORY"]),
    notes: pickCol(headers, ["NOTAS", "NOTES", "OBSERVACIONES"]),
  };
}

/**
 * Paper sheet column order relative to ARTICULO:
 * Articulo | Cliente | No. parte | UOM | Cant x tarima | Inv min | Cant fisica
 */
function applyPaperLayoutFallback(cols: ColMap): ColMap {
  if (cols.articulo < 0) return cols;
  const a = cols.articulo;
  // Cliente must never point at the Artículo column (old absolute fallback bug).
  const cliente =
    cols.cliente >= 0 && cols.cliente !== a ? cols.cliente : a + 1;
  const parte =
    cols.parte >= 0 && cols.parte !== a && cols.parte !== cliente
      ? cols.parte
      : a + 2;
  const uom =
    cols.uom >= 0 && cols.uom !== a ? cols.uom : a + 3;
  const perPack =
    cols.perPack >= 0 && cols.perPack !== a ? cols.perPack : a + 4;
  const min = cols.min >= 0 && cols.min !== a ? cols.min : a + 5;
  const qty = cols.qty >= 0 && cols.qty !== a ? cols.qty : a + 6;
  return {
    articulo: a,
    cliente,
    parte,
    uom,
    perPack,
    min,
    qty,
    pallets: cols.pallets,
    category: cols.category,
    notes: cols.notes,
  };
}

function describeColumns(cols: ColMap, headers: string[]): string[] {
  const label = (idx: number, name: string) => {
    if (idx < 0) return `${name}: (no detectada)`;
    const h = headers[idx] || `col ${idx + 1}`;
    return `${name}: col ${idx + 1} “${h}”`;
  };
  return [
    label(cols.articulo, "Artículo"),
    label(cols.cliente, "Cliente"),
    label(cols.parte, "No. parte"),
    label(cols.uom, "Unidad"),
    label(cols.perPack, "Cant x tarima"),
    label(cols.min, "Inv mín"),
    label(cols.qty, "Cant física"),
  ];
}

function cellStr(row: unknown[], idx: number): string {
  if (idx < 0) return "";
  const v = row[idx];
  if (v == null || v === "") return "";
  return String(v).replace(/\u00a0/g, " ").trim();
}

function cellNum(row: unknown[], idx: number): number {
  const raw = cellStr(row, idx).replace(/,/g, "").replace(/\s/g, "");
  if (!raw || raw === "—" || raw === "-" || raw === "Ø" || raw === "ø") return 0;
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
  return headers.some((h) => h === "ARTICULO" || h.startsWith("ARTICULO"));
}

function matrixFromCsv(buffer: ArrayBuffer): unknown[][] {
  const text = new TextDecoder("utf-8").decode(buffer);
  const firstLine = text.split(/\r?\n/).find((l) => l.trim()) || "";
  const semi = (firstLine.match(/;/g) || []).length;
  const comma = (firstLine.match(/,/g) || []).length;
  const FS = semi > comma ? ";" : ",";
  const workbook = XLSX.read(text, { type: "string", FS, raw: false });
  const name = workbook.SheetNames[0];
  if (!name) return [];
  return XLSX.utils.sheet_to_json(workbook.Sheets[name], {
    header: 1,
    defval: "",
    blankrows: false,
    raw: false,
  }) as unknown[][];
}

function pickBestSheet(workbook: XLSX.WorkBook): {
  name: string;
  matrix: unknown[][];
} {
  let bestName = workbook.SheetNames[0] || "";
  let bestMatrix: unknown[][] = [];
  let bestScore = -1;

  for (const name of workbook.SheetNames) {
    const sheet = workbook.Sheets[name];
    const matrix = XLSX.utils.sheet_to_json(sheet, {
      header: 1,
      defval: "",
      blankrows: false,
      raw: false,
    }) as unknown[][];
    let score = 0;
    for (const row of matrix.slice(0, 50)) {
      const headers = (row || []).map(normHeader);
      if (headers.some((h) => h.includes("ARTICULO"))) score += 10;
      if (headers.some((h) => h === "CLIENTE")) score += 8;
      if (headers.some((h) => h.includes("FISICA"))) score += 5;
      if (headers.some((h) => h.includes("TARIMA"))) score += 3;
    }
    // Prefer sheets with more non-empty data rows.
    score += Math.min(matrix.length, 80);
    if (score > bestScore) {
      bestScore = score;
      bestName = name;
      bestMatrix = matrix;
    }
  }

  return { name: bestName, matrix: bestMatrix };
}

function parseMatrix(
  matrix: unknown[][],
  sheetName: string,
  fileName: string
): BespokeParseResult {
  if (!matrix.length) {
    return emptyResult({
      errors: ["Hoja vacía."],
      sheetName,
    });
  }

  let headerIdx = -1;
  for (let i = 0; i < Math.min(matrix.length, 60); i += 1) {
    if (looksLikeHeaderRow(matrix[i] || [])) {
      headerIdx = i;
      break;
    }
  }

  if (headerIdx < 0) {
    return emptyResult({
      sheetName,
      errors: [
        "No encontré encabezados (Artículo / Cliente / Cant física). Usa la plantilla o exporta la hoja con esos nombres de columna.",
      ],
    });
  }

  let headerCells = (matrix[headerIdx] || []).map(normHeader);
  let cols = applyPaperLayoutFallback(resolveColumns(headerCells));

  if (cols.articulo < 0) {
    return emptyResult({
      sheetName,
      errors: ["Falta la columna Artículo."],
      detectedColumns: describeColumns(cols, headerCells),
    });
  }

  const rows: BespokeImportRow[] = [];
  const errors: string[] = [];
  let skipped = 0;
  let currentCategory: BespokeCategory = "stretch_film";
  let withClient = 0;

  for (let r = headerIdx + 1; r < matrix.length; r += 1) {
    const row = [...((matrix[r] || []) as unknown[])];
    // Ensure row is long enough for relative columns.
    while (row.length <= cols.articulo + 6) row.push("");

    if (looksLikeHeaderRow(row)) {
      headerCells = row.map(normHeader);
      const next = applyPaperLayoutFallback(resolveColumns(headerCells));
      if (next.articulo >= 0) cols = next;
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
    if (clientName) withClient += 1;

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

  const detectedColumns = describeColumns(cols, headerCells);

  if (!rows.length) {
    errors.push(
      `No se extrajeron artículos de ${fileName || "el archivo"} (hoja “${sheetName}”).`
    );
  } else if (withClient === 0) {
    errors.push(
      `Se leyeron ${rows.length} artículos pero 0 clientes. Columnas detectadas: ${detectedColumns.join(" · ")}`
    );
  }

  return {
    rows,
    skipped,
    errors,
    detectedColumns,
    sheetName,
  };
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

/**
 * Parse .xlsx / .xls / .csv into bespoke inventory rows.
 * Uses paper-sheet column order as fallback so Cliente/Cant física still load
 * even when headers are odd or split across rows.
 */
export function parseBespokeInventoryWorkbook(
  data: ArrayBuffer,
  fileName = ""
): BespokeParseResult {
  const lower = fileName.toLowerCase();

  try {
    if (lower.endsWith(".csv") || lower.endsWith(".txt")) {
      const matrix = matrixFromCsv(data);
      return parseMatrix(matrix, "CSV", fileName);
    }

    const workbook = XLSX.read(data, {
      type: "array",
      raw: false,
      cellText: true,
      cellDates: false,
    });

    if (!workbook.SheetNames.length) {
      return emptyResult({ errors: ["El archivo no tiene hojas."] });
    }

    const { name, matrix } = pickBestSheet(workbook);
    return parseMatrix(matrix, name, fileName);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return emptyResult({
      errors: [`No se pudo leer el archivo: ${message}`],
    });
  }
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
