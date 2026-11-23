import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/actions/auth";
import { getCampaign } from "@/actions/campaigns";
import { listLeadTags } from "@/actions/leads";
import { AdminToolsShell } from "@/components/admin/tools/AdminToolsShell";
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
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login?redirect=/admin/tools/campaigns");
  if (currentUser.profile.role !== "admin") redirect("/dashboard");

  const { id } = await params;
  const [{ campaign, sends }, tags] = await Promise.all([
    getCampaign(id),
    listLeadTags(),
  ]);

  if (!campaign) notFound();

  return (
    <AdminToolsShell profile={currentUser.profile}>
      <AdminCampaignDetailView
        campaign={campaign}
        sends={sends}
        availableTags={tags}
      />
    </AdminToolsShell>
  );
}
