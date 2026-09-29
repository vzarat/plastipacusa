import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createServerClient } from "@/lib/supabase/server";
import { getAppBaseUrl } from "@/lib/email";

interface CheckoutLineItemInput {
  productName?: string;
  sku?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  widthInches?: string;
  gauge?: number;
  lengthFeet?: number;
  productSlug?: string;
}

interface CheckoutRequestBody {
  items?: CheckoutLineItemInput[];
  /** Authenticated Supabase user id from the client (verified against session) */
  userId?: string;
  customerEmail?: string;
  customerName?: string;
  companyName?: string;
  discountAmount?: number;
  couponCode?: string;
}

function toCents(amount: number): number {
  return Math.max(0, Math.round(Number(amount || 0) * 100));
}

export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return NextResponse.json(
      { error: "Stripe is not configured (missing STRIPE_SECRET_KEY)." },
      { status: 500 }
    );
  }

  let body: CheckoutRequestBody;
  try {
    body = (await request.json()) as CheckoutRequestBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const items = Array.isArray(body.items) ? body.items : [];
  if (items.length === 0) {
    return NextResponse.json(
      { error: "Your cart is empty. Add products before checkout." },
      { status: 400 }
    );
  }

  try {
    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user?.id) {
      return NextResponse.json(
        {
          error:
            "Unauthorized. You must sign in or create a B2B account to complete checkout.",
        },
        { status: 401 }
      );
    }

    // Client may send userId for clarity; never trust it over the session.
    if (body.userId && body.userId !== user.id) {
      console.warn(
        "[api/checkout] Rejected mismatched userId body vs session.",
        { bodyUserId: body.userId, sessionUserId: user.id }
      );
      return NextResponse.json(
        { error: "Authentication mismatch. Please sign in again." },
        { status: 401 }
      );
    }

    const authenticatedUserId = user.id;
    const authenticatedEmail = (user.email || "").trim().toLowerCase();

    const subtotal = items.reduce((sum, item) => {
      const line =
        Number(item.totalPrice) ||
        Number(item.unitPrice || 0) * Number(item.quantity || 1);
      return sum + line;
    }, 0);

    const discountAmount = Math.min(
      Math.max(0, Number(body.discountAmount || 0)),
      subtotal
    );
    const payable = Math.max(0, subtotal - discountAmount);
    if (payable <= 0) {
      return NextResponse.json(
        { error: "Order total must be greater than zero." },
        { status: 400 }
      );
    }

    // Distribute discount across line items proportionally so Stripe totals match cart.
    const discountFactor = subtotal > 0 ? payable / subtotal : 1;

    const line_items: Stripe.Checkout.SessionCreateParams.LineItem[] = items.map(
      (item) => {
        const qty = Math.max(1, Number(item.quantity || 1));
        const unit = Number(item.unitPrice || 0);
        const adjustedUnitCents = Math.max(1, toCents(unit * discountFactor));
        const descriptionParts = [
          item.sku ? `SKU ${item.sku}` : null,
          item.widthInches && item.gauge && item.lengthFeet
            ? `${item.widthInches}" × ${item.gauge} Ga × ${item.lengthFeet} ft`
            : null,
        ].filter(Boolean);

        return {
          quantity: qty,
          price_data: {
            currency: "usd",
            unit_amount: adjustedUnitCents,
            product_data: {
              name: String(item.productName || "Plastipac Product").slice(0, 120),
              description: descriptionParts.join(" · ") || undefined,
              metadata: {
                sku: String(item.sku || ""),
                product_slug: String(item.productSlug || ""),
              },
            },
          },
        };
      }
    );

    const baseUrl = getAppBaseUrl();
    const customerEmail =
      (body.customerEmail || authenticatedEmail || "").trim().toLowerCase() ||
      undefined;

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2026-08-26.dahlia" as any,
    });

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      line_items,
      customer_email: customerEmail,
      client_reference_id: authenticatedUserId,
      success_url: `${baseUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout`,
      billing_address_collection: "required",
      shipping_address_collection: {
        allowed_countries: ["US"],
      },
      metadata: {
        userId: authenticatedUserId,
        user_id: authenticatedUserId,
        customer_email: customerEmail || "",
        customer_name: String(body.customerName || ""),
        company_name: String(body.companyName || ""),
        coupon_code: String(body.couponCode || ""),
        discount_amount: String(discountAmount.toFixed(2)),
        cart_item_count: String(items.length),
        items_summary: items
          .map(
            (item) =>
              `${item.quantity || 1}× ${item.productName || "Product"}`
          )
          .join("; ")
          .slice(0, 450),
      },
      payment_intent_data: {
        metadata: {
          userId: authenticatedUserId,
          user_id: authenticatedUserId,
          customer_email: customerEmail || "",
          company_name: String(body.companyName || ""),
          items_summary: items
            .map(
              (item) =>
                `${item.quantity || 1}× ${item.productName || "Product"}`
            )
            .join("; ")
            .slice(0, 450),
        },
      },
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe did not return a Checkout Session URL." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      sessionId: session.id,
      url: session.url,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[api/checkout] session create failed:", message);
    return NextResponse.json(
      { error: message || "Unable to create Stripe Checkout Session." },
      { status: 500 }
    );
  }
}
