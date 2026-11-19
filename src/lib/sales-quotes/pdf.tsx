import React from "react";
import path from "node:path";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  Image,
} from "@react-pdf/renderer";
import { quoteMerchandiseTotal } from "./totals";
import type { SalesQuoteRecord } from "./types";

Font.registerHyphenationCallback((word) => [word]);

const LOGO_PATH = path.join(process.cwd(), "public", "logo-quote.png");

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 52,
    paddingHorizontal: 40,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#0f172a",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 18,
    borderBottomWidth: 2,
    borderBottomColor: "#0369a1",
    paddingBottom: 12,
  },
  logo: {
    width: 168,
    height: 46,
    objectFit: "contain",
  },
  brandFallback: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#0369a1",
  },
  brandSub: {
    marginTop: 4,
    fontSize: 8,
    color: "#64748b",
    lineHeight: 1.35,
  },
  metaBlock: { alignItems: "flex-end", maxWidth: 210 },
  metaTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
    letterSpacing: 0.4,
  },
  metaLine: { marginTop: 3, color: "#475569", fontSize: 8 },
  sectionTitle: {
    marginTop: 12,
    marginBottom: 6,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: "#0369a1",
    textTransform: "uppercase",
    letterSpacing: 0.55,
  },
  twoCol: { flexDirection: "row", gap: 28 },
  col: { flex: 1 },
  label: { color: "#64748b", marginBottom: 2, fontSize: 8 },
  value: { fontFamily: "Helvetica-Bold", marginBottom: 4, fontSize: 9 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f5f9",
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#cbd5e1",
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    paddingVertical: 7,
    paddingHorizontal: 4,
  },
  th: { fontFamily: "Helvetica-Bold", color: "#334155", fontSize: 8 },
  td: { color: "#0f172a", fontSize: 8 },
  colDesc: { width: "42%" },
  colSku: { width: "18%" },
  colQty: { width: "10%", textAlign: "right" },
  colUnit: { width: "15%", textAlign: "right" },
  colTotal: { width: "15%", textAlign: "right" },
  totalsBox: {
    marginTop: 14,
    marginLeft: "auto",
    width: 210,
    borderWidth: 1,
    borderColor: "#cbd5e1",
    borderRadius: 4,
    padding: 10,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  totalsStrong: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#94a3b8",
  },
  notice: {
    marginTop: 14,
    padding: 9,
    backgroundColor: "#f8fafc",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    borderRadius: 4,
  },
  noticeTitle: {
    fontFamily: "Helvetica-Bold",
    fontSize: 8,
    color: "#0369a1",
    marginBottom: 3,
  },
  noticeText: {
    fontSize: 7.5,
    color: "#475569",
    lineHeight: 1.4,
  },
  footer: {
    position: "absolute",
    left: 40,
    right: 40,
    bottom: 22,
    fontSize: 7.5,
    color: "#64748b",
    lineHeight: 1.4,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 7,
  },
});

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

export function SalesQuotePdfDocument({
  quote,
  acceptUrl,
  issuedAt,
}: {
  quote: SalesQuoteRecord;
  acceptUrl: string;
  issuedAt?: string | null;
}) {
  const validUntil = new Date(quote.validUntil).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const merchandiseTotal = quoteMerchandiseTotal(quote);
  const issuedLabel = formatIssuedAt(issuedAt || quote.updatedAt || quote.createdAt);

  return (
    <Document
      title={`${quote.quoteNumber} — Plastipac USA`}
      author="Plastipac USA"
      subject={`Sales quote for ${quote.companyName || quote.contactName}`}
    >
      <Page size="LETTER" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            {/* Logo PNG generated from public/logo.svg for @react-pdf Image support */}
            <Image src={LOGO_PATH} style={styles.logo} />
            <Text style={styles.brandSub}>
              Industrial stretch film · Manual & Automatic{"\n"}
              contact@plastipacusa.com · plastipacusa.com
            </Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaTitle}>SALES QUOTE</Text>
            <Text style={styles.metaLine}>{quote.quoteNumber}</Text>
            <Text style={styles.metaLine}>Issued: {issuedLabel}</Text>
            <Text style={styles.metaLine}>Valid through {validUntil}</Text>
            <Text style={styles.metaLine}>{termsLabel(quote.paymentTerms)}</Text>
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Prepared For</Text>
            <Text style={styles.value}>{quote.companyName || "—"}</Text>
            <Text style={styles.label}>{quote.contactName}</Text>
            <Text style={styles.label}>{quote.email}</Text>
            {quote.phone ? <Text style={styles.label}>{quote.phone}</Text> : null}
            <Text style={styles.label}>
              Ship ZIP {quote.shippingZip}
              {quote.shippingCity ? ` · ${quote.shippingCity}` : ""}
              {quote.shippingState ? `, ${quote.shippingState}` : ""}
            </Text>
          </View>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Quote Scope</Text>
            <Text style={styles.label}>
              Merchandise only — shipping and sales tax are calculated at checkout.
            </Text>
            <Text style={styles.label}>
              Est. pallets: {Number(quote.palletCount || 0).toFixed(2)}
            </Text>
            {Number(quote.weightLbs || 0) > 0 ? (
              <Text style={styles.label}>
                Est. product weight: {Number(quote.weightLbs || 0).toLocaleString("en-US")} lbs
              </Text>
            ) : null}
          </View>
        </View>

        <Text style={styles.sectionTitle}>Line Items</Text>
        <View style={styles.tableHeader}>
          <Text style={[styles.th, styles.colDesc]}>Description</Text>
          <Text style={[styles.th, styles.colSku]}>SKU</Text>
          <Text style={[styles.th, styles.colQty]}>Qty</Text>
          <Text style={[styles.th, styles.colUnit]}>Unit</Text>
          <Text style={[styles.th, styles.colTotal]}>Total</Text>
        </View>
        {quote.items.map((line, index) => (
          <View key={`${line.sku}-${index}`} style={styles.tableRow} wrap={false}>
            <View style={styles.colDesc}>
              <Text style={styles.td}>{line.productName}</Text>
              <Text style={[styles.td, { color: "#64748b", marginTop: 2 }]}>
                {line.tierLabel}
                {line.application === "machine"
                  ? ` · ${line.rollsPerPackage} rolls`
                  : line.boxesPerPackage > 1
                    ? ` · ${line.boxesPerPackage} boxes`
                    : " · 1 box"}
              </Text>
            </View>
            <Text style={[styles.td, styles.colSku]}>{line.sku}</Text>
            <Text style={[styles.td, styles.colQty]}>{line.quantity}</Text>
            <Text style={[styles.td, styles.colUnit]}>{money(line.unitPrice)}</Text>
            <Text style={[styles.td, styles.colTotal]}>{money(line.lineTotal)}</Text>
          </View>
        ))}

        <View style={styles.totalsBox}>
          <View style={styles.totalsRow}>
            <Text>Subtotal</Text>
            <Text>{money(quote.subtotal)}</Text>
          </View>
          {quote.discountAmount > 0 ? (
            <View style={styles.totalsRow}>
              <Text>Discount</Text>
              <Text>-{money(quote.discountAmount)}</Text>
            </View>
          ) : null}
          <View style={styles.totalsStrong}>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>Quote total (USD)</Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{money(merchandiseTotal)}</Text>
          </View>
        </View>

        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Shipping & tax</Text>
          <Text style={styles.noticeText}>
            Product pricing only. Sales tax and shipping are calculated at checkout. Freight is
            quoted through multiple carriers on our site, so rates depend on destination and the
            service you select.
          </Text>
        </View>

        {quote.notes ? (
          <View>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={{ color: "#334155", lineHeight: 1.4 }}>{quote.notes}</Text>
          </View>
        ) : null}

        <View style={styles.footer} fixed>
          <Text>Accept online: {acceptUrl}</Text>
          <Text>
            Prices in USD. This document is a sales quotation, not an invoice. Final amounts for tax
            and shipping appear at checkout.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
