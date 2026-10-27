import { NextResponse } from "next/server";
import { buildMetaFeedCsv, metaFeedTokenMatches, type MetaFeedProduct } from "@/lib/meta-feed";
import { createServiceRoleClient, isServiceRoleConfigured } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token");
  if (!metaFeedTokenMatches(token, process.env.META_FEED_TOKEN || null)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }
  if (!isServiceRoleConfigured()) {
    return new NextResponse("Catalog feed is unavailable", { status: 503 });
  }

  const admin = createServiceRoleClient();
  const { data, error } = await admin
    .from("products")
    .select(
      "id, title, slug, description, images, image_url, type, width_inches, product_variants(sku, title, price, boxes_count, rolls_count)"
    );

  if (error) {
    console.error("[meta-feed] catalog query failed");
    return new NextResponse("Catalog feed is unavailable", { status: 503 });
  }

  const csv = buildMetaFeedCsv((data || []) as MetaFeedProduct[]);
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}
