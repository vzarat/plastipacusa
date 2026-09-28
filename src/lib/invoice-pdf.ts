/**
 * Zero-dependency PDF invoice builder (PDF 1.4) with optional embedded logo image.
 */

import { inflateSync } from "zlib";
import { ImageResponse } from "next/og";
import React from "react";

export interface InvoicePdfItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface InvoiceLogoImage {
  width: number;
  height: number;
  /** Raw RGB bytes (3 bytes per pixel, top-to-bottom rows). */
  rgb: Uint8Array;
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
  logo?: InvoiceLogoImage | null;
}

export const PLASTIPAC_LOGO_SVG_URL =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PLASTIPAC_USA_LOGO%202.svg";

const PAGE_W = 612;
const PAGE_H = 792;

/** Large top-left logo area on the clean white header */
const LOGO_BOX = { x: 36, y: 698, w: 240, h: 78 };

/** Small US flag icon next to contact block (top-right) */
const FLAG_BOX = { x: 372, y: 758, w: 24, h: 15 };

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

function fitInsideBox(
  imgW: number,
  imgH: number,
  box: { x: number; y: number; w: number; h: number },
  padding = 2,
  align: "center" | "left" = "center"
) {
  const availW = Math.max(1, box.w - padding * 2);
  const availH = Math.max(1, box.h - padding * 2);
  const scale = Math.min(availW / imgW, availH / imgH);
  const drawW = imgW * scale;
  const drawH = imgH * scale;
  return {
    x:
      align === "left"
        ? box.x + padding
        : box.x + (box.w - drawW) / 2,
    y: box.y + (box.h - drawH) / 2,
    w: drawW,
    h: drawH,
  };
}

/** Vector US flag drawn with PDF path ops (Helvetica cannot render emoji flags). */
function drawUsFlag(
  lines: string[],
  x: number,
  y: number,
  w: number,
  h: number
) {
  const stripeH = h / 13;
  for (let i = 0; i < 13; i += 1) {
    const isRed = i % 2 === 0;
    // Old Glory Red / White
    lines.push(isRed ? "0.698 0.132 0.203 rg" : "1 1 1 rg");
    lines.push(
      `${x.toFixed(2)} ${(y + (12 - i) * stripeH).toFixed(2)} ${w.toFixed(2)} ${stripeH.toFixed(2)} re`
    );
    lines.push("f");
  }

  const cantonW = w * 0.4;
  const cantonH = stripeH * 7;
  lines.push("0.239 0.231 0.431 rg"); // Old Glory Blue
  lines.push(
    `${x.toFixed(2)} ${(y + stripeH * 6).toFixed(2)} ${cantonW.toFixed(2)} ${cantonH.toFixed(2)} re`
  );
  lines.push("f");

  // Simplified star field as tiny white squares (readable at icon size)
  lines.push("1 1 1 rg");
  const cols = 5;
  const rows = 4;
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const sx = x + 2 + col * ((cantonW - 4) / cols) + 0.8;
      const sy = y + stripeH * 6 + 2 + row * ((cantonH - 4) / rows) + 0.6;
      lines.push(`${sx.toFixed(2)} ${sy.toFixed(2)} 1.1 1.1 re`);
      lines.push("f");
    }
  }

  // Crisp border
  lines.push("0.75 0.78 0.82 RG");
  lines.push("0.6 w");
  lines.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`);
  lines.push("S");
}

function buildContentStream(data: InvoicePdfData): string {
  const lines: string[] = [];
  const hasLogo = Boolean(data.logo && data.logo.width > 0 && data.logo.height > 0);

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

  // -------------------------------------------------------------------------
  // Clean WHITE header (no blue banner / no white plate around the logo)
  // -------------------------------------------------------------------------
  lines.push("1 1 1 rg");
  lines.push(`0 ${PAGE_H - 110} ${PAGE_W} 110 re`);
  lines.push("f");

  // Large logo — top left
  if (hasLogo && data.logo) {
    const fitted = fitInsideBox(
      data.logo.width,
      data.logo.height,
      LOGO_BOX,
      0,
      "left"
    );
    lines.push("q");
    lines.push(
      `${fitted.w.toFixed(2)} 0 0 ${fitted.h.toFixed(2)} ${fitted.x.toFixed(2)} ${fitted.y.toFixed(2)} cm`
    );
    lines.push("/Logo Do");
    lines.push("Q");
  } else {
    // Compact wordmark fallback only if logo rasterize fails
    lines.push("0.086 0.467 0.722 rg");
    pushText(LOGO_BOX.x, LOGO_BOX.y + 42, "PLASTIPAC USA", {
      font: "F2",
      size: 22,
    });
  }

  // US flag + contact block — top right
  drawUsFlag(lines, FLAG_BOX.x, FLAG_BOX.y, FLAG_BOX.w, FLAG_BOX.h);

  lines.push("0.06 0.09 0.16 rg");
  pushText(FLAG_BOX.x + FLAG_BOX.w + 8, 762, "Proudly Serving American Industry", {
    font: "F2",
    size: 9,
  });
  lines.push("0.29 0.33 0.39 rg");
  pushText(FLAG_BOX.x, 742, "www.plastipacusa.com", { font: "F1", size: 9 });
  pushText(FLAG_BOX.x, 728, "sales@plastipacusa.com", { font: "F1", size: 9 });
  lines.push("0.06 0.09 0.16 rg");
  pushText(FLAG_BOX.x, 712, "Phone: (956) 400-3683", { font: "F2", size: 10 });

  // Subtle separator under the white header
  lines.push("0.86 0.89 0.93 RG");
  lines.push("1 w");
  lines.push("36 688 m 576 688 l S");

  // Title + metadata (layout continuity below header)
  lines.push("0.06 0.09 0.16 rg");
  pushText(40, 668, "COMMERCIAL INVOICE / STATEMENT", {
    font: "F2",
    size: 14,
  });

  lines.push("0.95 0.97 0.99 rg");
  lines.push("40 573 532 75 re");
  lines.push("f");
  lines.push("0.80 0.86 0.92 RG");
  lines.push("40 573 532 75 re");
  lines.push("S");

  lines.push("0.06 0.09 0.16 rg");
  pushText(50, 630, "Invoice Number:", { font: "F1", size: 9 });
  pushText(140, 630, data.invoiceNumber, { font: "F2", size: 10 });
  pushText(50, 614, "Order / PO Ref:", { font: "F1", size: 9 });
  pushText(140, 614, data.orderPoRef, { font: "F2", size: 10 });
  pushText(50, 598, "Issue Date:", { font: "F1", size: 9 });
  pushText(140, 598, data.issueDate, { font: "F2", size: 10 });
  pushText(50, 582, "Payment Status:", { font: "F1", size: 9 });
  pushText(140, 582, data.paymentStatus, { font: "F2", size: 10 });

  pushText(340, 630, "Bill To:", { font: "F1", size: 9 });
  pushText(
    340,
    614,
    data.customerCompany || data.customerName || "Valued Customer",
    { font: "F2", size: 10 }
  );
  if (data.customerName && data.customerCompany) {
    pushText(340, 598, data.customerName, { font: "F1", size: 9 });
  }
  if (data.customerEmail) {
    pushText(340, 582, data.customerEmail, { font: "F1", size: 9 });
  }

  const tableTop = 543;
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

function buildPdfDocument(
  contentStream: string,
  logo?: InvoiceLogoImage | null
): Uint8Array {
  const encoder = new TextEncoder();
  const parts: Uint8Array[] = [];
  const pushStr = (s: string) => parts.push(encoder.encode(s));

  pushStr("%PDF-1.4\n");

  const offsets: number[] = [0];
  let offset = encoder.encode("%PDF-1.4\n").length;

  const addObject = (body: string | Uint8Array) => {
    offsets.push(offset);
    if (typeof body === "string") {
      const chunk = `${offsets.length - 1} 0 obj\n${body}\nendobj\n`;
      const bytes = encoder.encode(chunk);
      parts.push(bytes);
      offset += bytes.length;
      return;
    }
    const header = encoder.encode(
      `${offsets.length - 1} 0 obj\n`
    );
    const footer = encoder.encode(`\nendobj\n`);
    parts.push(header);
    parts.push(body);
    parts.push(footer);
    offset += header.length + body.length + footer.length;
  };

  const hasLogo = Boolean(logo && logo.width > 0 && logo.height > 0);
  const pageResources = hasLogo
    ? `/Resources << /Font << /F1 5 0 R /F2 6 0 R >> /XObject << /Logo 7 0 R >> >>`
    : `/Resources << /Font << /F1 5 0 R /F2 6 0 R >> >>`;

  const streamBytes = encoder.encode(contentStream);

  addObject("<< /Type /Catalog /Pages 2 0 R >>");
  addObject("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  addObject(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Contents 4 0 R ${pageResources} >>`
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

  if (hasLogo && logo) {
    const imageDict =
      `<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} ` +
      `/ColorSpace /DeviceRGB /BitsPerComponent 8 /Length ${logo.rgb.length} >>\nstream\n`;
    const imageHeader = encoder.encode(imageDict);
    const imageFooter = encoder.encode(`\nendstream`);
    const imageBody = new Uint8Array(
      imageHeader.length + logo.rgb.length + imageFooter.length
    );
    imageBody.set(imageHeader, 0);
    imageBody.set(logo.rgb, imageHeader.length);
    imageBody.set(imageFooter, imageHeader.length + logo.rgb.length);
    addObject(imageBody);
  }

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

/** Minimal PNG decoder for 8-bit RGB/RGBA non-interlaced PNGs (next/og output). */
function decodePngToRgb(png: Buffer): InvoiceLogoImage | null {
  if (png.length < 8) return null;
  const sig = [137, 80, 78, 71, 13, 10, 26, 10];
  for (let i = 0; i < 8; i += 1) {
    if (png[i] !== sig[i]) return null;
  }

  let width = 0;
  let height = 0;
  let bitDepth = 8;
  let colorType = 6;
  const compressed: Buffer[] = [];

  let offset = 8;
  while (offset + 8 <= png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > png.length) break;
    const chunk = png.subarray(dataStart, dataEnd);

    if (type === "IHDR") {
      width = chunk.readUInt32BE(0);
      height = chunk.readUInt32BE(4);
      bitDepth = chunk[8];
      colorType = chunk[9];
      if (bitDepth !== 8 || (colorType !== 2 && colorType !== 6)) {
        return null;
      }
    } else if (type === "IDAT") {
      compressed.push(Buffer.from(chunk));
    } else if (type === "IEND") {
      break;
    }

    offset = dataEnd + 4;
  }

  if (!width || !height || compressed.length === 0) return null;

  let inflated: Buffer;
  try {
    inflated = inflateSync(Buffer.concat(compressed));
  } catch {
    return null;
  }

  const bytesPerPixel = colorType === 6 ? 4 : 3;
  const stride = width * bytesPerPixel;
  const expected = (stride + 1) * height;
  if (inflated.length < expected) return null;

  const rgb = new Uint8Array(width * height * 3);
  const prev = new Uint8Array(stride);
  const curr = new Uint8Array(stride);

  const paeth = (a: number, b: number, c: number) => {
    const p = a + b - c;
    const pa = Math.abs(p - a);
    const pb = Math.abs(p - b);
    const pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) return a;
    if (pb <= pc) return b;
    return c;
  };

  for (let row = 0; row < height; row += 1) {
    const rowStart = row * (stride + 1);
    const filter = inflated[rowStart];
    for (let i = 0; i < stride; i += 1) {
      const x = inflated[rowStart + 1 + i];
      const a = i >= bytesPerPixel ? curr[i - bytesPerPixel] : 0;
      const b = prev[i];
      const c = i >= bytesPerPixel ? prev[i - bytesPerPixel] : 0;
      let val = x;
      if (filter === 1) val = (x + a) & 0xff;
      else if (filter === 2) val = (x + b) & 0xff;
      else if (filter === 3) val = (x + Math.floor((a + b) / 2)) & 0xff;
      else if (filter === 4) val = (x + paeth(a, b, c)) & 0xff;
      curr[i] = val;
    }

    for (let col = 0; col < width; col += 1) {
      const src = col * bytesPerPixel;
      const dest = (row * width + col) * 3;
      const alpha = bytesPerPixel === 4 ? curr[src + 3] / 255 : 1;
      // Composite onto white so transparent logo edges stay clean in the white plate
      rgb[dest] = Math.round(curr[src] * alpha + 255 * (1 - alpha));
      rgb[dest + 1] = Math.round(curr[src + 1] * alpha + 255 * (1 - alpha));
      rgb[dest + 2] = Math.round(curr[src + 2] * alpha + 255 * (1 - alpha));
    }

    prev.set(curr);
  }

  return { width, height, rgb };
}

/**
 * Fetch the official Plastipac SVG from Supabase and rasterize it to RGB
 * for PDF embedding (via next/og ImageResponse → PNG → raw RGB).
 */
export async function fetchPlastipacLogoForPdf(): Promise<InvoiceLogoImage | null> {
  try {
    // Prefer absolute CDN URL so next/og / Satori can resolve the SVG directly.
    // Fall back to an inlined data URL if the remote img render fails.
    let pngBuffer: Buffer | null = null;

    try {
      const remoteRaster = new ImageResponse(
        React.createElement(
          "div",
          {
            style: {
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#ffffff",
              padding: 12,
            },
          },
          React.createElement("img", {
            src: PLASTIPAC_LOGO_SVG_URL,
            width: 720,
            height: 200,
            style: { objectFit: "contain" },
          })
        ),
        { width: 760, height: 220 }
      );
      pngBuffer = Buffer.from(await remoteRaster.arrayBuffer());
    } catch (remoteErr: any) {
      console.warn(
        "Remote logo ImageResponse failed, trying inlined SVG:",
        remoteErr?.message || remoteErr
      );
    }

    if (!pngBuffer) {
      const svgRes = await fetch(PLASTIPAC_LOGO_SVG_URL, {
        cache: "force-cache",
      });
      if (!svgRes.ok) {
        console.warn("Plastipac logo fetch failed:", svgRes.status);
        return null;
      }

      const svgText = await svgRes.text();
      if (!svgText.includes("<svg")) {
        console.warn("Plastipac logo response was not SVG");
        return null;
      }

      const dataUrl = `data:image/svg+xml;base64,${Buffer.from(
        svgText,
        "utf8"
      ).toString("base64")}`;

      const inlineRaster = new ImageResponse(
        React.createElement(
          "div",
          {
            style: {
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#ffffff",
              padding: 12,
            },
          },
          React.createElement("img", {
            src: dataUrl,
            width: 720,
            height: 200,
            style: { objectFit: "contain" },
          })
        ),
        { width: 760, height: 220 }
      );
      pngBuffer = Buffer.from(await inlineRaster.arrayBuffer());
    }

    return decodePngToRgb(pngBuffer);
  } catch (err: any) {
    console.warn("Plastipac logo rasterize failed:", err?.message || err);
    return null;
  }
}

export function generateInvoicePdf(data: InvoicePdfData): Uint8Array {
  return buildPdfDocument(buildContentStream(data), data.logo);
}

export function sanitizeInvoiceFilename(orderPoRef: string): string {
  const safe = String(orderPoRef || "invoice")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return `order-${safe || "invoice"}.pdf`;
}
