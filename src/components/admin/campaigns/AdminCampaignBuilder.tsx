"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createCampaign,
  launchCampaign,
  pauseCampaign,
  resumeCampaign,
  updateCampaign,
} from "@/actions/campaigns";
import {
  catalogCtaHtml,
  defaultCampaignBodyHtml,
  defaultCampaignFromAddress,
  freeDeliveryCtaHtml,
  wrapCampaignHtml,
} from "@/lib/campaigns/template";
import type { CampaignRecord, CampaignType, SequenceStep } from "@/lib/campaigns/types";

export function AdminCampaignBuilder({
  mode,
  campaign,
  availableTags,
}: {
  mode: "create" | "edit";
  campaign?: CampaignRecord | null;
  availableTags: string[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const [name, setName] = useState(campaign?.name || "");
  const [type, setType] = useState<CampaignType>(campaign?.type || "broadcast");
  const [subject, setSubject] = useState(campaign?.subject || "");
  const [previewText, setPreviewText] = useState(campaign?.previewText || "");
  const [htmlBody, setHtmlBody] = useState(
    campaign?.htmlBody || defaultCampaignBodyHtml()
  );
  const [segmentTags, setSegmentTags] = useState<string[]>(campaign?.segmentTags || []);
  const [fromAddress, setFromAddress] = useState(
    campaign?.fromAddress || defaultCampaignFromAddress()
  );
  const [sequenceSteps, setSequenceSteps] = useState<SequenceStep[]>(
    campaign?.sequenceSteps?.length
      ? campaign.sequenceSteps
      : [{ delayHours: 72, subject: "", htmlBody: defaultCampaignBodyHtml() }]
  );

  const editable =
    mode === "create" ||
    campaign?.status === "draft" ||
    campaign?.status === "scheduled" ||
    campaign?.status === "paused";

  const previewHtml = useMemo(
    () =>
      wrapCampaignHtml({
        bodyHtml: htmlBody,
        previewText,
        unsubscribeToken: "preview-token",
        contactName: "Alex",
        companyName: "Acme Logistics",
      }),
    [htmlBody, previewText]
  );

  function toggleTag(tag: string) {
    setSegmentTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag]
    );
  }

  function insertSnippet(snippet: string) {
    setHtmlBody((current) => `${current}\n${snippet}`);
  }

  function saveDraft() {
    startTransition(async () => {
      const payload = {
        name,
        type,
        subject,
        previewText,
        htmlBody,
        segmentTags,
        fromAddress,
        sequenceSteps: type === "sequence" ? sequenceSteps : [],
      };

      if (mode === "create") {
        const result = await createCampaign(payload);
        if (!result.success || !result.id) {
          toast.error(result.error || "Could not create campaign.");
          return;
        }
        toast.success("Campaign draft saved.");
        router.push(`/admin/tools/campaigns/${result.id}`);
        router.refresh();
        return;
      }

      if (!campaign?.id) return;
      const result = await updateCampaign(campaign.id, payload);
      if (!result.success) {
        toast.error(result.error || "Could not update campaign.");
        return;
      }
      toast.success("Campaign updated.");
      router.refresh();
    });
  }

  function handleLaunch() {
    if (!campaign?.id) {
      toast.error("Save the draft before launching.");
      return;
    }
    startTransition(async () => {
      if (editable && mode === "edit") {
        await updateCampaign(campaign.id, {
          name,
          type,
          subject,
          previewText,
          htmlBody,
          segmentTags,
          fromAddress,
          sequenceSteps: type === "sequence" ? sequenceSteps : [],
        });
      }
      const result = await launchCampaign(campaign.id);
      if (!result.success) {
        toast.error(result.error || "Launch failed.");
        return;
      }
      toast.success(
        `Queued ${result.queued} recipients` +
          (result.dispatched
            ? ` · started sending ${result.dispatched} now.`
            : ". Use Flush send queue if Sent stays at 0.")
      );
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {mode === "create" ? "New campaign" : campaign?.name || "Campaign"}
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Plastipac-branded HTML with mandatory unsubscribe footer.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {editable ? (
            <button
              type="button"
              disabled={pending}
              onClick={saveDraft}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Save draft
            </button>
          ) : null}
          {campaign?.status === "draft" || campaign?.status === "scheduled" ? (
            <button
              type="button"
              disabled={pending}
              onClick={handleLaunch}
              className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white hover:bg-sky-700 disabled:opacity-50"
            >
              Launch campaign
            </button>
          ) : null}
          {campaign?.status === "sending" ? (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await pauseCampaign(campaign.id);
                  if (!result.success) toast.error(result.error || "Pause failed.");
                  else {
                    toast.success("Campaign paused.");
                    router.refresh();
                  }
                })
              }
              className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-bold text-amber-900"
            >
              Pause
            </button>
          ) : null}
          {campaign?.status === "paused" ? (
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await resumeCampaign(campaign.id);
                  if (!result.success) toast.error(result.error || "Resume failed.");
                  else {
                    toast.success("Campaign resumed.");
                    router.refresh();
                  }
                })
              }
              className="rounded-xl bg-sky-600 px-4 py-2 text-sm font-bold text-white"
            >
              Resume
            </button>
          ) : null}
        </div>
      </div>

      {campaign ? (
        <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-5">
          {(
            [
              ["Sent", campaign.sentCount],
              ["Delivered", campaign.deliveredCount],
              ["Opens", campaign.openCount],
              ["Clicks", campaign.clickCount],
              ["Unsubscribes", campaign.unsubscribeCount],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="rounded-xl bg-slate-50 px-3 py-2">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {label}
              </div>
              <div className="text-lg font-bold text-slate-900">{value.toLocaleString()}</div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <label className="block text-xs font-semibold text-slate-600">
            Campaign name
            <input
              value={name}
              disabled={!editable}
              onChange={(event) => setName(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 disabled:bg-slate-50"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-slate-600">
              Type
              <select
                value={type}
                disabled={!editable}
                onChange={(event) => setType(event.target.value as CampaignType)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 disabled:bg-slate-50"
              >
                <option value="broadcast">Broadcast</option>
                <option value="sequence">Sequence</option>
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              From
              <input
                value={fromAddress}
                disabled={!editable}
                onChange={(event) => setFromAddress(event.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 disabled:bg-slate-50"
              />
            </label>
          </div>

          <label className="block text-xs font-semibold text-slate-600">
            Subject
            <input
              value={subject}
              disabled={!editable}
              onChange={(event) => setSubject(event.target.value)}
              placeholder="Stretch film pricing for {{company_name}}"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 disabled:bg-slate-50"
            />
          </label>

          <label className="block text-xs font-semibold text-slate-600">
            Preview text
            <input
              value={previewText}
              disabled={!editable}
              onChange={(event) => setPreviewText(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-normal text-slate-900 disabled:bg-slate-50"
            />
          </label>

          <div>
            <div className="mb-2 text-xs font-semibold text-slate-600">
              Audience tags (empty = all subscribed)
            </div>
            <div className="flex flex-wrap gap-2">
              {availableTags.length === 0 ? (
                <span className="text-xs text-slate-400">No tags yet — import leads first.</span>
              ) : (
                availableTags.map((tag) => {
                  const active = segmentTags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      disabled={!editable}
                      onClick={() => toggleTag(tag)}
                      className={`rounded-full px-3 py-1 text-xs font-bold ${
                        active
                          ? "bg-sky-600 text-white"
                          : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          <div>
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-600">HTML body</span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!editable}
                  onClick={() => insertSnippet(catalogCtaHtml())}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700"
                >
                  + Catalog CTA
                </button>
                <button
                  type="button"
                  disabled={!editable}
                  onClick={() => insertSnippet(freeDeliveryCtaHtml())}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700"
                >
                  + Free Delivery CTA
                </button>
                <button
                  type="button"
                  disabled={!editable}
                  onClick={() => insertSnippet("{{unsubscribe_url}}")}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700"
                >
                  + Unsubscribe URL
                </button>
              </div>
            </div>
            <textarea
              value={htmlBody}
              disabled={!editable}
              onChange={(event) => setHtmlBody(event.target.value)}
              rows={14}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 font-mono text-xs text-slate-900 disabled:bg-slate-50"
            />
            <p className="mt-2 text-[11px] text-slate-500">
              Merge fields: {"{{contact_name}}"}, {"{{company_name}}"}. Footer unsubscribe is always
              appended.
            </p>
          </div>

          {type === "sequence" ? (
            <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
                Sequence steps (step 0 = primary email above)
              </div>
              {sequenceSteps.map((step, index) => (
                <div key={index} className="rounded-xl border border-slate-200 bg-white p-3 space-y-2">
                  <div className="text-xs font-semibold text-slate-700">Follow-up #{index + 1}</div>
                  <input
                    type="number"
                    min={0}
                    disabled={!editable}
                    value={step.delayHours}
                    onChange={(event) => {
                      const delayHours = Number(event.target.value) || 0;
                      setSequenceSteps((current) =>
                        current.map((row, i) =>
                          i === index ? { ...row, delayHours } : row
                        )
                      );
                    }}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Delay hours after previous"
                  />
                  <input
                    disabled={!editable}
                    value={step.subject}
                    onChange={(event) => {
                      const nextSubject = event.target.value;
                      setSequenceSteps((current) =>
                        current.map((row, i) =>
                          i === index ? { ...row, subject: nextSubject } : row
                        )
                      );
                    }}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    placeholder="Follow-up subject"
                  />
                  <textarea
                    disabled={!editable}
                    value={step.htmlBody}
                    onChange={(event) => {
                      const nextBody = event.target.value;
                      setSequenceSteps((current) =>
                        current.map((row, i) =>
                          i === index ? { ...row, htmlBody: nextBody } : row
                        )
                      );
                    }}
                    rows={5}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 font-mono text-xs"
                  />
                </div>
              ))}
              {editable ? (
                <button
                  type="button"
                  onClick={() =>
                    setSequenceSteps((current) => [
                      ...current,
                      {
                        delayHours: 72,
                        subject: "",
                        htmlBody: defaultCampaignBodyHtml(),
                      },
                    ])
                  }
                  className="text-xs font-bold text-sky-700"
                >
                  + Add follow-up step
                </button>
              ) : null}
            </div>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-3 text-xs font-bold uppercase tracking-wide text-slate-500">
            Live preview
          </div>
          <iframe
            title="Email preview"
            className="h-[720px] w-full rounded-xl border border-slate-200 bg-slate-50"
            srcDoc={previewHtml}
          />
        </div>
      </div>
    </div>
  );
}
