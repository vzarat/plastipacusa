import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/actions/auth";
import { AdminToolsShell } from "@/components/admin/tools/AdminToolsShell";
import { AdminDiscountsView } from "@/components/admin/AdminDiscountsView";

export const metadata: Metadata = {
  title: "Discounts | Tools | Plastipac USA Admin",
  description: "Manage coupons and promotional discounts.",
};

export default async function AdminToolsDiscountsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login?redirect=/admin/tools/discounts");
  if (currentUser.profile.role !== "admin") redirect("/dashboard");

  return (
    <AdminToolsShell profile={currentUser.profile}>
      <AdminDiscountsView />
    </AdminToolsShell>
  );
}
