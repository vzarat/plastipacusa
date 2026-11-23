import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Legacy hosted Checkout Session endpoint — disabled.
 * Prices were taken from the client body, which is unsafe.
 * Use the embedded PaymentElement flow via createPaymentIntent instead.
 */
export async function POST() {
  return NextResponse.json(
    {
      error:
        "This checkout endpoint is disabled. Use the in-app checkout payment form.",
    },
    { status: 410 }
  );
}

export async function GET() {
  return POST();
}
