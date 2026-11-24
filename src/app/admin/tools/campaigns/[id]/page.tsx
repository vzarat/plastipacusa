import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCampaign } from "@/actions/campaigns";
import { listLeads } from "@/actions/leads";
import { AdminCampaignDetailView } from "@/components/admin/campaigns/AdminCampaignDetailView";

export const metadata: Metadata = {
  title: "Campaign | Tools | Plastipac USA Admin",
  description: "Campaign analytics and editor.",
};

export default async function AdminToolsCampaignDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [{ campaign, sends }, leads] = await Promise.all([
    getCampaign(id),
    listLeads({ limit: 1000 }),
  ]);

  if (!campaign) notFound();

  const tags = Array.from(new Set(leads.flatMap((lead) => lead.tags))).sort();

  return (
    <AdminCampaignDetailView
      campaign={campaign}
      sends={sends}
      leads={leads}
      availableTags={tags}
    />
  );
}
