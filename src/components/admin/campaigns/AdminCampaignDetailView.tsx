"use client";

import type { CampaignRecord, CampaignSendRecord } from "@/lib/campaigns/types";
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
  return (
    <div className="space-y-8">
      <AdminCampaignBuilder
        mode="edit"
        campaign={campaign}
        availableTags={availableTags}
      />

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 px-4 py-3">
          <h2 className="text-sm font-bold text-slate-900">
            Recent sends ({sends.length})
          </h2>
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
                </tr>
              ))}
              {sends.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
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
