"use client";

import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { Pencil, Upload, UserPlus, X } from "lucide-react";
import {
  createManualLead,
  importLeadsCsv,
  updateLead,
  updateLeadStatus,
} from "@/actions/leads";
import type { LeadRecord, LeadStatus } from "@/lib/campaigns/types";

const LEAD_STATUSES: LeadStatus[] = [
  "new",
  "contacted",
  "qualified",
  "converted",
  "archived",
];

type LeadFormState = {
  email: string;
  contactName: string;
  companyName: string;
  phone: string;
  zipCode: string;
  tags: string;
  status: LeadStatus;
  subscribed: boolean;
};

const EMPTY_FORM: LeadFormState = {
  email: "",
  contactName: "",
  companyName: "",
  phone: "",
  zipCode: "",
  tags: "",
  status: "new",
  subscribed: true,
};

function formFromLead(lead: LeadRecord): LeadFormState {
  return {
    email: lead.email,
    contactName: lead.contactName,
    companyName: lead.companyName,
    phone: lead.phone,
    zipCode: lead.zipCode,
    tags: lead.tags.join(", "),
    status: lead.status,
    subscribed: lead.subscribed,
  };
}

function parseTags(value: string): string[] {
  return value
    .split(/[|,]/)
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function AdminLeadsView({
  initialLeads,
  allTags,
}: {
  initialLeads: LeadRecord[];
  allTags: string[];
}) {
  const [leads, setLeads] = useState(initialLeads);
  const [query, setQuery] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [csvText, setCsvText] = useState("");
  const [csvTags, setCsvTags] = useState("");
  const [pending, startTransition] = useTransition();
  const [manual, setManual] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<LeadFormState>(EMPTY_FORM);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return leads.filter((lead) => {
      if (tagFilter && !lead.tags.includes(tagFilter)) return false;
      if (!q) return true;
      return (
        lead.email.includes(q) ||
        lead.companyName.toLowerCase().includes(q) ||
        lead.contactName.toLowerCase().includes(q) ||
        lead.phone.includes(q)
      );
    });
  }, [leads, query, tagFilter]);

  const subscribedCount = leads.filter((lead) => lead.subscribed).length;
  const editingLead = editingId
    ? leads.find((lead) => lead.id === editingId) || null
    : null;

  function onCsvFile(file: File | null) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setCsvText(String(reader.result || ""));
    reader.readAsText(file);
  }

  function handleImport() {
    startTransition(async () => {
      const tags = parseTags(csvTags);
      const result = await importLeadsCsv(csvText, tags);
      if (!result.success && result.imported === 0 && result.updated === 0) {
        toast.error(result.errors[0] || "Import failed.");
        return;
      }
      toast.success(
        `Imported ${result.imported}, updated ${result.updated}${
          result.errors.length ? ` (${result.errors.length} row warnings)` : ""
        }.`
      );
      window.location.reload();
    });
  }

  function handleCreate() {
    startTransition(async () => {
      const result = await createManualLead({
        email: manual.email,
        contactName: manual.contactName,
        companyName: manual.companyName,
        phone: manual.phone,
        zipCode: manual.zipCode,
        tags: parseTags(manual.tags),
      });
      if (!result.success) {
        toast.error(result.error || "Could not create lead.");
        return;
      }
      toast.success("Lead saved.");
      setManual(EMPTY_FORM);
      window.location.reload();
    });
  }

  function openEdit(lead: LeadRecord) {
    setEditingId(lead.id);
    setEditForm(formFromLead(lead));
  }

  function closeEdit() {
    setEditingId(null);
    setEditForm(EMPTY_FORM);
  }

  function handleSaveEdit() {
    if (!editingId) return;
    startTransition(async () => {
      const result = await updateLead({
        id: editingId,
        email: editForm.email,
        contactName: editForm.contactName,
        companyName: editForm.companyName,
        phone: editForm.phone,
        zipCode: editForm.zipCode,
        tags: parseTags(editForm.tags),
        status: editForm.status,
        subscribed: editForm.subscribed,
      });
      if (!result.success || !result.lead) {
        toast.error(result.error || "Could not update lead.");
        return;
      }
      setLeads((current) =>
        current.map((row) => (row.id === result.lead!.id ? result.lead! : row))
      );
      toast.success("Lead updated.");
      closeEdit();
    });
  }

  function toggleSubscribed(lead: LeadRecord) {
    startTransition(async () => {
      const next = !lead.subscribed;
      const result = await updateLeadStatus({ id: lead.id, subscribed: next });
      if (!result.success) {
        toast.error(result.error || "Update failed.");
        return;
      }
      setLeads((current) =>
        current.map((row) =>
          row.id === lead.id ? { ...row, subscribed: next } : row
        )
      );
      if (editingId === lead.id) {
        setEditForm((current) => ({ ...current, subscribed: next }));
      }
      toast.success(next ? "Lead re-subscribed." : "Lead unsubscribed.");
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Leads</h1>
          <p className="mt-1 text-sm text-slate-600">
            {leads.length} contacts · {subscribedCount} subscribed · CSV + Facebook Lead Ads
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <Upload className="h-4 w-4 text-sky-600" />
            <h2 className="text-sm font-bold text-slate-900">Import CSV</h2>
          </div>
          <p className="mb-3 text-xs text-slate-500">
            Headers: email, company_name, contact_name, phone, zip_code, tags
          </p>
          <input
            type="file"
            accept=".csv,text/csv"
            className="mb-3 block w-full text-sm text-slate-600"
            onChange={(event) => onCsvFile(event.target.files?.[0] || null)}
          />
          <input
            value={csvTags}
            onChange={(event) => setCsvTags(event.target.value)}
            placeholder="Default tags (comma-separated)"
            className="mb-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <textarea
            value={csvText}
            onChange={(event) => setCsvText(event.target.value)}
            rows={6}
            placeholder="Or paste CSV here…"
            className="mb-3 w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs"
          />
          <button
            type="button"
            disabled={pending || !csvText.trim()}
            onClick={handleImport}
            className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-50"
          >
            Import leads
          </button>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-sky-600" />
            <h2 className="text-sm font-bold text-slate-900">Add lead</h2>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                ["email", "Email *"],
                ["contactName", "Contact name"],
                ["companyName", "Company"],
                ["phone", "Phone"],
                ["zipCode", "ZIP"],
                ["tags", "Tags"],
              ] as const
            ).map(([key, label]) => (
              <label key={key} className="block text-xs font-semibold text-slate-600">
                {label}
                <input
                  value={manual[key]}
                  onChange={(event) =>
                    setManual((current) => ({ ...current, [key]: event.target.value }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900"
                />
              </label>
            ))}
          </div>
          <button
            type="button"
            disabled={pending || !manual.email.trim()}
            onClick={handleCreate}
            className="mt-3 rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            Save lead
          </button>
          <p className="mt-4 text-xs text-slate-500">
            Facebook webhook: <code className="rounded bg-slate-100 px-1">/api/webhooks/facebook-leads</code>
          </p>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search email, company, name…"
            className="min-w-[220px] flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
          <select
            value={tagFilter}
            onChange={(event) => setTagFilter(event.target.value)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">All tags</option>
            {allTags.map((tag) => (
              <option key={tag} value={tag}>
                {tag}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">Company</th>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3 font-semibold">Tags</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Subscribed</th>
                <th className="px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((lead) => (
                <tr key={lead.id} className="border-t border-slate-100">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-slate-900">{lead.contactName || "—"}</div>
                    <div className="text-xs text-slate-500">{lead.email}</div>
                    {lead.phone ? (
                      <div className="text-xs text-slate-400">{lead.phone}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {lead.companyName || "—"}
                    {lead.zipCode ? (
                      <div className="text-xs text-slate-400">{lead.zipCode}</div>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-600">{lead.source}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {lead.tags.length === 0 ? (
                        <span className="text-xs text-slate-400">—</span>
                      ) : (
                        lead.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800"
                          >
                            {tag}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 capitalize text-slate-600">{lead.status}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => toggleSubscribed(lead)}
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        lead.subscribed
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {lead.subscribed ? "Yes" : "No"}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => openEdit(lead)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">
                    No leads match this filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>

      {editingLead ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-lead-title"
            className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-xl"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 id="edit-lead-title" className="text-lg font-bold text-slate-900">
                  Edit lead
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  Source: {editingLead.source}
                  {editingLead.externalId ? ` · ${editingLead.externalId}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={closeEdit}
                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["email", "Email *"],
                  ["contactName", "Contact name"],
                  ["companyName", "Company"],
                  ["phone", "Phone"],
                  ["zipCode", "ZIP"],
                  ["tags", "Tags"],
                ] as const
              ).map(([key, label]) => (
                <label key={key} className="block text-xs font-semibold text-slate-600">
                  {label}
                  <input
                    value={editForm[key]}
                    onChange={(event) =>
                      setEditForm((current) => ({
                        ...current,
                        [key]: event.target.value,
                      }))
                    }
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900"
                  />
                </label>
              ))}

              <label className="block text-xs font-semibold text-slate-600">
                Status
                <select
                  value={editForm.status}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      status: event.target.value as LeadStatus,
                    }))
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900"
                >
                  {LEAD_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex items-center gap-2 self-end rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
                <input
                  type="checkbox"
                  checked={editForm.subscribed}
                  onChange={(event) =>
                    setEditForm((current) => ({
                      ...current,
                      subscribed: event.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-slate-300"
                />
                Subscribed
              </label>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={closeEdit}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending || !editForm.email.trim()}
                onClick={handleSaveEdit}
                className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-50"
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
