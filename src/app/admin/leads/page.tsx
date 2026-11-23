import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/actions/auth";
import { listLeadTags, listLeads } from "@/actions/leads";
import { AdminMarketingShell } from "@/components/admin/campaigns/AdminMarketingShell";
import { AdminLeadsView } from "@/components/admin/campaigns/AdminLeadsView";

export const metadata: Metadata = {
  title: "Leads | Plastipac USA Admin",
  description: "Import and manage marketing leads for email campaigns.",
};

export default async function AdminLeadsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login?redirect=/admin/leads");
  if (currentUser.profile.role !== "admin") redirect("/dashboard");

  const [leads, tags] = await Promise.all([listLeads(), listLeadTags()]);

  return (
    <AdminMarketingShell profile={currentUser.profile} title="Leads" section="leads">
      <AdminLeadsView initialLeads={leads} allTags={tags} />
    </AdminMarketingShell>
  );
}
