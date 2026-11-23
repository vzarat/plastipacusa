import type { Metadata } from "next";
import Link from "next/link";
import { unsubscribeByToken } from "@/actions/leads";

export const metadata: Metadata = {
  title: "Unsubscribe | Plastipac USA",
  description: "Manage your Plastipac USA email preferences.",
  robots: { index: false, follow: false },
};

export default async function UnsubscribePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const params = await searchParams;
  const token = String(params.token || "").trim();

  let status: "missing" | "ok" | "already" | "error" = "missing";
  let message = "This unsubscribe link is missing a token.";

  if (token) {
    const result = await unsubscribeByToken(token);
    if (result.success && result.already) {
      status = "already";
      message = "You were already unsubscribed from Plastipac USA marketing emails.";
    } else if (result.success) {
      status = "ok";
      message =
        "You have been unsubscribed. You will no longer receive Plastipac USA marketing emails.";
    } else {
      status = "error";
      message = result.error || "We could not process this unsubscribe request.";
    }
  }

  return (
    <main className="min-h-[70vh] bg-slate-50 px-4 py-16">
      <div className="mx-auto max-w-lg rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <p className="text-xs font-bold uppercase tracking-wider text-sky-700">Plastipac USA</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">Email preferences</h1>
        <p
          className={`mt-4 text-sm leading-relaxed ${
            status === "error" ? "text-red-700" : "text-slate-600"
          }`}
        >
          {message}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/"
            className="inline-flex items-center rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-sky-700"
          >
            Back to storefront
          </Link>
          <Link
            href="/#product-catalog-section"
            className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            View catalog
          </Link>
        </div>
      </div>
    </main>
  );
}
