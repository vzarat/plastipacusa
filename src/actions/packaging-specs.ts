"use server";

import { verifyAdmin } from "@/actions/admin";
import { getAdminProducts } from "@/actions/products";
import { packagingSpecsCsv } from "@/lib/packaging-specs-csv";

export async function exportPackagingSpecsCsv(): Promise<
  { success: true; csv: string } | { success: false; error: string }
> {
  const { isAdmin } = await verifyAdmin();
  if (!isAdmin) return { success: false, error: "Unauthorized." };
  const products = await getAdminProducts();
  return { success: true, csv: packagingSpecsCsv(products) };
}
