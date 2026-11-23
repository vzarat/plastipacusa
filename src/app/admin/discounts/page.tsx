import { redirect } from "next/navigation";

/** Legacy path — Discounts lives under Admin → Tools. */
export default function AdminDiscountsRedirect() {
  redirect("/admin/tools/discounts");
}
