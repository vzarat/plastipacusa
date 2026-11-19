import { NextResponse } from "next/server";
import { getCurrentUser } from "@/actions/auth";
import { getSalesQuote } from "@/actions/sales-quotes";
import { renderSalesQuotePdfBuffer } from "@/lib/sales-quotes/render-pdf";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.profile.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const quote = await getSalesQuote(id);
  if (!quote) {
    return NextResponse.json({ error: "Quote not found" }, { status: 404 });
  }

  try {
    const buffer = await renderSalesQuotePdfBuffer(quote);
    const filename = `${quote.quoteNumber}.pdf`;
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error(
      "[sales-quotes] pdf route",
      error instanceof Error ? error.stack || error.message : error
    );
    return NextResponse.json({ error: "Could not generate PDF." }, { status: 500 });
  }
}
