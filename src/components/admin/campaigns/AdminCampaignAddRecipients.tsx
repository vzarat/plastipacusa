"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { addRecipientsToCampaign } from "@/actions/campaigns";
import type { CampaignRecord } from "@/lib/campaigns/types";

export function AdminCampaignAddRecipients({ campaign }: { campaign: CampaignRecord }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [emails, setEmails] = useState("");
  const [includeSegment, setIncludeSegment] = useState(false);

  const canAdd =
    campaign.status === "sending" ||
    campaign.status === "sent" ||
    campaign.status === "paused";

  if (!canAdd) return null;

  function submit() {
    startTransition(async () => {
      const result = await addRecipientsToCampaign(campaign.id, {
        emails,
        includeSegment,
      });
      if (!result.success) {
        toast.error(result.error || "Could not add recipients.");
        return;
      }

      const parts: string[] = [];
      if (result.queued) parts.push(`queued ${result.queued}`);
      if (result.dispatched) parts.push(`sent ${result.dispatched} now`);
      if (result.skipped) parts.push(`skipped ${result.skipped} already in campaign`);
      if (result.unsubscribed) parts.push(`${result.unsubscribed} unsubscribed`);
      if (result.invalid) parts.push(`${result.invalid} invalid`);

      if (!result.queued) {
        toast.message(parts.join(" · ") || "No new recipients added.");
      } else {
        toast.success(parts.join(" · "));
        setEmails("");
        setIncludeSegment(false);
      }
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-sky-200 bg-sky-50/60 p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="rounded-xl bg-sky-100 p-2 text-sky-700">
          <UserPlus className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-bold text-slate-900">Add recipients</h2>
          <p className="mt-1 text-sm text-slate-600">
            Add emails after launch. Duplicates and unsubscribed leads are skipped.
            {campaign.status === "paused"
              ? " Campaign is paused — new rows stay queued until you resume or flush."
              : null}
          </p>

          <label className="mt-4 block text-xs font-semibold text-slate-600">
            Emails (comma, space, or one per line)
            <textarea
              value={emails}
              onChange={(event) => setEmails(event.target.value)}
              rows={4}
              placeholder="alex@acme.com&#10;bailey@logistics.com"
              className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900"
            />
          </label>

          <label className="mt-3 flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={includeSegment}
              onChange={(event) => setIncludeSegment(event.target.checked)}
              className="mt-1"
            />
            <span>
              Also queue any subscribed leads that match this campaign&apos;s segment tags
              and are not already included.
            </span>
          </label>

          <button
            type="button"
            disabled={pending || (!emails.trim() && !includeSegment)}
            onClick={submit}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" />
            {pending ? "Adding…" : "Add to campaign"}
          </button>
        </div>
      </div>
    </section>
  );
}
