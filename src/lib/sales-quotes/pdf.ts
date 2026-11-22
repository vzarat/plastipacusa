import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFImage,
  type PDFPage,
} from "pdf-lib";
import { QUOTE_LOGO_DATA_URI } from "./logo-data";
import { quoteMerchandiseTotal } from "./totals";
import type { SalesQuoteRecord } from "./types";

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN = 40;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

const COLOR = {
  ink: rgb(0.06, 0.09, 0.16),
  muted: rgb(0.28, 0.33, 0.41),
  soft: rgb(0.39, 0.45, 0.55),
  brand: rgb(0.01, 0.41, 0.63),
  line: rgb(0.8, 0.84, 0.88),
  row: rgb(0.95, 0.96, 0.98),
  noticeBg: rgb(0.97, 0.98, 0.99),
};

function money(amount: number): string {
  return `$${Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function termsLabel(terms: string): string {
  return terms === "net_30" ? "Net 30 (approved credit)" : "Prepayment required";
}

function formatIssuedAt(iso?: string | null): string {
  const date = iso ? new Date(iso) : new Date();
  return date.toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZoneName: "short",
  });
}

function linePackageLabel(line: SalesQuoteRecord["items"][number]): string {
  if (line.application === "machine") {
    return `${line.tierLabel} · ${line.rollsPerPackage} rolls`;
  }
  if (line.boxesPerPackage > 1) {
    return `${line.tierLabel} · ${line.boxesPerPackage} boxes`;
  }
  return `${line.tierLabel} · 1 box`;
}

function logoBytes(): Uint8Array | null {
  const match = QUOTE_LOGO_DATA_URI.match(/^data:image\/png;base64,(.+)$/);
  if (!match?.[1]) return null;
  try {
    return Uint8Array.from(Buffer.from(match[1], "base64"));
  } catch {
    return null;
  }
}

function drawText(
  page: PDFPage,
  text: string,
  x: number,
  y: number,
  font: PDFFont,
  size: number,
  color = COLOR.ink,
  options?: { maxWidth?: number; align?: "left" | "right" }
) {
  let value = text || "";
  if (options?.maxWidth) {
    while (value.length > 3 && font.widthOfTextAtSize(value, size) > options.maxWidth) {
      value = `${value.slice(0, -4)}…`;
    }
  }
  const width = font.widthOfTextAtSize(value, size);
  const drawX =
    options?.align === "right" ? x - width : x;
  page.drawText(value, { x: drawX, y, size, font, color });
  return width;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = (text || "").split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines: string[] = [];
  let current = words[0];
  for (let i = 1; i < words.length; i += 1) {
    const next = `${current} ${words[i]}`;
    if (font.widthOfTextAtSize(next, size) <= maxWidth) {
      current = next;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines;
}

export async function buildSalesQuotePdfBuffer(input: {
  quote: SalesQuoteRecord;
  acceptUrl: string;
  issuedAt?: string | null;
}): Promise<Buffer> {
  const { quote, acceptUrl } = input;
  const merchandiseTotal = quoteMerchandiseTotal(quote);
  const issuedLabel = formatIssuedAt(
    input.issuedAt || quote.updatedAt || quote.createdAt
  );
  const validUntil = new Date(quote.validUntil).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const pdf = await PDFDocument.create();
  pdf.setTitle(`${quote.quoteNumber} — Plastipac USA`);
  pdf.setAuthor("Plastipac USA");
  pdf.setSubject(
    `Sales quote for ${
      quote.companyName || quote.contactName || quote.phone || "prospect"
    }`
  );

  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let logo: PDFImage | null = null;
  const bytes = logoBytes();
  if (bytes) {
    try {
      logo = await pdf.embedPng(bytes);
    } catch {
      logo = null;
    }
  }

  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;

  const ensureSpace = (needed: number) => {
    if (y - needed < MARGIN + 56) {
      drawFooter(page, font, acceptUrl);
      page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = PAGE_HEIGHT - MARGIN;
    }
  };

  // Header
  if (logo) {
    const logoW = 168;
    const logoH = (logo.height / logo.width) * logoW;
    page.drawImage(logo, {
      x: MARGIN,
      y: y - logoH,
      width: logoW,
      height: logoH,
    });
  } else {
    drawText(page, "Plastipac USA", MARGIN, y - 18, bold, 16, COLOR.brand);
  }

  drawText(page, "SALES QUOTE", PAGE_WIDTH - MARGIN, y - 14, bold, 13, COLOR.ink, {
    align: "right",
  });
  drawText(page, quote.quoteNumber, PAGE_WIDTH - MARGIN, y - 28, font, 8, COLOR.muted, {
    align: "right",
  });
  drawText(
    page,
    `Issued: ${issuedLabel}`,
    PAGE_WIDTH - MARGIN,
    y - 40,
    font,
    8,
    COLOR.muted,
    { align: "right" }
  );
  drawText(
    page,
    `Valid through ${validUntil}`,
    PAGE_WIDTH - MARGIN,
    y - 52,
    font,
    8,
    COLOR.muted,
    { align: "right" }
  );
  drawText(
    page,
    termsLabel(quote.paymentTerms),
    PAGE_WIDTH - MARGIN,
    y - 64,
    font,
    8,
    COLOR.muted,
    { align: "right" }
  );

  y -= 78;
  drawText(
    page,
    "Industrial stretch film · Manual & Automatic",
    MARGIN,
    y,
    font,
    8,
    COLOR.soft
  );
  y -= 12;
  drawText(
    page,
    "contact@plastipacusa.com · plastipacusa.com",
    MARGIN,
    y,
    font,
    8,
    COLOR.soft
  );

  y -= 14;
  page.drawLine({
    start: { x: MARGIN, y },
    end: { x: PAGE_WIDTH - MARGIN, y },
    thickness: 2,
    color: COLOR.brand,
  });

  y -= 22;
  const colLeft = MARGIN;
  const colRight = MARGIN + CONTENT_WIDTH / 2 + 10;
  const colWidth = CONTENT_WIDTH / 2 - 12;

  drawText(page, "PREPARED FOR", colLeft, y, bold, 9, COLOR.brand);
  drawText(page, "QUOTE SCOPE", colRight, y, bold, 9, COLOR.brand);

  let leftY = y - 14;
  let rightY = y - 14;

  const preparedForTitle =
    quote.companyName?.trim() ||
    quote.contactName?.trim() ||
    quote.phone?.trim() ||
    "Prospect";
  drawText(page, preparedForTitle, colLeft, leftY, bold, 10, COLOR.ink, {
    maxWidth: colWidth,
  });
  leftY -= 14;

  if (quote.companyName?.trim() && quote.contactName?.trim()) {
    drawText(page, quote.contactName, colLeft, leftY, font, 8, COLOR.muted, {
      maxWidth: colWidth,
    });
    leftY -= 12;
  }
  if (quote.email?.trim()) {
    drawText(page, quote.email, colLeft, leftY, font, 8, COLOR.muted, {
      maxWidth: colWidth,
    });
    leftY -= 12;
  }
  if (quote.phone?.trim()) {
    drawText(page, quote.phone, colLeft, leftY, font, 8, COLOR.muted, {
      maxWidth: colWidth,
    });
    leftY -= 12;
  }
  if (quote.shippingZip?.trim()) {
    drawText(
      page,
      `Ship ZIP ${quote.shippingZip}${
        quote.shippingCity ? ` · ${quote.shippingCity}` : ""
      }${quote.shippingState ? `, ${quote.shippingState}` : ""}`,
      colLeft,
      leftY,
      font,
      8,
      COLOR.muted,
      { maxWidth: colWidth }
    );
    leftY -= 12;
  }

  const scopeLines = wrapText(
    "Merchandise only — shipping and sales tax are calculated at checkout.",
    font,
    8,
    colWidth
  );
  for (const line of scopeLines) {
    drawText(page, line, colRight, rightY, font, 8, COLOR.muted, {
      maxWidth: colWidth,
    });
    rightY -= 11;
  }
  rightY -= 4;
  drawText(
    page,
    `Est. pallets: ${Number(quote.palletCount || 0).toFixed(2)}`,
    colRight,
    rightY,
    font,
    8,
    COLOR.muted,
    { maxWidth: colWidth }
  );
  rightY -= 12;
  if (Number(quote.weightLbs || 0) > 0) {
    drawText(
      page,
      `Est. product weight: ${Number(quote.weightLbs || 0).toLocaleString("en-US")} lbs`,
      colRight,
      rightY,
      font,
      8,
      COLOR.muted,
      { maxWidth: colWidth }
    );
    rightY -= 12;
  }

  y = Math.min(leftY, rightY) - 14;
  drawText(page, "LINE ITEMS", MARGIN, y, bold, 9, COLOR.brand);
  y -= 8;

  const cols = {
    desc: MARGIN + 4,
    sku: MARGIN + CONTENT_WIDTH * 0.42,
    qty: MARGIN + CONTENT_WIDTH * 0.62,
    unit: MARGIN + CONTENT_WIDTH * 0.72,
    total: PAGE_WIDTH - MARGIN - 4,
  };

  page.drawRectangle({
    x: MARGIN,
    y: y - 14,
    width: CONTENT_WIDTH,
    height: 18,
    color: COLOR.row,
  });
  drawText(page, "Description", cols.desc, y - 8, bold, 8, COLOR.muted);
  drawText(page, "SKU", cols.sku, y - 8, bold, 8, COLOR.muted);
  drawText(page, "Qty", cols.qty + 36, y - 8, bold, 8, COLOR.muted, {
    align: "right",
  });
  drawText(page, "Unit", cols.unit + 48, y - 8, bold, 8, COLOR.muted, {
    align: "right",
  });
  drawText(page, "Total", cols.total, y - 8, bold, 8, COLOR.muted, {
    align: "right",
  });
  y -= 20;

  for (const line of quote.items) {
    ensureSpace(34);
    drawText(page, line.productName || line.sku, cols.desc, y, font, 8, COLOR.ink, {
      maxWidth: cols.sku - cols.desc - 8,
    });
    drawText(page, line.sku, cols.sku, y, font, 8, COLOR.ink, {
      maxWidth: cols.qty - cols.sku - 8,
    });
    drawText(page, String(line.quantity), cols.qty + 36, y, font, 8, COLOR.ink, {
      align: "right",
    });
    drawText(page, money(line.unitPrice), cols.unit + 48, y, font, 8, COLOR.ink, {
      align: "right",
    });
    drawText(page, money(line.lineTotal), cols.total, y, font, 8, COLOR.ink, {
      align: "right",
    });
    y -= 11;
    drawText(page, linePackageLabel(line), cols.desc, y, font, 7, COLOR.soft, {
      maxWidth: cols.sku - cols.desc - 8,
    });
    y -= 8;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_WIDTH - MARGIN, y },
      thickness: 0.5,
      color: COLOR.line,
    });
    y -= 10;
  }

  ensureSpace(120);
  const boxW = 210;
  const boxX = PAGE_WIDTH - MARGIN - boxW;
  const boxH = quote.discountAmount > 0 ? 62 : 48;
  page.drawRectangle({
    x: boxX,
    y: y - boxH,
    width: boxW,
    height: boxH,
    borderColor: COLOR.line,
    borderWidth: 1,
  });

  let ty = y - 16;
  drawText(page, "Subtotal", boxX + 10, ty, font, 9, COLOR.ink);
  drawText(page, money(quote.subtotal), boxX + boxW - 10, ty, font, 9, COLOR.ink, {
    align: "right",
  });
  if (quote.discountAmount > 0) {
    ty -= 14;
    drawText(page, "Discount", boxX + 10, ty, font, 9, COLOR.ink);
    drawText(
      page,
      `-${money(quote.discountAmount)}`,
      boxX + boxW - 10,
      ty,
      font,
      9,
      COLOR.ink,
      { align: "right" }
    );
  }
  ty -= 10;
  page.drawLine({
    start: { x: boxX + 10, y: ty },
    end: { x: boxX + boxW - 10, y: ty },
    thickness: 1,
    color: COLOR.soft,
  });
  ty -= 14;
  drawText(page, "Quote total (USD)", boxX + 10, ty, bold, 9, COLOR.ink);
  drawText(
    page,
    money(merchandiseTotal),
    boxX + boxW - 10,
    ty,
    bold,
    9,
    COLOR.ink,
    { align: "right" }
  );

  y -= boxH + 16;
  ensureSpace(70);
  const noticeLines = wrapText(
    "Product pricing only. Sales tax and shipping are calculated at checkout. Freight is quoted through multiple carriers on our site, so rates depend on destination and the service you select.",
    font,
    7.5,
    CONTENT_WIDTH - 20
  );
  const noticeH = 22 + noticeLines.length * 10;
  page.drawRectangle({
    x: MARGIN,
    y: y - noticeH,
    width: CONTENT_WIDTH,
    height: noticeH,
    color: COLOR.noticeBg,
    borderColor: COLOR.line,
    borderWidth: 1,
  });
  drawText(page, "Shipping & tax", MARGIN + 10, y - 12, bold, 8, COLOR.brand);
  noticeLines.forEach((line, i) => {
    drawText(page, line, MARGIN + 10, y - 24 - i * 10, font, 7.5, COLOR.muted);
  });
  y -= noticeH + 16;

  if (quote.notes) {
    ensureSpace(40);
    drawText(page, "NOTES", MARGIN, y, bold, 9, COLOR.brand);
    y -= 12;
    const noteLines = wrapText(quote.notes, font, 8, CONTENT_WIDTH);
    for (const line of noteLines) {
      ensureSpace(14);
      drawText(page, line, MARGIN, y, font, 8, COLOR.muted);
      y -= 11;
    }
  }

  drawFooter(page, font, acceptUrl);

  const pdfBytes = await pdf.save();
  return Buffer.from(pdfBytes);
}

function drawFooter(page: PDFPage, font: PDFFont, acceptUrl: string) {
  const y = 36;
  page.drawLine({
    start: { x: MARGIN, y: y + 18 },
    end: { x: PAGE_WIDTH - MARGIN, y: y + 18 },
    thickness: 1,
    color: COLOR.line,
  });
  drawText(page, `Accept online: ${acceptUrl}`, MARGIN, y + 6, font, 7.5, COLOR.soft, {
    maxWidth: CONTENT_WIDTH,
  });
  drawText(
    page,
    "Prices in USD. This document is a sales quotation, not an invoice. Final amounts for tax and shipping appear at checkout.",
    MARGIN,
    y - 6,
    font,
    7.5,
    COLOR.soft,
    { maxWidth: CONTENT_WIDTH }
  );
}
