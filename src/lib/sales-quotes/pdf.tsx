import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { SalesQuoteRecord } from "./types";

Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    paddingTop: 36,
    paddingBottom: 48,
    paddingHorizontal: 40,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#0f172a",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 22,
    borderBottomWidth: 2,
    borderBottomColor: "#0369a1",
    paddingBottom: 14,
  },
  brand: {
    fontSize: 18,
    fontFamily: "Helvetica-Bold",
    color: "#0369a1",
    letterSpacing: 0.4,
  },
  brandSub: {
    marginTop: 4,
    fontSize: 8,
    color: "#64748b",
    maxWidth: 220,
    lineHeight: 1.4,
  },
  metaBlock: { alignItems: "flex-end" },
  metaTitle: {
    fontSize: 14,
    fontFamily: "Helvetica-Bold",
    color: "#0f172a",
  },
  metaLine: { marginTop: 3, color: "#475569" },
  sectionTitle: {
    marginTop: 14,
    marginBottom: 6,
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#0369a1",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  twoCol: { flexDirection: "row", gap: 24 },
  col: { flex: 1 },
  label: { color: "#64748b", marginBottom: 2 },
  value: { fontFamily: "Helvetica-Bold", marginBottom: 6 },
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
  colSku: { width: "16%" },
  colQty: { width: "10%", textAlign: "right" },
  colUnit: { width: "16%", textAlign: "right" },
  colTotal: { width: "16%", textAlign: "right" },
  totalsBox: {
    marginTop: 14,
    marginLeft: "auto",
    width: 220,
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
  footer: {
    position: "absolute",
    left: 40,
    right: 40,
    bottom: 24,
    fontSize: 7.5,
    color: "#64748b",
    lineHeight: 1.45,
    borderTopWidth: 1,
    borderTopColor: "#e2e8f0",
    paddingTop: 8,
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

export function SalesQuotePdfDocument({
  quote,
  acceptUrl,
}: {
  quote: SalesQuoteRecord;
  acceptUrl: string;
}) {
  const validUntil = new Date(quote.validUntil).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <Document
      title={`${quote.quoteNumber} — Plastipac USA`}
      author="Plastipac USA"
      subject={`Sales quote for ${quote.companyName || quote.contactName}`}
    >
      <Page size="LETTER" style={styles.page}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.brand}>PLASTIPAC USA</Text>
            <Text style={styles.brandSub}>
              Industrial stretch film · Manual & Automatic{"\n"}
              contact@plastipacusa.com · plastipacusa.com
            </Text>
          </View>
          <View style={styles.metaBlock}>
            <Text style={styles.metaTitle}>QUOTATION</Text>
            <Text style={styles.metaLine}>{quote.quoteNumber}</Text>
            <Text style={styles.metaLine}>Valid through {validUntil}</Text>
            <Text style={styles.metaLine}>{termsLabel(quote.paymentTerms)}</Text>
          </View>
        </View>

        <View style={styles.twoCol}>
          <View style={styles.col}>
            <Text style={styles.sectionTitle}>Bill / Ship To</Text>
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
            <Text style={styles.sectionTitle}>Shipment Summary</Text>
            <Text style={styles.label}>
              Est. pallets: {Number(quote.palletCount || 0).toFixed(2)}
            </Text>
            <Text style={styles.label}>
              Est. weight: {Number(quote.weightLbs || 0).toLocaleString("en-US")} lbs
            </Text>
            <Text style={styles.label}>
              Freight: {quote.shippingMethod || quote.freightSummary?.label || "TBD"}
            </Text>
            <Text style={styles.label}>Freight amount: {money(quote.shippingAmount)}</Text>
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
          <View style={styles.totalsRow}>
            <Text>Freight</Text>
            <Text>{money(quote.shippingAmount)}</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text>Est. tax</Text>
            <Text>{money(quote.taxAmount)}</Text>
          </View>
          <View style={styles.totalsStrong}>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>Total USD</Text>
            <Text style={{ fontFamily: "Helvetica-Bold" }}>{money(quote.total)}</Text>
          </View>
        </View>

        {quote.notes ? (
          <View>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={{ color: "#334155", lineHeight: 1.4 }}>{quote.notes}</Text>
          </View>
        ) : null}

        <View style={styles.footer} fixed>
          <Text>
            Accept this quote online: {acceptUrl}
          </Text>
          <Text>
            Prices are in USD. Freight estimates may change until checkout. Free Local Delivery to
            Houston &amp; RGV applies on orders of 3+ full pallets when ZIP eligibility is met.
            Tax is estimated; final tax is calculated at checkout. This quotation is not an invoice.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
