import type { LeadImportRow } from "@/lib/campaigns/types";

function normalizeHeader(value: string): string {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function splitCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (ch === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  cells.push(current.trim());
  return cells;
}

const EMAIL_ALIASES = new Set(["email", "email_address", "e_mail", "work_email"]);
const COMPANY_ALIASES = new Set(["company", "company_name", "business", "business_name"]);
const NAME_ALIASES = new Set([
  "name",
  "contact",
  "contact_name",
  "full_name",
  "fullname",
]);
const PHONE_ALIASES = new Set(["phone", "phone_number", "mobile", "tel"]);
const ZIP_ALIASES = new Set(["zip", "zip_code", "postal", "postal_code"]);
const TAGS_ALIASES = new Set(["tags", "tag", "segment", "segments"]);

function pick(headers: string[], row: string[], aliases: Set<string>): string {
  const index = headers.findIndex((header) => aliases.has(header));
  if (index < 0) return "";
  return String(row[index] || "").trim();
}

/**
 * Parse a lead CSV. First row must be headers.
 * Required: email (or email_address).
 */
export function parseLeadsCsv(csvText: string): {
  rows: LeadImportRow[];
  errors: string[];
} {
  const lines = String(csvText || "")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    return { rows: [], errors: ["CSV must include a header row and at least one data row."] };
  }

  const headers = splitCsvLine(lines[0]).map(normalizeHeader);
  if (!headers.some((header) => EMAIL_ALIASES.has(header))) {
    return {
      rows: [],
      errors: ["CSV must include an email column (email, email_address, or work_email)."],
    };
  }

  const rows: LeadImportRow[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i += 1) {
    const cells = splitCsvLine(lines[i]);
    const email = pick(headers, cells, EMAIL_ALIASES).toLowerCase();
    if (!email) {
      errors.push(`Row ${i + 1}: missing email.`);
      continue;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push(`Row ${i + 1}: invalid email "${email}".`);
      continue;
    }

    const tagsRaw = pick(headers, cells, TAGS_ALIASES);
    const tags = tagsRaw
      ? tagsRaw
          .split(/[|;,]/)
          .map((tag) => tag.trim().toLowerCase())
          .filter(Boolean)
      : [];

    rows.push({
      email,
      companyName: pick(headers, cells, COMPANY_ALIASES),
      contactName: pick(headers, cells, NAME_ALIASES),
      phone: pick(headers, cells, PHONE_ALIASES),
      zipCode: pick(headers, cells, ZIP_ALIASES),
      tags,
      source: "csv",
    });
  }

  return { rows, errors };
}
