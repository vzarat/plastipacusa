import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { getAdminManagedUsers } from "@/actions/admin-users";
import { AdminUsersClient } from "@/components/admin/AdminUsersClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Users | Plastipac USA Admin",
  description:
    "Manage registered users, roles, passwords, and profiles in the Plastipac USA admin portal.",
};

export default async function AdminUsersPage() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/login?redirect=/admin/users");
  }

  if (currentUser.profile.role !== "admin") {
    redirect("/dashboard");
  }

  const users = await getAdminManagedUsers();

  return (
    <AdminUsersClient profile={currentUser.profile} initialUsers={users} />
  );
}
