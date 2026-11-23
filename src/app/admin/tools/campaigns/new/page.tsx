import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/actions/auth";
import { listLeadTags } from "@/actions/leads";
import { AdminToolsShell } from "@/components/admin/tools/AdminToolsShell";
import { AdminCampaignBuilder } from "@/components/admin/campaigns/AdminCampaignBuilder";

export const metadata: Metadata = {
  title: "New Campaign | Tools | Plastipac USA Admin",
  description: "Build a Plastipac USA email campaign.",
};

export default async function AdminToolsNewCampaignPage() {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect("/login?redirect=/admin/tools/campaigns/new");
  if (currentUser.profile.role !== "admin") redirect("/dashboard");

  const tags = await listLeadTags();

  return (
    <AdminToolsShell profile={currentUser.profile}>
      <AdminCampaignBuilder mode="create" availableTags={tags} />
    </AdminToolsShell>
  );
}
