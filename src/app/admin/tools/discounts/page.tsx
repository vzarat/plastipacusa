import type { Metadata } from "next";
import { AdminDiscountsView } from "@/components/admin/AdminDiscountsView";

export const metadata: Metadata = {
  title: "Discounts | Tools | Plastipac USA Admin",
  description: "Manage coupons and promotional discounts.",
};

export default function AdminToolsDiscountsPage() {
  return <AdminDiscountsView />;
}
