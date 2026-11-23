import { redirect } from "next/navigation";

/** Legacy path — Campaigns lives under Admin → Tools. */
export default function AdminNewCampaignRedirect() {
  redirect("/admin/tools/campaigns/new");
}
