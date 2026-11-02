import { redirect } from "next/navigation";

export default function AdminEmailTemplatesRedirectPage() {
  redirect("/admin?tab=settings&section=email-templates");
}
