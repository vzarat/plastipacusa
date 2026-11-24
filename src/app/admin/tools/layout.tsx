import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { AdminToolsShell } from "@/components/admin/tools/AdminToolsShell";

export default async function AdminToolsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login?redirect=/admin/tools");
  if (currentUser.profile.role !== "admin") redirect("/dashboard");

  return <AdminToolsShell>{children}</AdminToolsShell>;
}
