import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { formatOrderId } from "@/lib/utils";
import {
  generateInvoicePdf,
  sanitizeInvoiceFilename,
  type InvoicePdfItem,
} from "@/lib/invoice-pdf";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function mapOrderItems(rawItems: unknown, fallbackTotal: number): InvoicePdfItem[] {
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return [
      {
        description: "Industrial Stretch Packaging Order",
        quantity: 1,
        unitPrice: fallbackTotal,
        total: fallbackTotal,
      },
    ];
  }

  return rawItems.map((item: any) => {
    const quantity = Number(item?.quantity ?? 1) || 1;
    const unitPrice = Number(item?.unitPrice ?? item?.unit_price ?? 0) || 0;
    const total =
      Number(item?.totalPrice ?? item?.total_price ?? unitPrice * quantity) ||
      unitPrice * quantity;
    const name =
      item?.productName ||
      item?.product_name ||
      item?.name ||
      "Stretch Film";
    const dims =
      item?.widthInches || item?.gauge || item?.lengthFeet
        ? ` ${item?.widthInches || ""}" x ${item?.gauge || ""} GA x ${
            item?.lengthFeet || ""
          } FT`.replace(/\s+/g, " ")
        : "";
    const packageSize = item?.packageSize || item?.package_size || item?.pricingTier || "";
    const description = `${name}${dims}${packageSize ? ` (${packageSize})` : ""}`.trim();

    return {
      description,
      quantity,
      unitPrice,
      total,
    };
  });
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: rawId } = await context.params;
    const orderId = decodeURIComponent(String(rawId || "").trim());

    if (!orderId) {
      return NextResponse.json({ error: "Invoice id is required." }, { status: 400 });
    }

    const supabase = await createServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Prefer exact id match for the authenticated customer.
    let { data: order, error } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .maybeSingle();

    // Fallback: some UIs pass formatted ORD-* refs — scan recent user orders.
    if ((!order || error) && orderId.startsWith("ORD-")) {
      const { data: rows } = await supabase
        .from("orders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);

      order =
        rows?.find(
          (row: any) =>
            formatOrderId({
              id: row.id,
              createdAt: row.created_at,
              items: row.items,
            }) === orderId
        ) || null;
    }

    if (!order) {
      return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
    }

    const createdAt = order.created_at || new Date().toISOString();
    const orderPoRef = formatOrderId({
      id: order.id,
      createdAt,
      items: order.items,
    });

    const totalUsd = Number(
      order.total_usd ?? order.total_amount ?? order.total ?? 0
    );
    const issueDate = new Date(createdAt).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Stable invoice number derived from order id hash suffix
    const idDigits = String(order.id || "")
      .replace(/[^0-9a-f]/gi, "")
      .slice(-4)
      .toUpperCase();
    const invoiceNumber = `INV-${new Date(createdAt).getFullYear()}-${idDigits || "0000"}`;

    const pdfBytes = generateInvoicePdf({
      invoiceNumber,
      orderPoRef,
      issueDate,
      paymentStatus: "Paid & Cleared",
      customerName:
        order.customer_name ||
        order.shipping_address?.full_name ||
        order.shipping_address?.name ||
        undefined,
      customerCompany:
        order.company_name || order.shipping_address?.company_name || undefined,
      customerEmail:
        order.customer_email || order.shipping_address?.email || user.email || undefined,
      items: mapOrderItems(order.items, totalUsd),
      totalUsd,
    });

    const filename = sanitizeInvoiceFilename(orderPoRef);

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: any) {
    console.error("Invoice PDF generation failed:", err?.message || err);
    return NextResponse.json(
      { error: "Unable to generate invoice PDF." },
      { status: 500 }
    );
  }
}
