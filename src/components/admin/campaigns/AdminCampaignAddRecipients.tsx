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
  const [showInCampaign, setShowInCampaign] = useState(false);

  const alreadyInCampaign = useMemo(() => {
    const emails = new Set(
      sends.map((send) => send.email.toLowerCase()).filter(Boolean)
    );
    const leadIds = new Set(
      sends.map((send) => send.leadId).filter((id): id is string => Boolean(id))
    );
    return { emails, leadIds };
  }, [sends]);

  const filteredLeads = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((lead) => {
      const inCampaign =
        alreadyInCampaign.leadIds.has(lead.id) ||
        alreadyInCampaign.emails.has(lead.email.toLowerCase());
      if (inCampaign && !showInCampaign) return false;
      if (!q) return true;
      return (
        lead.email.toLowerCase().includes(q) ||
        lead.companyName.toLowerCase().includes(q) ||
        lead.contactName.toLowerCase().includes(q) ||
        lead.tags.some((tag) => tag.includes(q))
      );
    });
  }, [leads, alreadyInCampaign, query, showInCampaign]);

  const selectableLeads = useMemo(
    () =>
      filteredLeads.filter((lead) => {
        if (!lead.subscribed) return false;
        if (alreadyInCampaign.leadIds.has(lead.id)) return false;
        if (alreadyInCampaign.emails.has(lead.email.toLowerCase())) return false;
        return true;
      }),
    [filteredLeads, alreadyInCampaign]
  );

  const allSelected =
    selectableLeads.length > 0 &&
    selectableLeads.every((lead) => selected.has(lead.id));

  const blocked = campaign.status === "cancelled";

  function toggleAll() {
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(selectableLeads.map((lead) => lead.id)));
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
    if (blocked) {
      toast.error("Cancelled campaigns cannot accept recipients.");
      return;
    }
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
    <section className="rounded-2xl border border-sky-200 bg-white shadow-sm overflow-hidden">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-sky-100 bg-sky-50/70 px-4 py-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">
            Leads ({leads.length}) — select emails to add
          </h2>
          <p className="mt-1 text-xs text-slate-600">
            Check one, check all, then Add selected. Already-in-campaign leads stay hidden
            unless you toggle them below.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search leads…"
            className="w-48 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
          />
          <button
            type="button"
            disabled={pending || selected.size === 0 || blocked}
            onClick={submit}
            className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-50"
          >
            <UserPlus className="h-4 w-4" />
            {pending ? "Adding…" : `Add selected (${selected.size})`}
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 px-4 py-2 text-xs text-slate-600">
        <label className="inline-flex items-center gap-2">
          <input
            type="checkbox"
            checked={showInCampaign}
            onChange={(event) => setShowInCampaign(event.target.checked)}
          />
          Show leads already in this campaign
        </label>
        <span>
          Showing {filteredLeads.length} · selectable {selectableLeads.length}
        </span>
      </div>

      <div className="overflow-x-auto max-h-[32rem]">
        <table className="min-w-full text-left text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  disabled={selectableLeads.length === 0 || blocked}
                  aria-label="Select all leads"
                />
              </th>
              <th className="px-4 py-3 font-semibold">Email</th>
              <th className="px-4 py-3 font-semibold">Contact</th>
              <th className="px-4 py-3 font-semibold">Company</th>
              <th className="px-4 py-3 font-semibold">Tags</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredLeads.map((lead) => {
              const inCampaign =
                alreadyInCampaign.leadIds.has(lead.id) ||
                alreadyInCampaign.emails.has(lead.email.toLowerCase());
              const canSelect = lead.subscribed && !inCampaign && !blocked;
              return (
                <tr
                  key={lead.id}
                  className={`border-t border-slate-100 ${
                    canSelect ? "bg-white" : "bg-slate-50/80"
                  }`}
                >
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selected.has(lead.id)}
                      disabled={!canSelect}
                      onChange={() => toggleOne(lead.id)}
                      aria-label={`Select ${lead.email}`}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">{lead.email}</td>
                  <td className="px-4 py-3 text-slate-600">{lead.contactName || "—"}</td>
                  <td className="px-4 py-3 text-slate-600">{lead.companyName || "—"}</td>
                  <td className="px-4 py-3 text-xs text-slate-500">
                    {lead.tags.length ? lead.tags.join(", ") : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {!lead.subscribed ? (
                      <span className="font-semibold text-rose-700">Unsubscribed</span>
                    ) : inCampaign ? (
                      <span className="font-semibold text-slate-500">In campaign</span>
                    ) : (
                      <span className="font-semibold text-emerald-700">Available</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {filteredLeads.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-slate-500">
                  {leads.length === 0 ? (
                    <>
                      No leads loaded. Import them under{" "}
                      <a
                        href="/admin/tools/leads"
                        className="font-semibold text-sky-700 underline"
                      >
                        Tools → Leads
                      </a>
                      .
                    </>
                  ) : (
                    "No leads match this search. Clear search or show leads already in campaign."
                  )}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
