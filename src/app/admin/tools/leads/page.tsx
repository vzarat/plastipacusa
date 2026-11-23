import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/actions/auth";
import { listLeadTags, listLeads } from "@/actions/leads";
import { AdminToolsShell } from "@/components/admin/tools/AdminToolsShell";
import { AdminLeadsView } from "@/components/admin/campaigns/AdminLeadsView";

export const metadata: Metadata = {
  title: "Leads | Tools | Plastipac USA Admin",
  description: "Import and manage marketing leads for email campaigns.",
};

export default async function AdminToolsLeadsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login?redirect=/admin/tools/leads");
  if (currentUser.profile.role !== "admin") redirect("/dashboard");

  const [leads, tags] = await Promise.all([listLeads(), listLeadTags()]);

  return (
    <AdminToolsShell profile={currentUser.profile}>
      <AdminLeadsView initialLeads={leads} allTags={tags} />
    </AdminToolsShell>
  );
}
