"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { removeCampaignRecipients } from "@/actions/campaigns";
import type {
  CampaignRecord,
  CampaignSendRecord,
  LeadRecord,
} from "@/lib/campaigns/types";
import { AdminCampaignAddRecipients } from "@/components/admin/campaigns/AdminCampaignAddRecipients";
import { AdminCampaignBuilder } from "@/components/admin/campaigns/AdminCampaignBuilder";

export function AdminCampaignDetailView({
  campaign,
  sends,
  leads,
  availableTags,
}: {
  campaign: CampaignRecord;
  sends: CampaignSendRecord[];
  leads: LeadRecord[];
  availableTags: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [removingId, setRemovingId] = useState<string | null>(null);

  function removeOne(sendId: string, email: string) {
    setRemovingId(sendId);
    startTransition(async () => {
      const result = await removeCampaignRecipients(campaign.id, {
        sendIds: [sendId],
      });
      setRemovingId(null);
      if (!result.success) {
        toast.error(result.error || "Remove failed.");
        return;
      }
      toast.success(`Removed ${email}. You can select it again above.`);
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

      <AdminCampaignAddRecipients campaign={campaign} leads={leads} sends={sends} />

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-900">
            Recent sends ({sends.length})
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Use the trash icon to remove a recipient so you can add and flush again.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
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
                      disabled={pending && removingId === send.id}
                      onClick={() => removeOne(send.id, send.email)}
                      className="rounded-lg p-1.5 text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                      aria-label={`Remove ${send.email}`}
                      title="Remove from campaign"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {sends.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-slate-500">
                    No sends yet. Select leads above and add them to the campaign.
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
