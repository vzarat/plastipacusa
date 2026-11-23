import { redirect } from "next/navigation";

/** Legacy path — Campaigns lives under Admin → Tools. */
export default async function AdminCampaignDetailRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/admin/tools/campaigns/${id}`);
}
