import PDFDocument from "pdfkit";
import { QUOTE_LOGO_DATA_URI } from "./logo-data";
import { quoteMerchandiseTotal } from "./totals";
import type { SalesQuoteRecord } from "./types";

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

function logoBuffer(): Buffer | null {
  const match = QUOTE_LOGO_DATA_URI.match(/^data:image\/png;base64,(.+)$/);
  if (!match?.[1]) return null;
  try {
    return Buffer.from(match[1], "base64");
  } catch {
    return null;
  }
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

  const doc = new PDFDocument({
    size: "LETTER",
    margins: { top: 36, bottom: 56, left: 40, right: 40 },
    info: {
      Title: `${quote.quoteNumber} — Plastipac USA`,
      Author: "Plastipac USA",
      Subject: `Sales quote for ${quote.companyName || quote.contactName}`,
    },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const pageWidth =
    doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;

  const logo = logoBuffer();
  if (logo) {
    doc.image(logo, left, 34, { width: 168, height: 46, fit: [168, 46] });
  } else {
    doc
      .fillColor("#0369a1")
      .font("Helvetica-Bold")
      .fontSize(16)
      .text("Plastipac USA", left, 40);
  }

  doc
    .fillColor("#64748b")
    .font("Helvetica")
    .fontSize(8)
    .text("Industrial stretch film · Manual & Automatic", left, 84, {
      width: 220,
    })
    .text("contact@plastipacusa.com · plastipacusa.com", left, 96, {
      width: 220,
    });

  doc
    .fillColor("#0f172a")
    .font("Helvetica-Bold")
    .fontSize(13)
    .text("SALES QUOTE", left + pageWidth - 210, 36, {
      width: 210,
      align: "right",
    });
  doc
    .fillColor("#475569")
    .font("Helvetica")
    .fontSize(8)
    .text(quote.quoteNumber, left + pageWidth - 210, 54, {
      width: 210,
      align: "right",
    })
    .text(`Issued: ${issuedLabel}`, left + pageWidth - 210, 66, {
      width: 210,
      align: "right",
    })
    .text(`Valid through ${validUntil}`, left + pageWidth - 210, 78, {
      width: 210,
      align: "right",
    })
    .text(termsLabel(quote.paymentTerms), left + pageWidth - 210, 90, {
      width: 210,
      align: "right",
    });

  doc
    .moveTo(left, 118)
    .lineTo(right, 118)
    .lineWidth(2)
    .strokeColor("#0369a1")
    .stroke();

  let y = 132;
  doc
    .fillColor("#0369a1")
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("PREPARED FOR", left, y);
  doc
    .fillColor("#0369a1")
    .text("QUOTE SCOPE", left + pageWidth / 2 + 10, y);

  y += 14;
  doc
    .fillColor("#0f172a")
    .font("Helvetica-Bold")
    .fontSize(10)
    .text(quote.companyName || "—", left, y, { width: pageWidth / 2 - 12 });
  doc
    .fillColor("#475569")
    .font("Helvetica")
    .fontSize(8)
    .text(
      "Merchandise only — shipping and sales tax are calculated at checkout.",
      left + pageWidth / 2 + 10,
      y,
      { width: pageWidth / 2 - 12 }
    );

  y += 14;
  doc
    .fillColor("#475569")
    .font("Helvetica")
    .fontSize(8)
    .text(quote.contactName || "", left, y, { width: pageWidth / 2 - 12 });
  doc.text(
    `Est. pallets: ${Number(quote.palletCount || 0).toFixed(2)}`,
    left + pageWidth / 2 + 10,
    y,
    { width: pageWidth / 2 - 12 }
  );

  y += 12;
  doc.text(quote.email || "", left, y, { width: pageWidth / 2 - 12 });
  if (Number(quote.weightLbs || 0) > 0) {
    doc.text(
      `Est. product weight: ${Number(quote.weightLbs || 0).toLocaleString("en-US")} lbs`,
      left + pageWidth / 2 + 10,
      y,
      { width: pageWidth / 2 - 12 }
    );
  }

  y += 12;
  if (quote.phone) {
    doc.text(quote.phone, left, y, { width: pageWidth / 2 - 12 });
    y += 12;
  }
  doc.text(
    `Ship ZIP ${quote.shippingZip}${
      quote.shippingCity ? ` · ${quote.shippingCity}` : ""
    }${quote.shippingState ? `, ${quote.shippingState}` : ""}`,
    left,
    y,
    { width: pageWidth / 2 - 12 }
  );

  y += 24;
  doc
    .fillColor("#0369a1")
    .font("Helvetica-Bold")
    .fontSize(9)
    .text("LINE ITEMS", left, y);
  y += 14;

  const cols = {
    desc: left,
    sku: left + pageWidth * 0.42,
    qty: left + pageWidth * 0.62,
    unit: left + pageWidth * 0.72,
    total: left + pageWidth * 0.85,
  };
  const descW = cols.sku - cols.desc - 6;
  const skuW = cols.qty - cols.sku - 6;
  const qtyW = cols.unit - cols.qty - 4;
  const unitW = cols.total - cols.unit - 4;
  const totalW = right - cols.total;

  doc.rect(left, y - 4, pageWidth, 18).fill("#f1f5f9");
  doc
    .fillColor("#334155")
    .font("Helvetica-Bold")
    .fontSize(8)
    .text("Description", cols.desc + 4, y, { width: descW })
    .text("SKU", cols.sku, y, { width: skuW })
    .text("Qty", cols.qty, y, { width: qtyW, align: "right" })
    .text("Unit", cols.unit, y, { width: unitW, align: "right" })
    .text("Total", cols.total, y, { width: totalW, align: "right" });

  y += 18;
  doc
    .moveTo(left, y)
    .lineTo(right, y)
    .lineWidth(1)
    .strokeColor("#cbd5e1")
    .stroke();
  y += 6;

  for (const line of quote.items) {
    const packageLabel = linePackageLabel(line);
    const rowHeight = 28;
    if (y + rowHeight > doc.page.height - 90) {
      doc.addPage();
      y = 48;
    }

    doc
      .fillColor("#0f172a")
      .font("Helvetica")
      .fontSize(8)
      .text(line.productName || line.sku, cols.desc + 4, y, {
        width: descW,
        ellipsis: true,
      });
    doc
      .fillColor("#64748b")
      .fontSize(7)
      .text(packageLabel, cols.desc + 4, y + 11, {
        width: descW,
        ellipsis: true,
      });

    doc
      .fillColor("#0f172a")
      .fontSize(8)
      .text(line.sku, cols.sku, y + 4, { width: skuW, ellipsis: true })
      .text(String(line.quantity), cols.qty, y + 4, {
        width: qtyW,
        align: "right",
      })
      .text(money(line.unitPrice), cols.unit, y + 4, {
        width: unitW,
        align: "right",
      })
      .text(money(line.lineTotal), cols.total, y + 4, {
        width: totalW,
        align: "right",
      });

    y += rowHeight;
    doc
      .moveTo(left, y - 4)
      .lineTo(right, y - 4)
      .lineWidth(0.5)
      .strokeColor("#e2e8f0")
      .stroke();
  }

  y += 8;
  const boxX = right - 210;
  const boxW = 210;
  doc.rect(boxX, y, boxW, quote.discountAmount > 0 ? 62 : 48)
    .lineWidth(1)
    .strokeColor("#cbd5e1")
    .stroke();

  let ty = y + 10;
  doc
    .fillColor("#0f172a")
    .font("Helvetica")
    .fontSize(9)
    .text("Subtotal", boxX + 10, ty)
    .text(money(quote.subtotal), boxX + 10, ty, {
      width: boxW - 20,
      align: "right",
    });
  ty += 14;
  if (quote.discountAmount > 0) {
    doc
      .text("Discount", boxX + 10, ty)
      .text(`-${money(quote.discountAmount)}`, boxX + 10, ty, {
        width: boxW - 20,
        align: "right",
      });
    ty += 14;
  }
  doc
    .moveTo(boxX + 10, ty)
    .lineTo(boxX + boxW - 10, ty)
    .strokeColor("#94a3b8")
    .stroke();
  ty += 8;
  doc
    .font("Helvetica-Bold")
    .text("Quote total (USD)", boxX + 10, ty)
    .text(money(merchandiseTotal), boxX + 10, ty, {
      width: boxW - 20,
      align: "right",
    });

  y += quote.discountAmount > 0 ? 78 : 64;
  doc.rect(left, y, pageWidth, 46).fill("#f8fafc");
  doc.rect(left, y, pageWidth, 46).lineWidth(1).strokeColor("#e2e8f0").stroke();
  doc
    .fillColor("#0369a1")
    .font("Helvetica-Bold")
    .fontSize(8)
    .text("Shipping & tax", left + 10, y + 8);
  doc
    .fillColor("#475569")
    .font("Helvetica")
    .fontSize(7.5)
    .text(
      "Product pricing only. Sales tax and shipping are calculated at checkout. Freight is quoted through multiple carriers on our site, so rates depend on destination and the service you select.",
      left + 10,
      y + 20,
      { width: pageWidth - 20, lineGap: 1.5 }
    );

  y += 58;
  if (quote.notes) {
    if (y > doc.page.height - 100) {
      doc.addPage();
      y = 48;
    }
    doc
      .fillColor("#0369a1")
      .font("Helvetica-Bold")
      .fontSize(9)
      .text("NOTES", left, y);
    y += 12;
    doc
      .fillColor("#334155")
      .font("Helvetica")
      .fontSize(8)
      .text(quote.notes, left, y, { width: pageWidth, lineGap: 2 });
  }

  const footerY = doc.page.height - 48;
  doc
    .moveTo(left, footerY)
    .lineTo(right, footerY)
    .lineWidth(1)
    .strokeColor("#e2e8f0")
    .stroke();
  doc
    .fillColor("#64748b")
    .font("Helvetica")
    .fontSize(7.5)
    .text(`Accept online: ${acceptUrl}`, left, footerY + 8, {
      width: pageWidth,
    })
    .text(
      "Prices in USD. This document is a sales quotation, not an invoice. Final amounts for tax and shipping appear at checkout.",
      left,
      footerY + 20,
      { width: pageWidth }
    );

  doc.end();

  await new Promise<void>((resolve, reject) => {
    doc.on("end", () => resolve());
    doc.on("error", reject);
  });

  return Buffer.concat(chunks);
}
