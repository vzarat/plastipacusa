"use client";

import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { Plus, RefreshCw } from "lucide-react";
import { flushCampaignQueue } from "@/actions/campaigns";
import type { CampaignRecord } from "@/lib/campaigns/types";

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </div>
      <div className="text-sm font-bold text-slate-900">{value.toLocaleString()}</div>
    </div>
  );
}

export function AdminCampaignsListView({ campaigns }: { campaigns: CampaignRecord[] }) {
  const [pending, startTransition] = useTransition();

  function flushQueue() {
    startTransition(async () => {
      const result = await flushCampaignQueue();
      if (!result.success) {
        toast.error(result.error || "Flush failed.");
        return;
      }
      toast.success(
        `Dispatched ${result.sent} sent / ${result.failed} failed (${result.processed} processed).`
      );
      window.location.reload();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Email campaigns</h1>
          <p className="mt-1 text-sm text-slate-600">
            Broadcast or sequence campaigns via Resend with rate-limited dispatch.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={flushQueue}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />
            Flush send queue
          </button>
          <Link
            href="/admin/tools/campaigns/new"
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700"
          >
            <Plus className="h-4 w-4" />
            New campaign
          </Link>
        </div>
      </div>

      <div className="space-y-3">
        {campaigns.map((campaign) => (
          <Link
            key={campaign.id}
            href={`/admin/tools/campaigns/${campaign.id}`}
            className="block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-300 hover:shadow-md"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-slate-900">{campaign.name}</h2>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold uppercase text-slate-600">
                    {campaign.type}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold uppercase ${
                      campaign.status === "sent"
                        ? "bg-emerald-50 text-emerald-800"
                        : campaign.status === "sending"
                          ? "bg-amber-50 text-amber-800"
                          : campaign.status === "paused"
                            ? "bg-orange-50 text-orange-800"
                            : "bg-sky-50 text-sky-800"
                    }`}
                  >
                    {campaign.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-600">{campaign.subject || "No subject"}</p>
                {campaign.segmentTags.length > 0 ? (
                  <p className="mt-2 text-xs text-slate-500">
                    Segment: {campaign.segmentTags.join(", ")}
                  </p>
                ) : (
                  <p className="mt-2 text-xs text-slate-500">Segment: all subscribed leads</p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
                <Metric label="Sent" value={campaign.sentCount} />
                <Metric label="Delivered" value={campaign.deliveredCount} />
                <Metric label="Opens" value={campaign.openCount} />
                <Metric label="Clicks" value={campaign.clickCount} />
                <Metric label="Unsubs" value={campaign.unsubscribeCount} />
              </div>
            </div>
          </Link>
        ))}

        {campaigns.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
            <p className="text-sm text-slate-600">No campaigns yet.</p>
            <Link
              href="/admin/tools/campaigns/new"
              className="mt-4 inline-flex rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700"
            >
              Create your first campaign
            </Link>
          </div>
        ) : null}
      </div>
    </div>
  );
}
