import { redirect } from "next/navigation";

/** Legacy path — Tools submenu lives under /admin/tools. */
export default function AdminAbandonedCartsRedirect() {
  redirect("/admin/tools/abandoned-carts");
}
