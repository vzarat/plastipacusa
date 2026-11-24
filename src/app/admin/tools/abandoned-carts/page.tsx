import type { Metadata } from "next";
import {
  getCartFunnelSummary,
  listAbandonedCartSessions,
} from "@/actions/cart-sessions";
import { AdminAbandonedCartsView } from "@/components/admin/abandoned-carts/AdminAbandonedCartsView";

export const metadata: Metadata = {
  title: "Abandoned Carts | Tools | Plastipac USA Admin",
  description: "Recover carts that never completed checkout.",
};

export default async function AdminToolsAbandonedCartsPage() {
  const [{ carts, metrics }, funnel] = await Promise.all([
    listAbandonedCartSessions({ limit: 100 }),
    getCartFunnelSummary(24 * 7),
  ]);

  return <AdminAbandonedCartsView carts={carts} metrics={metrics} funnel={funnel} />;
}
