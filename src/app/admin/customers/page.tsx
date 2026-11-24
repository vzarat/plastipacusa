import { redirect } from "next/navigation";

/** List lives on the admin dashboard Customers tab. */
export default function AdminCustomersIndexPage() {
  redirect("/admin?tab=customers");
}
