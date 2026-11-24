import type { Metadata } from "next";
import { getCampaignQueueStats, listCampaigns } from "@/actions/campaigns";
import { AdminCampaignsListView } from "@/components/admin/campaigns/AdminCampaignsListView";

export const metadata: Metadata = {
  title: "Campaigns | Tools | Plastipac USA Admin",
  description: "Create and track Plastipac USA email campaigns.",
};

export default async function AdminToolsCampaignsPage() {
  const [campaigns, queue] = await Promise.all([
    listCampaigns(),
    getCampaignQueueStats(),
  ]);

  return (
    <AdminCampaignsListView campaigns={campaigns} queuePending={queue.pending} />
  );
}
