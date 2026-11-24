"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Plus, RefreshCw, Trash2 } from "lucide-react";
import { deleteCampaign, flushCampaignQueue } from "@/actions/campaigns";
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

export function AdminCampaignsListView({
  campaigns,
  queuePending = 0,
}: {
  campaigns: CampaignRecord[];
  queuePending?: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function flushQueue() {
    startTransition(async () => {
      const result = await flushCampaignQueue();
      if (!result.success) {
        toast.error(result.error || "Flush failed.");
        return;
      }
      if (result.processed === 0) {
        toast.message(
          result.remaining
            ? `${result.remaining} still queued but not due yet.`
            : "No pending emails in the send queue."
        );
      } else {
        toast.success(
          `Sent ${result.sent}` +
            (result.failed ? ` · ${result.failed} failed` : "") +
            (result.remaining ? ` · ${result.remaining} still pending — click Flush again.` : "")
        );
      }
      router.refresh();
    });
  }

  function confirmDelete(campaign: CampaignRecord) {
    setConfirmId(campaign.id);
  }

  function runDelete(campaign: CampaignRecord) {
    setDeletingId(campaign.id);
    startTransition(async () => {
      const result = await deleteCampaign(campaign.id);
      setDeletingId(null);
      setConfirmId(null);
      if (!result.success) {
        toast.error(result.error || "Could not delete campaign.");
        return;
      }
      toast.success(`Deleted “${campaign.name}”.`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Email campaigns</h1>
          <p className="mt-1 text-sm text-slate-600">
            <span className="font-semibold text-slate-800">SENDING</span> = queued.{" "}
            <span className="font-semibold text-slate-800">Sent</span> rises as Resend
            delivers. Delete any campaign you no longer want to keep.{" "}
            {queuePending > 0 ? (
              <span className="text-amber-700">
                {queuePending} email{queuePending === 1 ? "" : "s"} waiting — click Flush.
              </span>
            ) : (
              "Queue is empty."
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={flushQueue}
            className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-950 hover:bg-amber-100 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />
            Flush send queue
            {queuePending > 0 ? ` (${queuePending})` : ""}
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
          <div
            key={campaign.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-sky-300 hover:shadow-md"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <Link
                href={`/admin/tools/campaigns/${campaign.id}`}
                className="min-w-0 flex-1"
              >
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
                {campaign.status === "sending" && campaign.sentCount === 0 ? (
                  <p className="mt-2 text-xs font-semibold text-amber-700">
                    Queued but not dispatched yet — use Flush send queue.
                  </p>
                ) : null}
              </Link>
              <div className="flex flex-col items-end gap-3">
                <div className="grid grid-cols-3 gap-4 sm:grid-cols-5">
                  <Metric label="Sent" value={campaign.sentCount} />
                  <Metric label="Delivered" value={campaign.deliveredCount} />
                  <Metric label="Opens" value={campaign.openCount} />
                  <Metric label="Clicks" value={campaign.clickCount} />
                  <Metric label="Unsubs" value={campaign.unsubscribeCount} />
                </div>
                {confirmId === campaign.id ? (
                  <div className="flex flex-wrap items-center justify-end gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2">
                    <span className="text-xs font-semibold text-rose-900">
                      Delete permanently?
                    </span>
                    <button
                      type="button"
                      disabled={pending && deletingId === campaign.id}
                      onClick={() => runDelete(campaign)}
                      className="rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                    >
                      {deletingId === campaign.id ? "Deleting…" : "Yes, delete"}
                    </button>
                    <button
                      type="button"
                      disabled={pending && deletingId === campaign.id}
                      onClick={() => setConfirmId(null)}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => confirmDelete(campaign)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-800 hover:bg-rose-100 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete campaign
                  </button>
                )}
              </div>
            </div>
          </div>
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
