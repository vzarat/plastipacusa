"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { removeCampaignRecipients } from "@/actions/campaigns";
import type { CampaignRecord, CampaignSendRecord } from "@/lib/campaigns/types";
import { AdminCampaignAddRecipients } from "@/components/admin/campaigns/AdminCampaignAddRecipients";
import { AdminCampaignBuilder } from "@/components/admin/campaigns/AdminCampaignBuilder";

export function AdminCampaignDetailView({
  campaign,
  sends,
  availableTags,
}: {
  campaign: CampaignRecord;
  sends: CampaignSendRecord[];
  availableTags: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [removeEmails, setRemoveEmails] = useState("");

  const pendingCount = useMemo(
    () => sends.filter((send) => send.status === "pending").length,
    [sends]
  );

  const allSelected = sends.length > 0 && selected.size === sends.length;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(sends.map((send) => send.id)));
  }

  function toggleOne(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function removeSelected() {
    if (selected.size === 0) {
      toast.message("Select at least one row.");
      return;
    }
    startTransition(async () => {
      const result = await removeCampaignRecipients(campaign.id, {
        sendIds: Array.from(selected),
      });
      if (!result.success) {
        toast.error(result.error || "Could not remove recipients.");
        return;
      }
      toast.success(`Removed ${result.removed || 0}. Re-add them to flush again.`);
      setSelected(new Set());
      router.refresh();
    });
  }

  function removeByEmails() {
    if (!removeEmails.trim()) {
      toast.message("Paste emails to remove.");
      return;
    }
    startTransition(async () => {
      const result = await removeCampaignRecipients(campaign.id, {
        emails: removeEmails,
      });
      if (!result.success) {
        toast.error(result.error || "Could not remove recipients.");
        return;
      }
      toast.success(
        result.removed
          ? `Removed ${result.removed}. You can add them again and Flush.`
          : "No matching emails in this campaign."
      );
      setRemoveEmails("");
      setSelected(new Set());
      router.refresh();
    });
  }

  function clearPending() {
    if (pendingCount === 0) {
      toast.message("No pending emails in the queue.");
      return;
    }
    startTransition(async () => {
      const result = await removeCampaignRecipients(campaign.id, {
        pendingOnly: true,
      });
      if (!result.success) {
        toast.error(result.error || "Could not clear pending queue.");
        return;
      }
      toast.success(`Cleared ${result.removed || 0} pending send(s).`);
      setSelected(new Set());
      router.refresh();
    });
  }

  return (
    <div className="space-y-8">
      <AdminCampaignBuilder
        mode="edit"
        campaign={campaign}
        availableTags={availableTags}
      />

      <AdminCampaignAddRecipients campaign={campaign} />

      <section className="rounded-2xl border border-rose-200 bg-rose-50/50 p-5 shadow-sm">
        <h2 className="text-sm font-bold text-slate-900">Remove recipients</h2>
        <p className="mt-1 text-sm text-slate-600">
          Delete rows from this campaign so you can add those emails again and Flush.
          Leads stay in your CRM.
        </p>
        <label className="mt-4 block text-xs font-semibold text-slate-600">
          Emails to remove (comma, space, or one per line)
          <textarea
            value={removeEmails}
            onChange={(event) => setRemoveEmails(event.target.value)}
            rows={3}
            placeholder="alex@acme.com"
            className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-normal text-slate-900"
          />
        </label>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending || !removeEmails.trim()}
            onClick={removeByEmails}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-white px-4 py-2 text-sm font-bold text-rose-800 hover:bg-rose-50 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            Remove these emails
          </button>
          <button
            type="button"
            disabled={pending || pendingCount === 0}
            onClick={clearPending}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Clear all pending ({pendingCount})
          </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-900">
            Recent sends ({sends.length})
          </h2>
          <button
            type="button"
            disabled={pending || selected.size === 0}
            onClick={removeSelected}
            className="inline-flex items-center gap-2 rounded-xl border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-bold text-rose-900 hover:bg-rose-100 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove selected ({selected.size})
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Select all sends"
                  />
                </th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Step</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Opens</th>
                <th className="px-4 py-3 font-semibold">Clicks</th>
                <th className="px-4 py-3 font-semibold">Sent</th>
                <th className="px-4 py-3 font-semibold"> </th>
              </tr>
            </thead>
            <tbody>
              {sends.map((send) => (
                <tr key={send.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(send.id)}
                      onChange={() => toggleOne(send.id)}
                      aria-label={`Select ${send.email}`}
                    />
                  </td>
                  <td className="px-4 py-3 text-slate-800">{send.email}</td>
                  <td className="px-4 py-3 text-slate-600">{send.stepIndex}</td>
                  <td className="px-4 py-3 capitalize text-slate-600">
                    {send.status}
                    {send.error ? (
                      <div className="text-[11px] text-red-600">{send.error}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3">{send.openCount}</td>
                  <td className="px-4 py-3">{send.clickCount}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {send.sentAt
                      ? new Date(send.sentAt).toLocaleString()
                      : send.sendAfter
                        ? `queued ${new Date(send.sendAfter).toLocaleString()}`
                        : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        startTransition(async () => {
                          const result = await removeCampaignRecipients(campaign.id, {
                            sendIds: [send.id],
                          });
                          if (!result.success) {
                            toast.error(result.error || "Remove failed.");
                            return;
                          }
                          toast.success("Removed. Re-add to flush again.");
                          setSelected((current) => {
                            const next = new Set(current);
                            next.delete(send.id);
                            return next;
                          });
                          router.refresh();
                        });
                      }}
                      className="rounded-lg p-1.5 text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                      aria-label={`Remove ${send.email}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {sends.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-sm text-slate-500">
                    No sends queued yet. Launch the campaign to enqueue recipients.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
