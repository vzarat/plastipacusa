"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { UserPlus } from "lucide-react";
import { addRecipientsToCampaign } from "@/actions/campaigns";
import type { CampaignRecord, CampaignSendRecord, LeadRecord } from "@/lib/campaigns/types";

export function AdminCampaignAddRecipients({
  campaign,
  leads,
  sends,
}: {
  campaign: CampaignRecord;
  leads: LeadRecord[];
  sends: CampaignSendRecord[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");

  const canAdd =
    campaign.status === "sending" ||
    campaign.status === "sent" ||
    campaign.status === "paused";

  const alreadyInCampaign = useMemo(() => {
    const emails = new Set(
      sends.map((send) => send.email.toLowerCase()).filter(Boolean)
    );
    const leadIds = new Set(
      sends.map((send) => send.leadId).filter((id): id is string => Boolean(id))
    );
    return { emails, leadIds };
  }, [sends]);

  const availableLeads = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((lead) => {
      if (!lead.subscribed) return false;
      if (alreadyInCampaign.leadIds.has(lead.id)) return false;
      if (alreadyInCampaign.emails.has(lead.email.toLowerCase())) return false;
      if (!q) return true;
      return (
        lead.email.toLowerCase().includes(q) ||
        lead.companyName.toLowerCase().includes(q) ||
        lead.contactName.toLowerCase().includes(q)
      );
    });
  }, [leads, alreadyInCampaign, query]);

  const allSelected =
    availableLeads.length > 0 &&
    availableLeads.every((lead) => selected.has(lead.id));

  if (!canAdd) return null;

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(availableLeads.map((lead) => lead.id)));
  }

  function toggleOne(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function submit() {
    if (selected.size === 0) {
      toast.message("Select at least one lead.");
      return;
    }
    startTransition(async () => {
      const result = await addRecipientsToCampaign(campaign.id, {
        leadIds: Array.from(selected),
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

      if (!result.queued) {
        toast.message(parts.join(" · ") || "No new recipients added.");
      } else {
        toast.success(parts.join(" · "));
        setSelected(new Set());
      }
      router.refresh();
    });
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">Add leads to campaign</h2>
          <p className="mt-1 text-xs text-slate-500">
            Check the emails you want to include. Already queued/sent leads are hidden.
            {campaign.status === "paused"
              ? " Paused — new rows stay queued until Resume or Flush."
              : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search leads…"
            className="w-48 rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
          />
          <button
            type="button"
            disabled={pending || selected.size === 0}
            onClick={submit}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" />
            {pending ? "Adding…" : `Add selected (${selected.size})`}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto max-h-[28rem]">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all leads"
                />
              </th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Contact</th>
              <th className="px-4 py-3 font-semibold">Company</th>
              <th className="px-4 py-3 font-semibold">Tags</th>
            </tr>
          </thead>
          <tbody>
            {availableLeads.map((lead) => (
              <tr key={lead.id} className="border-t border-slate-100">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(lead.id)}
                    onChange={() => toggleOne(lead.id)}
                    aria-label={`Select ${lead.email}`}
                  />
                </td>
                <td className="px-4 py-3 text-slate-800">{lead.email}</td>
                <td className="px-4 py-3 text-slate-600">{lead.contactName || "—"}</td>
                <td className="px-4 py-3 text-slate-600">{lead.companyName || "—"}</td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {lead.tags.length ? lead.tags.join(", ") : "—"}
                </td>
              </tr>
            ))}
            {availableLeads.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                  {leads.length === 0
                    ? "No leads yet. Import them under Tools → Leads."
                    : "No subscribed leads left to add (or none match your search)."}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
