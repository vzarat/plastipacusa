import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { ADMIN_TOOLS } from "@/lib/admin-tools";

export default async function AdminToolsIndexPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login?redirect=/admin/tools");
  if (currentUser.profile.role !== "admin") redirect("/dashboard");

  redirect(ADMIN_TOOLS[0]?.href || "/admin");
}
