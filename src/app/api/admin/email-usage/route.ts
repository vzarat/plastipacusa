import { NextResponse } from "next/server";
import { verifyAdmin } from "@/actions/admin";
import { getResendUsageSnapshot } from "@/lib/resend-usage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const { isAdmin } = await verifyAdmin();
  if (!isAdmin) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const usage = await getResendUsageSnapshot();
    return NextResponse.json(usage, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unable to load email usage.";
    return NextResponse.json(
      { error: message },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
