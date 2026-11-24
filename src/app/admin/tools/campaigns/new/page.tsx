import type { Metadata } from "next";
import { listLeads } from "@/actions/leads";
import { AdminCampaignBuilder } from "@/components/admin/campaigns/AdminCampaignBuilder";

export const metadata: Metadata = {
  title: "New Campaign | Tools | Plastipac USA Admin",
  description: "Build a Plastipac USA email campaign.",
};

export default async function AdminToolsNewCampaignPage() {
  const leads = await listLeads({ limit: 500 });
  const tags = Array.from(new Set(leads.flatMap((lead) => lead.tags))).sort();

  return <AdminCampaignBuilder mode="create" availableTags={tags} />;
}
