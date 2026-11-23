import { redirect } from "next/navigation";

/** Legacy path — Leads lives under Admin → Tools. */
export default function AdminLeadsRedirect() {
  redirect("/admin/tools/leads");
}
