import React from "react";
import { getCurrentUser } from "@/actions/auth";
import { BackupPasswordBanner } from "@/components/dashboard/BackupPasswordBanner";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();
  const backupPasswordPending = Boolean(currentUser?.profile?.backupPasswordPending);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased">
      <BackupPasswordBanner pending={backupPasswordPending} />
      {children}
    </div>
  );
}

