import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { AdminAppShell } from "@/components/admin/AdminAppShell";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    redirect("/login?redirect=/admin");
  }

  const role = currentUser.profile.role;
  if (role !== "admin" && role !== "warehouse_supervisor") {
    redirect("/dashboard");
  }

  return (
    <AdminAppShell profile={currentUser.profile}>{children}</AdminAppShell>
  );
}
