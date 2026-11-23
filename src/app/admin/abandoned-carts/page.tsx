import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/actions/auth";
import {
  getCartFunnelSummary,
  listAbandonedCartSessions,
} from "@/actions/cart-sessions";
import { AdminAbandonedCartsShell } from "@/components/admin/abandoned-carts/AdminAbandonedCartsShell";
import { AdminAbandonedCartsView } from "@/components/admin/abandoned-carts/AdminAbandonedCartsView";

export const metadata: Metadata = {
  title: "Abandoned Carts | Plastipac USA Admin",
  description: "Recover carts that never completed checkout.",
};

export default async function AdminAbandonedCartsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login?redirect=/admin/abandoned-carts");
  if (currentUser.profile.role !== "admin") redirect("/dashboard");

  const [{ carts, metrics }, funnel] = await Promise.all([
    listAbandonedCartSessions({ limit: 100 }),
    getCartFunnelSummary(24 * 7),
  ]);

  return (
    <AdminAbandonedCartsShell profile={currentUser.profile}>
      <AdminAbandonedCartsView carts={carts} metrics={metrics} funnel={funnel} />
    </AdminAbandonedCartsShell>
  );
}
