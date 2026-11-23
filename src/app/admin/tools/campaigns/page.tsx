import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/actions/auth";
import { getCampaignQueueStats, listCampaigns } from "@/actions/campaigns";
import { AdminToolsShell } from "@/components/admin/tools/AdminToolsShell";
import { AdminCampaignsListView } from "@/components/admin/campaigns/AdminCampaignsListView";

export const metadata: Metadata = {
  title: "Campaigns | Tools | Plastipac USA Admin",
  description: "Create and track Plastipac USA email campaigns.",
};

export default async function AdminToolsCampaignsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login?redirect=/admin/tools/campaigns");
  if (currentUser.profile.role !== "admin") redirect("/dashboard");

  const [campaigns, queue] = await Promise.all([
    listCampaigns(),
    getCampaignQueueStats(),
  ]);

  return (
    <AdminToolsShell profile={currentUser.profile}>
      <AdminCampaignsListView campaigns={campaigns} queuePending={queue.pending} />
    </AdminToolsShell>
  );
}
