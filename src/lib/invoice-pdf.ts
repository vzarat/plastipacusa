/**
 * Zero-dependency PDF invoice builder (PDF 1.4).
 * Produces a valid application/pdf buffer without jspdf / react-pdf.
 */

export interface InvoicePdfItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoicePdfData {
  invoiceNumber: string;
  orderPoRef: string;
  issueDate: string;
  paymentStatus: string;
  customerName?: string;
  customerCompany?: string;
  customerEmail?: string;
  items: InvoicePdfItem[];
  totalUsd: number;
}

const PAGE_W = 612;
const PAGE_H = 792;

function pdfEscape(text: string): string {
  return String(text ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, "?");
}

function money(n: number): string {
  const v = Number.isFinite(n) ? n : 0;
  return `$${v.toFixed(2)}`;
}

function buildContentStream(data: InvoicePdfData): string {
  const lines: string[] = [];

  const pushText = (
    x: number,
    y: number,
    text: string,
    opts?: { font?: "F1" | "F2"; size?: number }
  ) => {
    const font = opts?.font || "F1";
    const size = opts?.size || 10;
    lines.push("BT");
    lines.push(`/${font} ${size} Tf`);
    lines.push(`${x} ${y} Td`);
    lines.push(`(${pdfEscape(text)}) Tj`);
    lines.push("ET");
  };

  // Header bar
  lines.push("0.086 0.467 0.722 rg");
  lines.push(`0 ${PAGE_H - 96} ${PAGE_W} 96 re`);
  lines.push("f");

  // Brand mark (logo stand-in — raster SVG logos are not embeddable without a PDF image codec)
  lines.push("1 1 1 rg");
  lines.push("24 720 110 36 re");
  lines.push("f");
  lines.push("0.086 0.467 0.722 rg");
  pushText(32, 734, "PLASTIPAC", { font: "F2", size: 11 });
  pushText(32, 722, "USA", { font: "F2", size: 14 });

  lines.push("1 1 1 rg");
  pushText(150, 748, "PLASTIPAC USA", { font: "F2", size: 18 });
  pushText(150, 730, "Industrial High-Performance Stretch Film", {
    font: "F1",
    size: 9,
  });
  pushText(150, 716, "Factory-Direct Packaging Solutions", {
    font: "F1",
    size: 9,
  });

  pushText(380, 748, "www.plastipacusa.com", { font: "F1", size: 9 });
  pushText(380, 734, "sales@plastipacusa.com", { font: "F1", size: 9 });
  pushText(380, 720, "Phone: (956) 400-3683", { font: "F2", size: 10 });

  lines.push("0.06 0.09 0.16 rg");
  pushText(40, 670, "COMMERCIAL INVOICE / STATEMENT", {
    font: "F2",
    size: 14,
  });

  lines.push("0.95 0.97 0.99 rg");
  lines.push("40 575 532 75 re");
  lines.push("f");
  lines.push("0.80 0.86 0.92 RG");
  lines.push("40 575 532 75 re");
  lines.push("S");

  lines.push("0.06 0.09 0.16 rg");
  pushText(50, 632, "Invoice Number:", { font: "F1", size: 9 });
  pushText(140, 632, data.invoiceNumber, { font: "F2", size: 10 });
  pushText(50, 616, "Order / PO Ref:", { font: "F1", size: 9 });
  pushText(140, 616, data.orderPoRef, { font: "F2", size: 10 });
  pushText(50, 600, "Issue Date:", { font: "F1", size: 9 });
  pushText(140, 600, data.issueDate, { font: "F2", size: 10 });
  pushText(50, 584, "Payment Status:", { font: "F1", size: 9 });
  pushText(140, 584, data.paymentStatus, { font: "F2", size: 10 });

  pushText(340, 632, "Bill To:", { font: "F1", size: 9 });
  pushText(
    340,
    616,
    data.customerCompany || data.customerName || "Valued Customer",
    { font: "F2", size: 10 }
  );
  if (data.customerName && data.customerCompany) {
    pushText(340, 600, data.customerName, { font: "F1", size: 9 });
  }
  if (data.customerEmail) {
    pushText(340, 584, data.customerEmail, { font: "F1", size: 9 });
  }

  const tableTop = 545;
  lines.push("0.086 0.467 0.722 rg");
  lines.push(`40 ${tableTop - 18} 532 22 re`);
  lines.push("f");
  lines.push("1 1 1 rg");
  pushText(50, tableTop - 12, "Product Description", { font: "F2", size: 9 });
  pushText(320, tableTop - 12, "Qty", { font: "F2", size: 9 });
  pushText(370, tableTop - 12, "Unit Price", { font: "F2", size: 9 });
  pushText(470, tableTop - 12, "Total", { font: "F2", size: 9 });

  let y = tableTop - 36;
  const items =
    data.items.length > 0
      ? data.items
      : [
          {
            description: "Industrial Stretch Packaging Order",
            quantity: 1,
            unitPrice: data.totalUsd,
            total: data.totalUsd,
          },
        ];

  items.slice(0, 18).forEach((item, index) => {
    if (index % 2 === 0) {
      lines.push("0.97 0.98 0.99 rg");
      lines.push(`40 ${y - 6} 532 18 re`);
      lines.push("f");
    }
    lines.push("0.06 0.09 0.16 rg");
    const desc =
      item.description.length > 48
        ? `${item.description.slice(0, 45)}...`
        : item.description;
    pushText(50, y, desc, { font: "F1", size: 9 });
    pushText(320, y, String(item.quantity || 0), { font: "F1", size: 9 });
    pushText(370, y, money(item.unitPrice), { font: "F1", size: 9 });
    pushText(470, y, money(item.total), { font: "F2", size: 9 });
    y -= 20;
  });

  y -= 10;
  lines.push("0.80 0.86 0.92 RG");
  lines.push(`360 ${y + 10} 212 0.8 re`);
  lines.push("S");
  lines.push("0.06 0.09 0.16 rg");
  pushText(370, y - 4, "Amount Due (USD)", { font: "F1", size: 10 });
  pushText(470, y - 4, money(data.totalUsd), { font: "F2", size: 12 });

  lines.push("0.45 0.52 0.60 rg");
  pushText(
    40,
    56,
    "Thank you for your business. Questions? Call (956) 400-3683 or email sales@plastipacusa.com",
    { font: "F1", size: 8 }
  );
  pushText(
    40,
    42,
    "Plastipac USA LLC  |  Official factory-direct commercial statement",
    { font: "F1", size: 8 }
  );

  return lines.join("\n");
}

function buildPdfDocument(contentStream: string): Uint8Array {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const pushStr = (s: string) => parts.push(encoder.encode(s));

  pushStr("%PDF-1.4\n");

  const offsets: number[] = [0];
  let offset = encoder.encode("%PDF-1.4\n").length;

  const addObject = (body: string) => {
    offsets.push(offset);
    const chunk = `${offsets.length - 1} 0 obj\n${body}\nendobj\n`;
    const bytes = encoder.encode(chunk);
    parts.push(bytes);
    offset += bytes.length;
  };

  const streamBytes = encoder.encode(contentStream);

  addObject("<< /Type /Catalog /Pages 2 0 R >>");
  addObject("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  addObject(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>`
  );

  // Object 4: content stream
  offsets.push(offset);
  const streamHeader = `4 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n`;
  const streamFooter = `\nendstream\nendobj\n`;
  const headerBytes = encoder.encode(streamHeader);
  const footerBytes = encoder.encode(streamFooter);
  parts.push(headerBytes);
  parts.push(streamBytes);
  parts.push(footerBytes);
  offset += headerBytes.length + streamBytes.length + footerBytes.length;

  addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  addObject("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

  const xrefOffset = offset;
  let xref = `xref\n0 ${offsets.length}\n`;
  xref += "0000000000 65535 f \n";
  for (let i = 1; i < offsets.length; i += 1) {
    xref += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\n`;
  xref += `startxref\n${xrefOffset}\n%%EOF`;
  pushStr(xref);

  const total = parts.reduce((sum, p) => sum + p.length, 0);
  const out = new Uint8Array(total);
  let pos = 0;
  for (const part of parts) {
    out.set(part, pos);
    pos += part.length;
  }
  return out;
}

export function generateInvoicePdf(data: InvoicePdfData): Uint8Array {
  return buildPdfDocument(buildContentStream(data));
}

export function sanitizeInvoiceFilename(orderPoRef: string): string {
  const safe = String(orderPoRef || "invoice")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `order-${safe || "invoice"}.pdf`;
}
