import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/actions/auth";
import {
  getWarehouseByCode,
  listStretchReceiveCatalog,
  listUsaDispatchQueue,
  listWarehouseInventory,
} from "@/actions/warehouse-inventory";
import { UsaWarehouseInventoryClient } from "@/components/admin/inventory/UsaWarehouseInventoryClient";

export const metadata: Metadata = {
  title: "USA Warehouse Inventory | Plastipac USA",
  description: "US warehouse supervisor floor inventory and dispatch.",
};

export default async function UsaWarehouseInventoryPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login?redirect=/admin/inventory/usa");

  const role = currentUser.profile.role;
  if (role !== "admin" && role !== "warehouse_supervisor") {
    redirect("/dashboard");
  }

  // Catalog first so inventory seeding can attach USA rows for every stretch SKU.
  const stretchCatalog = await listStretchReceiveCatalog();
  const [warehouse, inventory, dispatchQueue] = await Promise.all([
    getWarehouseByCode("usa"),
    listWarehouseInventory("usa"),
    listUsaDispatchQueue(),
  ]);

  return (
    <UsaWarehouseInventoryClient
      profile={currentUser.profile}
      inventory={inventory}
      dispatchQueue={dispatchQueue}
      stretchCatalog={stretchCatalog}
      warehouseReady={Boolean(warehouse)}
    />
  );
}
