import { redirect } from "next/navigation";
import { ADMIN_TOOLS } from "@/lib/admin-tools";

export default function AdminToolsIndexPage() {
  redirect(ADMIN_TOOLS[0]?.href || "/admin");
}
