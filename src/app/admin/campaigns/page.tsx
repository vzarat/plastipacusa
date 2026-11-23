import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/actions/auth";
import { listCampaigns } from "@/actions/campaigns";
import { AdminMarketingShell } from "@/components/admin/campaigns/AdminMarketingShell";
import { AdminCampaignsListView } from "@/components/admin/campaigns/AdminCampaignsListView";

export const metadata: Metadata = {
  title: "Campaigns | Plastipac USA Admin",
  description: "Create and track Plastipac USA email campaigns.",
};

export default async function AdminCampaignsPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login?redirect=/admin/campaigns");
  if (currentUser.profile.role !== "admin") redirect("/dashboard");

  const campaigns = await listCampaigns();

  return (
    <AdminMarketingShell
      profile={currentUser.profile}
      title="Campaigns"
      section="campaigns"
    >
      <AdminCampaignsListView campaigns={campaigns} />
    </AdminMarketingShell>
  );
}
