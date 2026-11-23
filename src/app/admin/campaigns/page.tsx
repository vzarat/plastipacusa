import { redirect } from "next/navigation";

/** Legacy path — Campaigns lives under Admin → Tools. */
export default function AdminCampaignsRedirect() {
  redirect("/admin/tools/campaigns");
}
