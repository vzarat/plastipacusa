"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/actions/auth";
import { getAppBaseUrl, sendEmail } from "@/lib/email";
import { ORDERS_FROM } from "@/lib/company-email";
import { getWarpConfig, WARP_ORIGIN_ZIP } from "@/lib/shipping/config";
import { nextBusinessPickupDate } from "@/lib/shipping/dates";
import { FREE_LOCAL_DELIVERY_LABEL } from "@/lib/shipping/local-delivery";
import {
  fetchLtlMarketOptions,
  marketItemsFromPieces,
} from "@/lib/shipping/market-options";
import { buildShipmentFreight, estimatePackageUnitsFromQuoteLines } from "@/lib/shipping/shipment";
import type { FreightPiece } from "@/lib/shipping/types";
import { evalShippingEligibility } from "@/lib/shippingRules";
import { createServiceRoleClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import { mapSalesQuoteRow, nextQuoteNumber } from "@/lib/sales-quotes/map";
import { renderSalesQuotePdfBuffer } from "@/lib/sales-quotes/render-pdf";
import { quoteMerchandiseTotal } from "@/lib/sales-quotes/totals";
import {
  emptyFreightSummary,
  priceSalesQuoteLines,
  salesQuoteTotals,
} from "@/lib/sales-quotes/totals";
import type {
  SalesQuoteDraftInput,
  SalesQuoteFreightSummary,
  SalesQuoteRecord,
} from "@/lib/sales-quotes/types";

export { renderSalesQuotePdfBuffer };

async function requireAdmin() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.profile.role !== "admin") return null;
  return currentUser;
}

async function adminDb() {
  if (isServiceRoleConfigured()) return createServiceRoleClient();
  return createServerClient();
}

function acceptUrlForToken(token: string): string {
  return `${getAppBaseUrl()}/quotes/accept/${token}`;
}

async function resolveFreightForDraft(input: {
  items: ReturnType<typeof priceSalesQuoteLines>;
  shippingZip: string;
  shippingCity?: string;
  shippingState?: string;
  shippingAmountOverride?: number | null;
  shippingMethodOverride?: string | null;
}): Promise<{
  shippingAmount: number;
  shippingMethod: string;
  shippingQuoteId: string | null;
  weightLbs: number;
  freightSummary: SalesQuoteFreightSummary;
}> {
  if (
    input.shippingAmountOverride != null &&
    Number.isFinite(Number(input.shippingAmountOverride))
  ) {
    return {
      shippingAmount: Math.max(0, Number(input.shippingAmountOverride)),
      shippingMethod: input.shippingMethodOverride || "Manual freight",
      shippingQuoteId: null,
      weightLbs: 0,
      freightSummary: {
        mode: "manual",
        label: input.shippingMethodOverride || "Manual freight",
      },
    };
  }

  const zip = String(input.shippingZip || "").match(/\d{5}/)?.[0] || "";
  const city = String(input.shippingCity || "").trim();
  const state = String(input.shippingState || "").trim() || "TX";
  const lines = input.items.map((item) => ({
    sku: item.sku,
    productSlug: item.productSlug,
    application: item.application,
    quantity: item.quantity,
    totalBoxes: item.boxesPerPackage,
    totalRolls: item.rollsPerPackage,
  }));

  let weightLbs = 0;
  let boxes = 0;
  let rolls = 0;
  let freightPieces: FreightPiece[] = [];

  try {
    const freight = await buildShipmentFreight(lines);
    weightLbs = freight.weightLbs;
    boxes = freight.boxes;
    rolls = freight.rolls;
    freightPieces = freight.pieces;
  } catch {
    const estimated = estimatePackageUnitsFromQuoteLines(lines);
    boxes = estimated.boxes;
    rolls = estimated.rolls;
  }

  const summaryPieces = freightPieces.map((piece) => ({
    packaging: piece.packaging,
    quantity: piece.quantity,
    weightLbs: piece.weightLbs,
    dimensionLabel: piece.dimensionLabel,
  }));

  const eligibility = evalShippingEligibility(zip, city, state, boxes, rolls);
  if (eligibility.freeDeliveryEligible) {
    const localOption =
      eligibility.options.find((option) => option.id === "houston-friday") ||
      eligibility.options.find((option) => option.id === "rgv-express") ||
      eligibility.options[0];
    return {
      shippingAmount: 0,
      shippingMethod: localOption?.label || FREE_LOCAL_DELIVERY_LABEL,
      shippingQuoteId: localOption?.id || "rgv-local",
      weightLbs,
      freightSummary: {
        mode: "free_local",
        label: localOption?.label || FREE_LOCAL_DELIVERY_LABEL,
        quoteId: localOption?.id || null,
        pieces: summaryPieces,
      },
    };
  }

  if (!zip || weightLbs <= 0 || freightPieces.length === 0) {
    return {
      shippingAmount: 0,
      shippingMethod: "Freight TBD — add ZIP / package weights",
      shippingQuoteId: null,
      weightLbs,
      freightSummary: emptyFreightSummary(),
    };
  }

  try {
    const config = getWarpConfig();
    const market = await fetchLtlMarketOptions({
      apiKey: config.apiKey,
      originZip: WARP_ORIGIN_ZIP,
      destinationZip: zip,
      destination: {
        city: city || undefined,
        state: state || undefined,
      },
      pickupDate: nextBusinessPickupDate(),
      items: marketItemsFromPieces(freightPieces),
      timeoutMs: 45_000,
    });
    const cheapest = [...(market.options || [])].sort((a, b) => a.price - b.price)[0];
    if (!cheapest) {
      return {
        shippingAmount: 0,
        shippingMethod: "No LTL carriers returned",
        shippingQuoteId: null,
        weightLbs,
        freightSummary: {
          mode: "warp_ltl",
          label: "No LTL carriers returned",
          pieces: summaryPieces,
        },
      };
    }
    return {
      shippingAmount: cheapest.price,
      shippingMethod: `${cheapest.carrierName} · ${cheapest.serviceLevel}`,
      shippingQuoteId: cheapest.quoteId,
      weightLbs,
      freightSummary: {
        mode: "warp_ltl",
        label: `${cheapest.carrierName} · ${cheapest.serviceLevel}`,
        carrierName: cheapest.carrierName,
        transitDays: cheapest.transitDays,
        quoteId: cheapest.quoteId,
        pieces: summaryPieces,
      },
    };
  } catch (error) {
    console.error(
      "[sales-quotes] warp freight failed",
      error instanceof Error ? error.message : error
    );
    return {
      shippingAmount: 0,
      shippingMethod: "Freight quote unavailable",
      shippingQuoteId: null,
      weightLbs,
      freightSummary: {
        mode: "warp_ltl",
        label: "Freight quote unavailable",
        pieces: summaryPieces,
      },
    };
  }
}

export async function listSalesQuotes(): Promise<SalesQuoteRecord[]> {
  if (!(await requireAdmin())) return [];
  const supabase = await adminDb();
  const { data, error } = await supabase
    .from("sales_quotes")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.error("[sales-quotes] list", error.message);
    return [];
  }
  return (data || []).map((row) => mapSalesQuoteRow(row as Record<string, unknown>));
}

export async function getSalesQuote(id: string): Promise<SalesQuoteRecord | null> {
  if (!(await requireAdmin()) || !id) return null;
  const supabase = await adminDb();
  const { data, error } = await supabase
    .from("sales_quotes")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) return null;
  return mapSalesQuoteRow(data as Record<string, unknown>);
}

export async function getSalesQuoteByToken(
  token: string
): Promise<SalesQuoteRecord | null> {
  const clean = String(token || "").trim();
  if (!clean || !isServiceRoleConfigured()) return null;
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("sales_quotes")
    .select("*")
    .eq("token", clean)
    .maybeSingle();
  if (error || !data) return null;
  const quote = mapSalesQuoteRow(data as Record<string, unknown>);
  if (quote.status === "cancelled" || quote.status === "draft") return null;
  if (new Date(quote.validUntil).getTime() < Date.now()) {
    if (quote.status !== "expired") {
      await supabase
        .from("sales_quotes")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("id", quote.id);
    }
    return { ...quote, status: "expired" };
  }
  if (quote.status === "sent") {
    await supabase
      .from("sales_quotes")
      .update({
        status: "viewed",
        viewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", quote.id)
      .eq("status", "sent");
    return { ...quote, status: "viewed", viewedAt: new Date().toISOString() };
  }
  return quote;
}

export async function previewSalesQuoteFreight(
  input: SalesQuoteDraftInput
): Promise<{
  success: boolean;
  shippingAmount?: number;
  shippingMethod?: string;
  shippingQuoteId?: string | null;
  weightLbs?: number;
  palletCount?: number;
  freightSummary?: SalesQuoteFreightSummary;
  totals?: ReturnType<typeof salesQuoteTotals>;
  error?: string;
}> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Admin access required." };
  }
  try {
    const lines = priceSalesQuoteLines(input.items || []);
    if (lines.length === 0) {
      return { success: false, error: "Add at least one product line." };
    }
    const freight = await resolveFreightForDraft({
      items: lines,
      shippingZip: input.shippingZip || "",
      shippingCity: input.shippingCity,
      shippingState: input.shippingState,
      shippingAmountOverride: input.shippingAmountOverride,
      shippingMethodOverride: input.shippingMethodOverride,
    });
    const totals = salesQuoteTotals({
      lines,
      discountPercent: input.discountPercent,
      discountAmount: input.discountAmount,
      shipping: freight.shippingAmount,
      taxExempt: input.taxExempt,
    });
    return {
      success: true,
      ...freight,
      palletCount: totals.palletCount,
      totals,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Freight preview failed.",
    };
  }
}

export async function createSalesQuote(
  input: SalesQuoteDraftInput
): Promise<{ success: boolean; quote?: SalesQuoteRecord; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { success: false, error: "Admin access required." };

  const email = String(input.email || "").trim().toLowerCase();
  const companyName = String(input.companyName || "").trim();
  const contactName = String(input.contactName || "").trim();
  const phone = String(input.phone || "").trim();
  const shippingZip = String(input.shippingZip || "").match(/\d{5}/)?.[0] || "";
  // Prospects often only have a name and phone — keep company / email / ZIP optional.
  if (!contactName && !phone) {
    return {
      success: false,
      error: "Add at least a contact name or phone number.",
    };
  }
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Email address looks invalid." };
  }

  const lines = priceSalesQuoteLines(input.items || []);
  if (lines.length === 0) {
    return { success: false, error: "Add at least one product line." };
  }

  const validUntil = new Date(input.validUntil);
  if (!Number.isFinite(validUntil.getTime()) || validUntil.getTime() <= Date.now()) {
    return { success: false, error: "Choose a future quote validity date." };
  }

  try {
    const freight = await resolveFreightForDraft({
      items: lines,
      shippingZip,
      shippingCity: input.shippingCity,
      shippingState: input.shippingState,
      shippingAmountOverride: input.shippingAmountOverride,
      shippingMethodOverride: input.shippingMethodOverride,
    });
    const totals = salesQuoteTotals({
      lines,
      discountPercent: input.discountPercent,
      discountAmount: input.discountAmount,
      shipping: freight.shippingAmount,
      taxExempt: input.taxExempt,
    });

    const payload = {
      quote_number: nextQuoteNumber(),
      token: randomBytes(24).toString("hex"),
      status: "draft",
      customer_user_id: input.customerUserId || null,
      company_name: companyName,
      contact_name: contactName,
      email,
      phone,
      shipping_zip: shippingZip,
      shipping_city: String(input.shippingCity || "").trim(),
      shipping_state: String(input.shippingState || "").trim().toUpperCase(),
      payment_terms: input.paymentTerms === "net_30" ? "net_30" : "prepayment",
      valid_until: validUntil.toISOString(),
      notes: String(input.notes || "").trim() || null,
      items: lines,
      subtotal: totals.subtotal,
      discount_percent: Math.max(0, Number(input.discountPercent) || 0),
      discount_amount: totals.discount,
      shipping_amount: freight.shippingAmount,
      shipping_method: freight.shippingMethod,
      shipping_quote_id: freight.shippingQuoteId,
      tax_amount: totals.tax,
      total: totals.total,
      pallet_count: totals.palletCount,
      weight_lbs: freight.weightLbs,
      freight_summary: freight.freightSummary,
      created_by: admin.user.id,
      updated_at: new Date().toISOString(),
    };

    const supabase = await adminDb();
    const { data, error } = await supabase
      .from("sales_quotes")
      .insert(payload)
      .select("*")
      .maybeSingle();
    if (error || !data) {
      console.error("[sales-quotes] create", error?.message);
      return {
        success: false,
        error: error?.message || "Could not save the quote. Run the sales_quotes migration.",
      };
    }

    revalidatePath("/admin/quotes");
    return { success: true, quote: mapSalesQuoteRow(data as Record<string, unknown>) };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not create quote.",
    };
  }
}

export async function sendSalesQuoteEmail(
  quoteId: string
): Promise<{ success: boolean; error?: string }> {
  if (!(await requireAdmin())) {
    return { success: false, error: "Admin access required." };
  }
  const quote = await getSalesQuote(quoteId);
  if (!quote) return { success: false, error: "Quote not found." };
  if (!quote.email) return { success: false, error: "Quote has no recipient email." };

  try {
    const pdfBuffer = await renderSalesQuotePdfBuffer(quote);
    const link = acceptUrlForToken(quote.token);
    const merchandiseTotal = quoteMerchandiseTotal(quote);
    const result = await sendEmail({
      to: quote.email,
      from: ORDERS_FROM,
      subject: `Plastipac USA Quote ${quote.quoteNumber}`,
      text: [
        `Hello ${quote.contactName || "there"},`,
        "",
        `Please find attached quotation ${quote.quoteNumber} from Plastipac USA.`,
        quote.companyName ? `Company: ${quote.companyName}` : null,
        quote.contactName ? `Contact: ${quote.contactName}` : null,
        `Quote total (merchandise): $${merchandiseTotal.toFixed(2)} USD`,
        `Valid through: ${new Date(quote.validUntil).toLocaleDateString("en-US")}`,
        "",
        "Shipping and sales tax are calculated at checkout. Our site quotes freight through multiple carriers.",
        "",
        `Review and convert this quote to an online order:`,
        link,
        "",
        "Thank you,",
        "Plastipac USA",
      ]
        .filter((line) => line != null)
        .join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;color:#0f172a;line-height:1.5">
          <p>Hello ${quote.contactName || "there"},</p>
          <p>Please find attached quotation <strong>${quote.quoteNumber}</strong> from Plastipac USA.</p>
          <p>
            ${quote.companyName ? `Company: ${quote.companyName}<br/>` : ""}
            ${quote.contactName ? `Contact: ${quote.contactName}<br/>` : ""}
            Quote total (merchandise): <strong>$${merchandiseTotal.toFixed(2)} USD</strong><br/>
            Valid through: ${new Date(quote.validUntil).toLocaleDateString("en-US")}
          </p>
          <p style="color:#475569;font-size:13px">
            Shipping and sales tax are calculated at checkout. Freight is quoted through multiple carriers on our site.
          </p>
          <p>
            <a href="${link}" style="display:inline-block;background:#0369a1;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none;font-weight:700">
              Review &amp; Accept Quote
            </a>
          </p>
          <p style="color:#64748b;font-size:13px">Or open: ${link}</p>
          <p>Thank you,<br/>Plastipac USA</p>
        </div>
      `,
      attachments: [
        {
          filename: `${quote.quoteNumber}.pdf`,
          content: pdfBuffer,
        },
      ],
    });

    if (!result.success && !result.skipped) {
      return { success: false, error: result.error || "Email send failed." };
    }

    const supabase = await adminDb();
    await supabase
      .from("sales_quotes")
      .update({
        status: quote.status === "draft" || quote.status === "sent" ? "sent" : quote.status,
        sent_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", quote.id);

    revalidatePath("/admin/quotes");
    revalidatePath(`/admin/quotes/${quote.id}`);
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Could not email quote.",
    };
  }
}

export async function markSalesQuoteAccepted(
  token: string
): Promise<{ success: boolean; quote?: SalesQuoteRecord; error?: string }> {
  const quote = await getSalesQuoteByToken(token);
  if (!quote) return { success: false, error: "Quote not found." };
  if (quote.status === "expired") {
    return { success: false, error: "This quote has expired." };
  }
  if (!isServiceRoleConfigured()) {
    return { success: false, error: "Quote acceptance is unavailable." };
  }
  const supabase = createServiceRoleClient();
  const { data, error } = await supabase
    .from("sales_quotes")
    .update({
      status: "accepted",
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", quote.id)
    .select("*")
    .maybeSingle();
  if (error || !data) {
    return { success: false, error: error?.message || "Could not accept quote." };
  }
  return { success: true, quote: mapSalesQuoteRow(data as Record<string, unknown>) };
}
