import type { Metadata } from "next";
import { listLeads } from "@/actions/leads";
import { AdminLeadsView } from "@/components/admin/campaigns/AdminLeadsView";

export const metadata: Metadata = {
  title: "Leads | Tools | Plastipac USA Admin",
  description: "Import and manage marketing leads for email campaigns.",
};

export default async function AdminToolsLeadsPage() {
  const leads = await listLeads({ limit: 500 });
  const tags = Array.from(new Set(leads.flatMap((lead) => lead.tags))).sort();

  return <AdminLeadsView initialLeads={leads} allTags={tags} />;
}
