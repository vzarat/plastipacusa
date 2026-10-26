"use server";

import { getProducts } from "@/actions/products";
import { buildMetaCartLines, parseMetaProducts, type MetaCartLine } from "@/lib/meta-checkout";

export async function resolveMetaCartLines(
  productsParam: string
): Promise<{ ok: true; lines: MetaCartLine[] } | { ok: false }> {
  const requested = parseMetaProducts(productsParam);
  if (!requested) return { ok: false };
  const catalog = await getProducts("all");
  const lines = buildMetaCartLines(requested, catalog);
  if (!lines) return { ok: false };
  return { ok: true, lines };
}
