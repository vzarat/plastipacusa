import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/actions/auth";
import { listLeadTags } from "@/actions/leads";
import { AdminMarketingShell } from "@/components/admin/campaigns/AdminMarketingShell";
import { AdminCampaignBuilder } from "@/components/admin/campaigns/AdminCampaignBuilder";

export const metadata: Metadata = {
  title: "New Campaign | Plastipac USA Admin",
  description: "Build a Plastipac USA email campaign.",
};

export default async function AdminNewCampaignPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login?redirect=/admin/campaigns/new");
  if (currentUser.profile.role !== "admin") redirect("/dashboard");

  const tags = await listLeadTags();

  return (
    <AdminMarketingShell
      profile={currentUser.profile}
      title="New Campaign"
      section="campaigns"
    >
      <AdminCampaignBuilder mode="create" availableTags={tags} />
    </AdminMarketingShell>
  );
}
