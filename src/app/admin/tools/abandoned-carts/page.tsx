import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/actions/auth";
import {
  getCartFunnelSummary,
  listAbandonedCartSessions,
} from "@/actions/cart-sessions";
import { AdminToolsShell } from "@/components/admin/tools/AdminToolsShell";
import { AdminAbandonedCartsView } from "@/components/admin/abandoned-carts/AdminAbandonedCartsView";

export const metadata: Metadata = {
  title: "Abandoned Carts | Tools | Plastipac USA Admin",
  description: "Recover carts that never completed checkout.",
};

export default async function AdminToolsAbandonedCartsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login?redirect=/admin/tools/abandoned-carts");
  if (currentUser.profile.role !== "admin") redirect("/dashboard");

  const [{ carts, metrics }, funnel] = await Promise.all([
    listAbandonedCartSessions({ limit: 100 }),
    getCartFunnelSummary(24 * 7),
  ]);

  return (
    <AdminToolsShell profile={currentUser.profile}>
      <AdminAbandonedCartsView carts={carts} metrics={metrics} funnel={funnel} />
    </AdminToolsShell>
  );
}
