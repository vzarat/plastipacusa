"use server";

import Stripe from "stripe";
import { revalidatePath } from "next/cache";
import { createServerClient } from "@/lib/supabase/server";
import { CATALOG_SOLD_OUT } from "@/lib/catalog-availability";
import {
  catalogCheckoutLines,
  couponBlockReason,
  priceCheckoutCart,
  toCatalogCheckoutVariant,
  type PricedCheckoutLine,
} from "@/lib/checkout-pricing";
import { mapCouponToApplied } from "@/lib/coupons";
import { catalogSkuCandidates, customerLineDescription } from "@/lib/catalog-sku";
import { boxStockShortage, palletStockShortage, soldOutCheckoutMessage, trackedPalletStock } from "@/lib/pallet-stock";
import { releaseCheckoutHolds, syncCheckoutHolds } from "@/lib/payments/checkout-holds";
import {
  decidePaymentAttempt,
  paymentIdempotencyKey,
  PENDING_REVIEW_MS,
  planAbandonedCleanup,
  rgvLocalCharge,
  type PreviousIntent,
} from "@/lib/payments/intent-attempt";
import { createServiceRoleClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { freeRgvDelivery } from "@/lib/shipping/rgv-delivery";
import {
  fridayRegionFromOptionId,
  fridayRegionTag,
  fridaySelectionFields,
  resolveFridayDeliveryIso,
} from "@/lib/shipping/friday-delivery";
import { resolveShippingCharge } from "@/lib/shipping/quote-cache";
import { evalShippingEligibility, RGV_FREE_DELIVERY_LABEL } from "@/lib/shippingRules";
import { buildShipmentFreight } from "@/lib/shipping/shipment";
import { profileIsTaxExempt } from "@/lib/sales-tax";
import type { ShippingQuoteLine } from "@/lib/shipping/types";

function refreshCatalogStock() {
  revalidatePath("/");
  revalidatePath("/products", "layout");
}

export interface CreatePaymentIntentOptions {
  customerEmail?: string;
  customerName?: string;
  companyName?: string;
  itemsSummary?: string;
  productSlugs?: string[];
  /** Merchandise subtotal before tax. Tax is calculated on the server. */
  subtotal?: number;
  discountAmount?: number;
  shippingAmount?: number;
  couponCode?: string;
  shippingQuoteId?: string;
  fridayDeliveryDate?: string;
  shippingMethod?: string;
  shippingAddressId?: string;
  taxExemptRequested?: boolean;
  lineItems?: Array<{
    productName?: string;
    quantity?: number;
    unitPrice?: number;
    totalPrice?: number;
    packageSize?: string;
    pricingTier?: string;
    rollsPerBox?: number;
    totalBoxes?: number;
    application?: string;
    tierType?: string;
    productSlug?: string;
  }>;
  quoteLines?: ShippingQuoteLine[];
  shipping?: {
    fullName?: string;
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    phone?: string;
    country?: string;
  };
}

async function loadCatalogLines(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  requested: Array<{ sku: string; quantity: number }>
): Promise<PricedCheckoutLine[]> {
  const skus = [
    ...new Set(requested.flatMap((line) => catalogSkuCandidates(line.sku))),
  ];
  const { data, error } = await supabase.from("product_variants").select("*").in("sku", skus);
  if (error || !data) {
    console.error("[checkout] catalog variants", error?.message || "empty result");
    throw new Error("We couldn't price this cart from the catalog.");
  }
  const rows = data as Record<string, unknown>[];
  const productIds = [
    ...new Set(rows.map((row) => String(row.product_id || row.productId || "")).filter(Boolean)),
  ];
  const productsById = new Map<string, Record<string, unknown>>();
  let siblingRows = rows;
  if (productIds.length > 0) {
    const [productsResult, siblingsResult] = await Promise.all([
      supabase.from("products").select("*").in("id", productIds),
      supabase.from("product_variants").select("*").in("product_id", productIds),
    ]);
    if (productsResult.error) {
      console.error("[checkout] catalog products", productsResult.error.message);
    }
    for (const product of productsResult.data || []) {
      const record = product as Record<string, unknown>;
      productsById.set(String(record.id || ""), record);
    }
    if (siblingsResult.error) {
      console.error("[checkout] catalog sibling variants", siblingsResult.error.message);
    } else if (siblingsResult.data) {
      siblingRows = siblingsResult.data as Record<string, unknown>[];
    }
  }
  const variants = rows.map((row) =>
    toCatalogCheckoutVariant(row, productsById.get(String(row.product_id || row.productId || "")) || null)
  );
  const siblings = siblingRows.map((row) =>
    toCatalogCheckoutVariant(row, productsById.get(String(row.product_id || row.productId || "")) || null)
  );
  const lines = catalogCheckoutLines(requested, variants, siblings);
  const boxOnHand = new Map<string, number | null>();
  const palletOnHand = new Map<string, number | null>();
  const availability = new Map<string, { stock: number | null; soldOut: boolean }>();
  for (const [id, product] of productsById) {
    if (product.stock_boxes !== undefined || product.stockBoxes !== undefined) {
      const raw = product.stock_boxes !== undefined ? product.stock_boxes : product.stockBoxes;
      const boxes = raw == null || raw === "" ? null : Math.max(0, Math.floor(Number(raw)));
      const stock = boxes != null && Number.isFinite(boxes) ? boxes : null;
      boxOnHand.set(id, stock);
      availability.set(id, {
        stock,
        soldOut: product.is_sold_out === true || product.isSoldOut === true || stock === 0,
      });
      continue;
    }
    const stock = trackedPalletStock(product.stock_quantity ?? product.stock_qty);
    palletOnHand.set(id, stock);
    availability.set(id, {
      stock,
      soldOut: product.is_sold_out === true || product.isSoldOut === true || stock === 0,
    });
  }
  const unavailable = soldOutCheckoutMessage(lines, availability);
  if (unavailable) throw new Error(unavailable);
  const shortage = boxStockShortage(lines, boxOnHand) || palletStockShortage(lines, palletOnHand);
  if (shortage) throw new Error(shortage);
  return lines;
}

function publicOrderError(message: string): string {
  let text = message.slice(0, 800);
  for (const secret of [process.env.SUPABASE_SERVICE_ROLE_KEY, process.env.STRIPE_SECRET_KEY]) {
    if (secret) text = text.split(secret).join("***");
  }
  return text;
}

function orderSaveError(detail: string): Error {
  const error = new Error("Could not save the pending order.");
  (error as Error & { detail?: string }).detail = publicOrderError(detail);
  return error;
}

async function writeOrderRow(
  admin: ReturnType<typeof createServiceRoleClient>,
  mode: "insert" | "update",
  id: string | null,
  payload: Record<string, unknown>
): Promise<Record<string, unknown>> {
  let next = { ...payload };
  let lastMessage = "";
  for (let attempt = 0; attempt < 40; attempt += 1) {
    const query =
      mode === "insert"
        ? admin.from("orders").insert(next).select("*").maybeSingle()
        : admin.from("orders").update(next).eq("id", id).select("*").maybeSingle();
    const result = await query;
    if (!result.error && result.data) return result.data as Record<string, unknown>;
    const message = String(result.error?.message || result.error?.code || "");
    lastMessage = message || lastMessage;
    const missing =
      message.match(/Could not find the ['"]([a-z0-9_]+)['"] column/i) ||
      message.match(/column ["']?([a-z0-9_]+)["']?/i);
    const column = missing?.[1];
    const unknownColumn = /does not exist/i.test(message) || /schema cache/i.test(message);
    if (!column || !unknownColumn || !(column in next)) {
      throw orderSaveError(lastMessage || "The orders table rejected the pending row.");
    }
    delete next[column];
    next = { ...next };
  }
  throw orderSaveError(lastMessage || "The orders table rejected the pending row.");
}

export async function createPaymentIntent(
  amount: number,
  options: CreatePaymentIntentOptions = {}
): Promise<{
  success: boolean;
  clientSecret?: string;
  paymentIntentId?: string;
  paymentState?: "succeeded" | "processing" | "ready";
  total?: number;
  error?: string;
  errorDetail?: string;
  expired?: boolean;
}> {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

    if (!stripeSecretKey || stripeSecretKey.startsWith("pk_")) {
      return {
        success: false,
        error:
          "Stripe secret key is missing or misconfigured (expected sk_… on the server).",
      };
    }

    void amount;

    let userId = "";
    let sessionEmail = "";
    let supabase;
    try {
      supabase = await createServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      userId = user?.id || "";
      sessionEmail = (user?.email || "").trim().toLowerCase();
    } catch {
      return {
        success: false,
        error: "You must sign in to complete checkout.",
      };
    }

    if (!userId) {
      return {
        success: false,
        error: "You must sign in or create a B2B account to complete your order.",
      };
    }

    const requested = (options.quoteLines || [])
      .map((line) => ({
        sku: String(line.sku || "").trim(),
        quantity: Math.floor(Number(line.quantity) || 0),
      }))
      .filter((line) => line.sku && line.quantity > 0);
    if (requested.length === 0) {
      return { success: false, error: "Your cart is empty." };
    }
    let pricedLines: PricedCheckoutLine[];
    try {
      pricedLines = await loadCatalogLines(supabase, requested);
    } catch (error) {
      const message = error instanceof Error ? error.message : "We couldn't price this cart.";
      return { success: false, error: message };
    }
    if (!options.shippingQuoteId) {
      return { success: false, error: "Choose a shipping option before payment." };
    }

    let coupon: ReturnType<typeof mapCouponToApplied> | null = null;
    let couponId: string | null = null;
    const couponCode = String(options.couponCode || "").trim().toUpperCase();
    if (couponCode) {
      const { data: couponRow, error: couponError } = await supabase
        .from("coupons")
        .select("*")
        .eq("code", couponCode)
        .maybeSingle();
      if (couponError || !couponRow) {
        return { success: false, error: "Promo code not found." };
      }
      let reservedUses = 0;
      const pendingCoupon = await supabase
        .from("orders")
        .select("coupon_id, coupon_hold")
        .eq("user_id", userId)
        .eq("status", "pending_payment")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (
        !pendingCoupon.error &&
        pendingCoupon.data?.coupon_hold === true &&
        String(pendingCoupon.data.coupon_id || "") === String(couponRow.id || "")
      ) {
        reservedUses = 1;
      }
      const blocked = couponBlockReason(couponRow, sessionEmail, Date.now(), reservedUses);
      if (blocked) return { success: false, error: blocked };
      coupon = mapCouponToApplied(couponRow);
      couponId = coupon.id;
    }

    let shippingOption: {
      id: string;
      provider: string;
      mode: string;
      serviceName: string;
      carrierName?: string;
      carrierKey?: string;
      serviceLevel?: string;
      price: number;
      carrierPrice?: number;
      transitDays: number;
      expiresAt?: string | null;
      destinationZip: string;
    } | null = null;
    if (options.shippingQuoteId === "rgv-local") {
      try {
        const freight = await buildShipmentFreight(options.quoteLines || []);
        const gate = freeRgvDelivery({
          postalCode: options.shipping?.postalCode,
          city: options.shipping?.city,
          state: options.shipping?.state,
          rolls: freight.rolls,
        });
        const local = rgvLocalCharge(gate.eligible);
        if ("error" in local) return { success: false, error: local.error };
        const zip = String(options.shipping?.postalCode || "").match(/\d{5}/)?.[0] || "";
        shippingOption = {
          id: "rgv-local",
          provider: "plastipac",
          mode: "local",
          serviceName: RGV_FREE_DELIVERY_LABEL,
          carrierName: "Plastipac Delivery",
          carrierKey: "plastipac",
          price: local.price,
          transitDays: 1,
          destinationZip: zip,
        };
      } catch {
        return { success: false, error: "Free local delivery does not apply to this order." };
      }
    } else if (options.shippingQuoteId === "houston-friday") {
      try {
        const freight = await buildShipmentFreight(options.quoteLines || []);
        const gate = evalShippingEligibility(
          options.shipping?.postalCode || "",
          options.shipping?.city || "",
          options.shipping?.state || "",
          freight.boxes,
          freight.rolls
        );
        const offered = gate.options.find((option) => option.id === "houston-friday");
        if (!offered) {
          return { success: false, error: "Houston Friday freight does not apply to this order." };
        }
        const zip = String(options.shipping?.postalCode || "").match(/\d{5}/)?.[0] || "";
        shippingOption = {
          id: "houston-friday",
          provider: "plastipac",
          mode: "local",
          serviceName: offered.label,
          carrierName: "Plastipac Delivery",
          carrierKey: "plastipac",
          price: 0,
          transitDays: 1,
          destinationZip: zip,
        };
      } catch {
        return { success: false, error: "Houston Friday freight does not apply to this order." };
      }
    } else {
      try {
        const resolved = await resolveShippingCharge({
          quoteId: options.shippingQuoteId,
          postalCode: options.shipping?.postalCode || "",
          city: options.shipping?.city,
          state: options.shipping?.state,
          lines: options.quoteLines || [],
        });
        if ("error" in resolved) {
          return { success: false, error: resolved.error, expired: resolved.expired };
        }
        shippingOption = {
          id: resolved.option.id,
          provider: resolved.option.provider,
          mode: resolved.option.mode,
          serviceName: resolved.option.serviceName,
          carrierName: resolved.option.carrierName,
          carrierKey: resolved.option.carrierKey,
          serviceLevel: resolved.option.serviceLevel,
          price: resolved.option.price,
          carrierPrice: resolved.option.carrierPrice,
          transitDays: resolved.option.transitDays,
          expiresAt: resolved.option.expiresAt,
          destinationZip: resolved.option.destinationZip,
        };
      } catch {
        return {
          success: false,
          error: "We couldn't confirm this shipping quote. Please choose it again.",
        };
      }
    }
    const { data: taxProfile, error: taxProfileError } = await supabase
      .from("profiles")
      .select("is_tax_exempt, tax_exempt_verified")
      .eq("id", userId)
      .maybeSingle();
    const taxExempt =
      taxProfileError && /tax_exempt_verified/i.test(taxProfileError.message)
        ? profileIsTaxExempt(
            (
              await supabase
                .from("profiles")
                .select("is_tax_exempt")
                .eq("id", userId)
                .maybeSingle()
            ).data
          )
        : profileIsTaxExempt(taxProfile);
    const priced = priceCheckoutCart({
      lines: pricedLines,
      coupon,
      shipping: shippingOption ? shippingOption.price : 0,
      taxExempt,
    });
    const normalizedAmount = Math.round(priced.total * 100);
    if (!Number.isFinite(normalizedAmount) || normalizedAmount < 50) {
      return {
        success: false,
        error: "Order total must be at least $0.50 USD.",
      };
    }

    const customerEmail =
      (options.customerEmail || sessionEmail || "").trim().toLowerCase() ||
      undefined;

    if (CATALOG_SOLD_OUT) {
      return {
        success: false,
        error: "One or more products in your cart are sold out.",
      };
    }

    const slugs = (options.productSlugs || []).map((slug) => slug.trim()).filter(Boolean);
    if (slugs.length > 0) {
      const { data: soldOutRows, error: soldOutError } = await supabase
        .from("products")
        .select("slug, is_sold_out")
        .in("slug", slugs)
        .eq("is_sold_out", true);

      if (!soldOutError && soldOutRows && soldOutRows.length > 0) {
        return {
          success: false,
          error: "One or more products in your cart are sold out.",
        };
      }
    }

    if (!isServiceRoleConfigured()) {
      return { success: false, error: "Payment storage is not configured." };
    }
    const admin = createServiceRoleClient();
    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2026-08-26.dahlia" as any,
    });
    // Hobby cron is daily, so this 15-minute check also runs on each payment attempt.
    const cutoff = new Date(Date.now() - PENDING_REVIEW_MS).toISOString();
    const { data: staleRows } = await admin
      .from("orders")
      .select("id, created_at, status, payment_intent_id")
      .eq("user_id", userId)
      .eq("status", "pending_payment")
      .lt("created_at", cutoff);
    for (const stale of staleRows || []) {
      let intentStatus: string | null = null;
      const staleIntentId = String(stale.payment_intent_id || "");
      if (staleIntentId) {
        try {
          intentStatus = (await stripe.paymentIntents.retrieve(staleIntentId)).status;
        } catch {
          intentStatus = null;
        }
      }
      const cleanup = planAbandonedCleanup({
        status: String(stale.status || ""),
        createdAt: String(stale.created_at || ""),
        intentStatus,
      });
      if (cleanup === "flag_review") {
        await admin
          .from("orders")
          .update({
            status: "payment_review",
            payment_review: true,
            payment_review_reason: `PaymentIntent ${staleIntentId} is ${intentStatus}.`,
          })
          .eq("id", stale.id);
        continue;
      }
      if (cleanup === "cancel_then_delete" && staleIntentId) {
        try {
          await stripe.paymentIntents.cancel(staleIntentId);
        } catch {
          // Already canceled or no longer open.
        }
      }
      if (cleanup === "cancel_then_delete" || cleanup === "delete") {
        await releaseCheckoutHolds(admin, String(stale.id));
        refreshCatalogStock();
        await admin.from("orders").delete().eq("id", stale.id).eq("status", "pending_payment");
      }
    }

    const fridayRegion = fridayRegionFromOptionId(shippingOption?.id);
    const fridayDeliveryDate = fridayRegion
      ? resolveFridayDeliveryIso(options.fridayDeliveryDate)
      : null;
    if (fridayDeliveryDate && fridayRegion && shippingOption) {
      const scheduled = fridaySelectionFields(fridayDeliveryDate, fridayRegion);
      shippingOption.serviceName = scheduled.serviceName;
      shippingOption.transitDays = scheduled.transitDays;
    }
    const fingerprint = [
      requested.map((line) => `${line.sku}:${line.quantity}`).join(","),
      shippingOption?.destinationZip || "",
      shippingOption?.id || "",
      fridayDeliveryDate || "",
      String(normalizedAmount),
      couponCode,
    ].join("|");
    const addressRecord: Record<string, unknown> = {
      full_name: options.shipping?.fullName || "",
      line1: options.shipping?.line1 || "",
      line2: options.shipping?.line2 || "",
      city: options.shipping?.city || "",
      state: options.shipping?.state || "",
      postal_code: options.shipping?.postalCode || "",
      phone: options.shipping?.phone || "",
      country: options.shipping?.country || "US",
      email: customerEmail || null,
      checkout_fingerprint: fingerprint,
      friday_delivery_date: fridayDeliveryDate,
      friday_delivery_region: fridayRegion ? fridayRegionTag(fridayRegion) : null,
      carrier_name: shippingOption?.carrierName || shippingOption?.serviceName || null,
      carrier_key: shippingOption?.carrierKey || null,
      shipping_service: shippingOption?.serviceLevel || shippingOption?.serviceName || null,
      shipping_price: shippingOption?.price ?? priced.shipping,
      shipping_transit_days: shippingOption?.transitDays ?? null,
    };
    try {
      const freight = await buildShipmentFreight(
        priced.lines.map((line) => ({
          sku: line.sku,
          productSlug: line.productSlug,
          quantity: line.quantity,
          totalBoxes: line.totalBoxes,
          totalRolls: line.rolls,
          application: line.application,
        }))
      );
      addressRecord.shipment_weight_lbs = freight.weightLbs;
      addressRecord.shipment_pieces = freight.pieces.map((piece) => ({
        dimensions: piece.dimensionLabel,
        weight: piece.weightLabel,
        quantity: piece.quantity,
        packaging: piece.packaging,
      }));
    } catch (error) {
      console.error(
        "[checkout] shipment details left off the order email:",
        error instanceof Error ? error.message : "unavailable"
      );
    }
    const orderPayload: Record<string, unknown> = {
      user_id: userId,
      status: "pending_payment",
      payment_status: "pending",
      booking_status: "needs_booking",
      payment_review: false,
      subtotal: priced.subtotal,
      discount_amount: priced.discount,
      shipping: priced.shipping,
      shipping_cost: priced.shipping,
      shipping_carrier_cost: shippingOption?.carrierPrice ?? priced.shipping,
      shipping_quote_expires_at: shippingOption?.expiresAt || null,
      tax: priced.tax,
      tax_amount: priced.tax,
      total: priced.total,
      total_amount: priced.total,
      currency: "usd",
      shipping_quote_id: shippingOption?.id || null,
      shipping_method: shippingOption?.carrierName || shippingOption?.serviceName || null,
      shipping_provider: shippingOption?.provider || null,
      shipping_mode: shippingOption?.mode || null,
      shipping_service: shippingOption?.serviceLevel || shippingOption?.serviceName || null,
      shipping_transit_days: shippingOption?.transitDays ?? null,
      destination_zip: shippingOption?.destinationZip || null,
      coupon_id: couponId,
      items: priced.lines.map((line) => ({
        sku: line.sku,
        productName: line.productName,
        quantity: line.quantity,
        boxes: line.boxes,
        rolls: line.rolls,
        pallets: line.pallets,
        unitPrice: line.unitPrice,
        totalPrice: line.totalPrice,
        widthInches: line.widthInches,
        gauge: line.gauge,
        lengthFeet: line.lengthFeet,
      })),
      shipping_address: addressRecord,
    };

    const { data: existing } = await admin
      .from("orders")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "pending_payment")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const storedIntentId = String(existing?.payment_intent_id || "");
    let reusable = existing;
    if (existing?.id && storedIntentId) {
      try {
        const retrieved = await stripe.paymentIntents.retrieve(storedIntentId);
        const owned =
          retrieved.metadata?.order_id === String(existing.id) &&
          (retrieved.metadata?.user_id === userId || retrieved.metadata?.userId === userId);
        if (retrieved.status === "succeeded" || retrieved.status === "processing") {
          await admin
            .from("orders")
            .update({
              status: "payment_review",
              payment_review: true,
              payment_review_reason: `PaymentIntent ${storedIntentId} is ${retrieved.status}.`,
            })
            .eq("id", existing.id)
            .eq("status", "pending_payment");
          reusable = null;
          if (owned) {
            if (!retrieved.client_secret) {
              return { success: false, error: "Stripe payment intent failed — missing client secret." };
            }
            return {
              success: true,
              clientSecret: retrieved.client_secret,
              paymentIntentId: retrieved.id,
              paymentState: retrieved.status === "processing" ? "processing" : "succeeded",
              total: priced.total,
            };
          }
        }
      } catch {
        // A missing intent is replaced below.
      }
    }

    let pending: Record<string, unknown>;
    try {
      pending = reusable?.id
        ? await writeOrderRow(admin, "update", String(reusable.id), orderPayload)
        : await writeOrderRow(admin, "insert", null, orderPayload);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!/duplicate|unique/i.test(message)) throw error;
      const { data: winner } = await admin
        .from("orders")
        .select("*")
        .eq("user_id", userId)
        .eq("status", "pending_payment")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!winner) throw error;
      pending = winner as Record<string, unknown>;
    }
    const pendingId = String(pending.id || "");
    const storedFingerprint = String(
      (existing?.shipping_address as { checkout_fingerprint?: string } | null)
        ?.checkout_fingerprint || ""
    );
    const cartChanged = Boolean(existing?.id) && storedFingerprint !== fingerprint;
    const attempt = Math.max(1, Math.floor(Number(existing?.payment_attempt) || 1));

    let previous: PreviousIntent | null = null;
    if (storedIntentId) {
      try {
        const retrieved = await stripe.paymentIntents.retrieve(storedIntentId);
        previous = {
          id: retrieved.id,
          status: retrieved.status,
          orderId: retrieved.metadata?.order_id || null,
          userId: retrieved.metadata?.user_id || retrieved.metadata?.userId || null,
        };
      } catch {
        previous = null;
      }
    }
    const decision = decidePaymentAttempt({
      previous,
      userId,
      pendingOrderId: pendingId,
      attempt,
      cartChanged,
    });
    if (decision.type === "keep") {
      const heldError = await syncCheckoutHolds(admin, pendingId, pricedLines);
      if (heldError) return { success: false, error: heldError };
      refreshCatalogStock();
      const kept = await stripe.paymentIntents.retrieve(decision.paymentIntentId);
      if (!kept.client_secret) {
        return { success: false, error: "Stripe payment intent failed — missing client secret." };
      }
      return {
        success: true,
        clientSecret: kept.client_secret,
        paymentIntentId: kept.id,
        paymentState: kept.status === "processing" ? "processing" : "succeeded",
        total: priced.total,
      };
    }

    const shippingMeta = options.shipping
      ? JSON.stringify({
          full_name: options.shipping.fullName || "",
          line1: options.shipping.line1 || "",
          line2: options.shipping.line2 || "",
          city: options.shipping.city || "",
          state: options.shipping.state || "",
          postal_code: options.shipping.postalCode || "",
          phone: options.shipping.phone || "",
          country: options.shipping.country || "US",
        }).slice(0, 500)
      : "";

    const lineItems = pricedLines
      .map((item) => ({
        n: String(item.productName || "Product").slice(0, 40),
        q: Math.max(1, Number(item.quantity || 1)),
        u: Number(item.unitPrice || 0),
      }))
      .filter((item) => item.n);
    let lineItemsMeta = JSON.stringify(lineItems);
    while (lineItemsMeta.length > 500 && lineItems.length > 1) {
      lineItems.pop();
      lineItemsMeta = JSON.stringify(lineItems);
    }
    if (lineItemsMeta.length > 500) lineItemsMeta = "[]";

    const intentParams: Stripe.PaymentIntentCreateParams = {
      amount: normalizedAmount,
      currency: "usd",
      automatic_payment_methods: {
        enabled: true,
      },
      receipt_email: customerEmail,
      shipping: options.shipping?.line1
        ? {
            name: options.shipping.fullName || options.customerName || "Customer",
            phone: options.shipping.phone || undefined,
            address: {
              line1: options.shipping.line1,
              line2: options.shipping.line2 || undefined,
              city: options.shipping.city || undefined,
              state: options.shipping.state || undefined,
              postal_code: options.shipping.postalCode || undefined,
              country: options.shipping.country || "US",
            },
          }
        : undefined,
      metadata: {
        userId: userId || "",
        user_id: userId || "",
        customer_email: customerEmail || "",
        customer_name: String(
          options.shipping?.fullName || options.customerName || ""
        ),
        company_name: String(options.companyName || ""),
        items_summary: (
          priced.lines
            .map(
              (line) =>
                `${line.quantity}× ${customerLineDescription({
                  productName: line.productName,
                  sku: line.sku,
                })}`
            )
            .join("; ") || String(options.itemsSummary || "")
        ).slice(0, 450),
        subtotal: priced.subtotal.toFixed(2),
        discount_amount: priced.discount.toFixed(2),
        shipping_amount: priced.shipping.toFixed(2),
        shipping_cost: priced.shipping.toFixed(2),
        shipping_method: String(shippingOption?.serviceName || options.shippingMethod || "").slice(0, 80),
        friday_delivery_date: fridayDeliveryDate || "",
        friday_delivery_region: fridayRegion ? fridayRegionTag(fridayRegion) : "",
        shipping_provider: String(shippingOption?.provider || "").slice(0, 40),
        shipping_mode: String(shippingOption?.mode || "").slice(0, 40),
        shipping_service: String(shippingOption?.serviceName || "").slice(0, 80),
        shipping_quote_id: String(shippingOption?.id || "").slice(0, 120),
        shipping_transit_days: String(shippingOption?.transitDays ?? ""),
        destination_zip: String(shippingOption?.destinationZip || options.shipping?.postalCode || "").slice(0, 12),
        shipping_address_id: String(options.shippingAddressId || ""),
        tax_amount: (Math.round(priced.tax * 100) / 100).toFixed(2),
        tax_rate: String(priced.taxRate),
        total_amount: (Math.round(priced.total * 100) / 100).toFixed(2),
        tax_exempt: taxExempt ? "true" : "false",
        tax_exempt_requested: options.taxExemptRequested ? "true" : "false",
        line_items: lineItemsMeta,
        shipping_address: shippingMeta,
        shipping_phone: String(options.shipping?.phone || "").slice(0, 40),
        order_id: pendingId,
      },
    };

    const heldError = await syncCheckoutHolds(admin, pendingId, pricedLines);
    if (heldError) return { success: false, error: heldError };
    refreshCatalogStock();

    let paymentIntent;
    if (decision.type === "update") {
      paymentIntent = await stripe.paymentIntents.update(decision.paymentIntentId, intentParams);
    } else {
      const claimed = await admin
        .from("orders")
        .update({ payment_attempt: decision.nextAttempt })
        .eq("id", pendingId)
        .eq("payment_attempt", attempt)
        .select("id");
      if (claimed.error || !claimed.data || claimed.data.length === 0) {
        const { data: winner } = await admin
          .from("orders")
          .select("payment_intent_id")
          .eq("id", pendingId)
          .maybeSingle();
        const winnerId = String(winner?.payment_intent_id || "");
        if (winnerId) {
          const reused = await stripe.paymentIntents.retrieve(winnerId);
          if (reused.client_secret && reused.status !== "canceled") {
            const state =
              reused.status === "succeeded"
                ? "succeeded"
                : reused.status === "processing"
                  ? "processing"
                  : "ready";
            return {
              success: true,
              clientSecret: reused.client_secret,
              paymentIntentId: reused.id,
              paymentState: state,
              total: priced.total,
            };
          }
        }
        return { success: false, error: "Checkout was updated. Please try again." };
      }
      if (decision.cancelId) {
        const owned = await stripe.paymentIntents.retrieve(decision.cancelId);
        const belongs =
          owned.metadata?.order_id === pendingId &&
          (owned.metadata?.user_id === userId || owned.metadata?.userId === userId);
        if (
          belongs &&
          owned.status !== "succeeded" &&
          owned.status !== "processing" &&
          owned.status !== "canceled"
        ) {
          await stripe.paymentIntents.cancel(decision.cancelId);
        }
      }
      paymentIntent = await stripe.paymentIntents.create(intentParams, {
        idempotencyKey: decision.idempotencyKey,
      });
      if (paymentIntent.status === "canceled") {
        const retryAttempt = decision.nextAttempt + 1;
        paymentIntent = await stripe.paymentIntents.create(intentParams, {
          idempotencyKey: paymentIdempotencyKey(pendingId, retryAttempt),
        });
        await writeOrderRow(admin, "update", pendingId, {
          payment_intent_id: paymentIntent.id,
          payment_attempt: retryAttempt,
        });
      } else {
        await writeOrderRow(admin, "update", pendingId, {
          payment_intent_id: paymentIntent.id,
          payment_attempt: decision.nextAttempt,
        });
      }
    }

    if (!paymentIntent.client_secret) {
      return {
        success: false,
        error: "Stripe payment intent failed — missing client secret.",
      };
    }

    const paymentState =
      paymentIntent.status === "succeeded"
        ? "succeeded"
        : paymentIntent.status === "processing"
          ? "processing"
          : "ready";
    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      paymentState,
      total: priced.total,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const detail =
      err instanceof Error && "detail" in err
        ? publicOrderError(String((err as { detail?: string }).detail || message))
        : publicOrderError(message);
    console.error("[createPaymentIntent] failed:", detail);
    return {
      success: false,
      error: message || "Stripe secret key is missing or payment intent failed",
      errorDetail: detail,
    };
  }
}

/** Attach the checkout shipping form to an existing PaymentIntent before confirm. */
export async function updatePaymentIntentShipping(
  paymentIntentId: string,
  shipping: NonNullable<CreatePaymentIntentOptions["shipping"]>
): Promise<{ success: boolean; error?: string }> {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey || stripeSecretKey.startsWith("pk_")) {
      return { success: false, error: "Stripe is not configured." };
    }
    if (!paymentIntentId) {
      return { success: false, error: "Missing payment intent." };
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2026-08-26.dahlia" as any,
    });

    const shippingMeta = JSON.stringify({
      full_name: shipping.fullName || "",
      line1: shipping.line1 || "",
      line2: shipping.line2 || "",
      city: shipping.city || "",
      state: shipping.state || "",
      postal_code: shipping.postalCode || "",
      phone: shipping.phone || "",
      country: shipping.country || "US",
    }).slice(0, 500);

    await stripe.paymentIntents.update(paymentIntentId, {
      shipping: {
        name: shipping.fullName || "Customer",
        phone: shipping.phone || undefined,
        address: {
          line1: shipping.line1 || "",
          line2: shipping.line2 || undefined,
          city: shipping.city || undefined,
          state: shipping.state || undefined,
          postal_code: shipping.postalCode || undefined,
          country: shipping.country || "US",
        },
      },
      metadata: {
        customer_name: shipping.fullName || "",
        shipping_address: shippingMeta,
        shipping_phone: String(shipping.phone || "").slice(0, 40),
      },
    });

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

/**
 * Resolve a Checkout Session into a PaymentIntent id for order finalization
 * (legacy hosted Checkout Session support).
 */
export async function resolveCheckoutSession(sessionId: string): Promise<{
  success: boolean;
  paymentIntentId?: string;
  customerEmail?: string | null;
  customerName?: string | null;
  userId?: string | null;
  shipping?: Record<string, string | null> | null;
  error?: string;
}> {
  try {
    const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeSecretKey || stripeSecretKey.startsWith("pk_")) {
      return { success: false, error: "Stripe is not configured." };
    }
    if (!sessionId) {
      return { success: false, error: "Missing Checkout Session id." };
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2026-08-26.dahlia" as any,
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent", "customer_details"],
    });

    if (session.payment_status !== "paid" && session.status !== "complete") {
      return {
        success: false,
        error: "Checkout Session payment is not complete yet.",
      };
    }

    const paymentIntentId =
      typeof session.payment_intent === "string"
        ? session.payment_intent
        : session.payment_intent?.id;

    if (!paymentIntentId) {
      return {
        success: false,
        error: "No PaymentIntent found on this Checkout Session.",
      };
    }

    const sessionWithShipping = session as Stripe.Checkout.Session & {
      shipping_details?: {
        address?: {
          line1?: string | null;
          line2?: string | null;
          city?: string | null;
          state?: string | null;
          postal_code?: string | null;
          country?: string | null;
        } | null;
        name?: string | null;
      } | null;
      collected_information?: {
        shipping_details?: {
          address?: {
            line1?: string | null;
            line2?: string | null;
            city?: string | null;
            state?: string | null;
            postal_code?: string | null;
            country?: string | null;
          } | null;
          name?: string | null;
        } | null;
      } | null;
    };

    const ship =
      sessionWithShipping.collected_information?.shipping_details ||
      sessionWithShipping.shipping_details ||
      null;

    return {
      success: true,
      paymentIntentId,
      customerEmail:
        session.customer_details?.email || session.customer_email || null,
      customerName: session.customer_details?.name || ship?.name || null,
      userId:
        session.metadata?.userId ||
        session.metadata?.user_id ||
        session.client_reference_id ||
        null,
      shipping: ship?.address
        ? {
            full_name: ship.name || session.customer_details?.name || null,
            line1: ship.address.line1 || null,
            line2: ship.address.line2 || null,
            city: ship.address.city || null,
            state: ship.address.state || null,
            postal_code: ship.address.postal_code || null,
            country: ship.address.country || null,
          }
        : null,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[resolveCheckoutSession] failed:", message);
    return { success: false, error: message };
  }
}
