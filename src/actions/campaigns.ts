"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/actions/auth";
import { upsertLead } from "@/actions/leads";
import { mapCampaignRow, mapCampaignSendRow, mapLeadRow } from "@/lib/campaigns/map";
import {
  defaultCampaignBodyHtml,
  defaultCampaignFromAddress,
  htmlToPlainText,
  unsubscribeUrl,
  wrapCampaignHtml,
} from "@/lib/campaigns/template";
import type {
  CampaignDraftInput,
  CampaignRecord,
  CampaignSendRecord,
  SequenceStep,
} from "@/lib/campaigns/types";
import { CONTACT_FROM } from "@/lib/company-email";
import { sendEmail } from "@/lib/email";
import { createServiceRoleClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

/** Max emails dispatched per cron tick to protect domain reputation. */
const CAMPAIGN_BATCH_SIZE = 25;
/** Minimum gap between sends inside a batch (ms). */
const CAMPAIGN_SEND_GAP_MS = 200;

async function requireAdmin() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.profile.role !== "admin") return null;
  return currentUser;
}

async function adminDb() {
  if (isServiceRoleConfigured()) return createServiceRoleClient();
  return createServerClient();
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function normalizeTags(tags: string[] | undefined): string[] {
  return Array.from(
    new Set(
      (tags || [])
        .map((tag) => String(tag || "").trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

export async function listCampaigns(): Promise<CampaignRecord[]> {
  const admin = await requireAdmin();
  if (!admin) return [];
  const db = await adminDb();
  const { data, error } = await db
    .from("campaigns")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) {
    console.error("[campaigns] listCampaigns:", error.message);
    return [];
  }
  return (data || []).map((row) => mapCampaignRow(row as Record<string, unknown>));
}

export async function getCampaign(
  id: string
): Promise<{ campaign: CampaignRecord | null; sends: CampaignSendRecord[] }> {
  const admin = await requireAdmin();
  if (!admin) return { campaign: null, sends: [] };

  const db = await adminDb();
  const { data: campaign } = await db.from("campaigns").select("*").eq("id", id).maybeSingle();
  if (!campaign) return { campaign: null, sends: [] };

  const { data: sends } = await db
    .from("campaign_sends")
    .select("*")
    .eq("campaign_id", id)
    .order("created_at", { ascending: false })
    .limit(500);

  return {
    campaign: mapCampaignRow(campaign as Record<string, unknown>),
    sends: (sends || []).map((row) => mapCampaignSendRow(row as Record<string, unknown>)),
  };
}

export async function createCampaign(
  input: CampaignDraftInput
): Promise<{ success: boolean; id?: string; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { success: false, error: "Unauthorized." };

  const name = String(input.name || "").trim();
  const subject = String(input.subject || "").trim();
  const htmlBody = String(input.htmlBody || "").trim() || defaultCampaignBodyHtml();
  if (!name) return { success: false, error: "Campaign name is required." };
  if (!subject) return { success: false, error: "Subject is required." };

  const db = await adminDb();
  const textBody =
    String(input.textBody || "").trim() || htmlToPlainText(htmlBody);

  const { data, error } = await db
    .from("campaigns")
    .insert({
      name,
      type: input.type === "sequence" ? "sequence" : "broadcast",
      status: "draft",
      subject,
      preview_text: String(input.previewText || "").trim(),
      html_body: htmlBody,
      text_body: textBody,
      segment_tags: normalizeTags(input.segmentTags),
      from_address: String(input.fromAddress || defaultCampaignFromAddress()).trim() || CONTACT_FROM,
      scheduled_at: input.scheduledAt || null,
      sequence_steps: input.sequenceSteps || [],
      created_by: admin.user.id,
      updated_at: new Date().toISOString(),
    })
    .select("id")
    .single();

  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/tools/campaigns");
  return { success: true, id: data.id as string };
}

export async function updateCampaign(
  id: string,
  input: Partial<CampaignDraftInput> & { status?: CampaignRecord["status"] }
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { success: false, error: "Unauthorized." };

  const db = await adminDb();
  const { data: existing } = await db
    .from("campaigns")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  if (!existing) return { success: false, error: "Campaign not found." };
  if (existing.status === "sending" || existing.status === "sent") {
    return { success: false, error: "Cannot edit a campaign that is sending or already sent." };
  }

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.name != null) patch.name = String(input.name).trim();
  if (input.type != null) patch.type = input.type === "sequence" ? "sequence" : "broadcast";
  if (input.subject != null) patch.subject = String(input.subject).trim();
  if (input.previewText != null) patch.preview_text = String(input.previewText).trim();
  if (input.htmlBody != null) {
    patch.html_body = String(input.htmlBody).trim();
    if (input.textBody == null) patch.text_body = htmlToPlainText(String(input.htmlBody));
  }
  if (input.textBody != null) patch.text_body = String(input.textBody).trim();
  if (input.segmentTags != null) patch.segment_tags = normalizeTags(input.segmentTags);
  if (input.fromAddress != null) patch.from_address = String(input.fromAddress).trim();
  if (input.scheduledAt !== undefined) patch.scheduled_at = input.scheduledAt;
  if (input.sequenceSteps != null) patch.sequence_steps = input.sequenceSteps;
  if (input.status != null) patch.status = input.status;

  const { error } = await db.from("campaigns").update(patch).eq("id", id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/tools/campaigns");
  revalidatePath(`/admin/tools/campaigns/${id}`);
  return { success: true };
}

async function selectAudience(
  db: Awaited<ReturnType<typeof adminDb>>,
  segmentTags: string[]
) {
  let query = db.from("leads").select("*").eq("subscribed", true).limit(5000);
  if (segmentTags.length > 0) {
    query = query.overlaps("tags", segmentTags);
  }
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data || []).map((row) => mapLeadRow(row as Record<string, unknown>));
}

/**
 * Queue recipients and mark campaign sending. Actual Resend dispatch runs via cron.
 */
export async function launchCampaign(
  id: string
): Promise<{ success: boolean; queued?: number; dispatched?: number; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { success: false, error: "Unauthorized." };

  const db = await adminDb();
  const { data: campaignRow, error: fetchError } = await db
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) return { success: false, error: fetchError.message };
  if (!campaignRow) return { success: false, error: "Campaign not found." };

  const campaign = mapCampaignRow(campaignRow as Record<string, unknown>);
  if (campaign.status === "sending" || campaign.status === "sent") {
    return { success: false, error: "Campaign already launched." };
  }
  if (!campaign.subject.trim() || !campaign.htmlBody.trim()) {
    return { success: false, error: "Subject and HTML body are required." };
  }

  let audience;
  try {
    audience = await selectAudience(db, campaign.segmentTags);
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to load audience.",
    };
  }

  if (audience.length === 0) {
    return {
      success: false,
      error: "No subscribed leads match this segment. Import leads or broaden tags.",
    };
  }

  const now = new Date().toISOString();
  const sendRows = audience.map((lead) => ({
    campaign_id: id,
    lead_id: lead.id,
    email: lead.email,
    step_index: 0,
    send_after: now,
    status: "pending",
  }));

  // Insert in chunks to avoid payload limits.
  for (let i = 0; i < sendRows.length; i += 200) {
    const chunk = sendRows.slice(i, i + 200);
    const { error } = await db.from("campaign_sends").insert(chunk);
    if (error) return { success: false, error: error.message };
  }

  const { error: updateError } = await db
    .from("campaigns")
    .update({
      status: "sending",
      started_at: now,
      updated_at: now,
    })
    .eq("id", id);

  if (updateError) return { success: false, error: updateError.message };

  // Start dispatching immediately (don't wait for the daily cron / Flush button).
  let dispatched = 0;
  try {
    for (let i = 0; i < 4; i += 1) {
      const batch = await dispatchPendingCampaignSends({ limit: CAMPAIGN_BATCH_SIZE });
      dispatched += batch.sent;
      if (batch.processed === 0) break;
    }
  } catch (error) {
    console.error(
      "[campaigns] launch dispatch:",
      error instanceof Error ? error.message : error
    );
  }

  revalidatePath("/admin/tools/campaigns");
  revalidatePath(`/admin/tools/campaigns/${id}`);
  return { success: true, queued: audience.length, dispatched };
}

function parseEmailList(raw: string): string[] {
  return Array.from(
    new Set(
      String(raw || "")
        .split(/[\s,;]+/)
        .map((email) => email.trim().toLowerCase())
        .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    )
  );
}

/**
 * Queue extra recipients on an already-launched campaign (sending / sent / paused).
 * Creates missing leads, skips duplicates and unsubscribed addresses.
 */
export async function addRecipientsToCampaign(
  id: string,
  input: { emails?: string; leadIds?: string[]; includeSegment?: boolean }
): Promise<{
  success: boolean;
  queued?: number;
  skipped?: number;
  unsubscribed?: number;
  invalid?: number;
  dispatched?: number;
  error?: string;
}> {
  const admin = await requireAdmin();
  if (!admin) return { success: false, error: "Unauthorized." };

  const db = await adminDb();
  const { data: campaignRow, error: fetchError } = await db
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (fetchError) return { success: false, error: fetchError.message };
  if (!campaignRow) return { success: false, error: "Campaign not found." };

  const campaign = mapCampaignRow(campaignRow as Record<string, unknown>);
  if (campaign.status === "cancelled") {
    return { success: false, error: "Cancelled campaigns cannot accept recipients." };
  }
  if (!campaign.subject.trim() || !campaign.htmlBody.trim()) {
    return { success: false, error: "Subject and HTML body are required." };
  }

  const typedEmails = parseEmailList(input.emails || "");
  const rawTokens = String(input.emails || "")
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter(Boolean);
  const invalid = Math.max(0, rawTokens.length - typedEmails.length);
  const leadIds = Array.from(
    new Set((input.leadIds || []).map((value) => String(value || "").trim()).filter(Boolean))
  );

  const byEmail = new Map<string, { id: string; email: string; subscribed: boolean }>();

  if (leadIds.length > 0) {
    const { data: leadRows, error: leadError } = await db
      .from("leads")
      .select("id, email, subscribed")
      .in("id", leadIds);
    if (leadError) return { success: false, error: leadError.message };
    for (const row of leadRows || []) {
      const email = String(row.email || "").toLowerCase();
      if (!email) continue;
      byEmail.set(email, {
        id: String(row.id),
        email: String(row.email),
        subscribed: row.subscribed !== false,
      });
    }
  }

  for (const email of typedEmails) {
    const result = await upsertLead({
      email,
      source: "manual",
      tags: campaign.segmentTags,
      subscribed: true,
    });
    if (result.success && result.lead) {
      byEmail.set(result.lead.email.toLowerCase(), {
        id: result.lead.id,
        email: result.lead.email,
        subscribed: result.lead.subscribed,
      });
    }
  }

  if (input.includeSegment) {
    try {
      const audience = await selectAudience(db, campaign.segmentTags);
      for (const lead of audience) {
        byEmail.set(lead.email.toLowerCase(), {
          id: lead.id,
          email: lead.email,
          subscribed: lead.subscribed,
        });
      }
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : "Failed to load segment.",
      };
    }
  }

  if (byEmail.size === 0) {
    return {
      success: false,
      error:
        invalid > 0
          ? `No valid emails found (${invalid} invalid).`
          : "Select leads from the list to add recipients.",
    };
  }

  const { data: existingSends, error: existingError } = await db
    .from("campaign_sends")
    .select("lead_id, email")
    .eq("campaign_id", id)
    .eq("step_index", 0);
  if (existingError) return { success: false, error: existingError.message };

  const alreadyLeadIds = new Set(
    (existingSends || [])
      .map((row) => (row.lead_id ? String(row.lead_id) : ""))
      .filter(Boolean)
  );
  const alreadyEmails = new Set(
    (existingSends || []).map((row) => String(row.email || "").toLowerCase()).filter(Boolean)
  );

  let skipped = 0;
  let unsubscribed = 0;
  const sendRows: Array<{
    campaign_id: string;
    lead_id: string;
    email: string;
    step_index: number;
    send_after: string;
    status: string;
  }> = [];

  const now = new Date().toISOString();
  for (const lead of byEmail.values()) {
    const emailKey = lead.email.toLowerCase();
    if (alreadyLeadIds.has(lead.id) || alreadyEmails.has(emailKey)) {
      skipped += 1;
      continue;
    }
    if (!lead.subscribed) {
      unsubscribed += 1;
      continue;
    }
    sendRows.push({
      campaign_id: id,
      lead_id: lead.id,
      email: lead.email,
      step_index: 0,
      send_after: now,
      status: "pending",
    });
  }

  if (sendRows.length === 0) {
    return {
      success: true,
      queued: 0,
      skipped,
      unsubscribed,
      invalid,
      dispatched: 0,
      error:
        skipped || unsubscribed
          ? undefined
          : "No new recipients to queue.",
    };
  }

  for (let i = 0; i < sendRows.length; i += 200) {
    const chunk = sendRows.slice(i, i + 200);
    const { error } = await db.from("campaign_sends").insert(chunk);
    if (error) {
      // Race / unique constraint — count as skipped instead of failing the whole batch.
      if (/duplicate|unique/i.test(error.message)) {
        skipped += chunk.length;
        continue;
      }
      return { success: false, error: error.message };
    }
  }

  // Ensure the campaign is in a dispatchable state (draft / sent → sending).
  if (campaign.status !== "paused") {
    await db
      .from("campaigns")
      .update({
        status: "sending",
        completed_at: null,
        updated_at: now,
        started_at: campaign.startedAt || now,
      })
      .eq("id", id);
  } else {
    await db.from("campaigns").update({ updated_at: now }).eq("id", id);
  }

  let dispatched = 0;
  if (campaign.status !== "paused") {
    try {
      for (let i = 0; i < 4; i += 1) {
        const batch = await dispatchPendingCampaignSends({ limit: CAMPAIGN_BATCH_SIZE });
        dispatched += batch.sent;
        if (batch.processed === 0) break;
      }
    } catch (error) {
      console.error(
        "[campaigns] add recipients dispatch:",
        error instanceof Error ? error.message : error
      );
    }
  }

  revalidatePath("/admin/tools/campaigns");
  revalidatePath(`/admin/tools/campaigns/${id}`);
  return {
    success: true,
    queued: sendRows.length,
    skipped,
    unsubscribed,
    invalid,
    dispatched,
  };
}

/**
 * Remove recipients from a campaign so they can be re-added and flushed again.
 * Deletes campaign_sends rows (by id and/or email). Does not delete leads.
 */
export async function removeCampaignRecipients(
  campaignId: string,
  input: {
    sendIds?: string[];
    emails?: string;
    pendingOnly?: boolean;
  }
): Promise<{ success: boolean; removed?: number; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { success: false, error: "Unauthorized." };

  const sendIds = Array.from(
    new Set((input.sendIds || []).map((id) => String(id || "").trim()).filter(Boolean))
  );
  const emails = parseEmailList(input.emails || "");

  if (sendIds.length === 0 && emails.length === 0 && !input.pendingOnly) {
    return { success: false, error: "Select sends or paste emails to remove." };
  }

  const db = await adminDb();
  const { data: campaignRow } = await db
    .from("campaigns")
    .select("id, status")
    .eq("id", campaignId)
    .maybeSingle();
  if (!campaignRow) return { success: false, error: "Campaign not found." };

  const status = String(campaignRow.status || "");
  if (
    status !== "sending" &&
    status !== "sent" &&
    status !== "paused" &&
    status !== "draft" &&
    status !== "scheduled"
  ) {
    return { success: false, error: "Cannot edit recipients for this campaign." };
  }

  let removed = 0;

  if (sendIds.length > 0) {
    let query = db
      .from("campaign_sends")
      .delete({ count: "exact" })
      .eq("campaign_id", campaignId)
      .in("id", sendIds);
    if (input.pendingOnly) query = query.eq("status", "pending");
    const { error, count } = await query;
    if (error) return { success: false, error: error.message };
    removed += count || 0;
  }

  if (emails.length > 0) {
    // Match case-insensitively by fetching then deleting ids (PostgREST has no lower() filter helper).
    const { data: rows, error: fetchError } = await db
      .from("campaign_sends")
      .select("id, email, status")
      .eq("campaign_id", campaignId);
    if (fetchError) return { success: false, error: fetchError.message };

    const emailSet = new Set(emails);
    const ids = (rows || [])
      .filter((row) => {
        const email = String(row.email || "").toLowerCase();
        if (!emailSet.has(email)) return false;
        if (input.pendingOnly && row.status !== "pending") return false;
        return true;
      })
      .map((row) => String(row.id));

    if (ids.length > 0) {
      for (let i = 0; i < ids.length; i += 200) {
        const chunk = ids.slice(i, i + 200);
        const { error, count } = await db
          .from("campaign_sends")
          .delete({ count: "exact" })
          .eq("campaign_id", campaignId)
          .in("id", chunk);
        if (error) return { success: false, error: error.message };
        removed += count || 0;
      }
    }
  }

  if (input.pendingOnly && sendIds.length === 0 && emails.length === 0) {
    const { error, count } = await db
      .from("campaign_sends")
      .delete({ count: "exact" })
      .eq("campaign_id", campaignId)
      .eq("status", "pending");
    if (error) return { success: false, error: error.message };
    removed += count || 0;
  }

  // If anything is still pending, keep/reopen as sending so Flush works.
  const { count: pendingLeft } = await db
    .from("campaign_sends")
    .select("id", { count: "exact", head: true })
    .eq("campaign_id", campaignId)
    .eq("status", "pending");

  const now = new Date().toISOString();
  if ((pendingLeft || 0) > 0 && (status === "sent" || status === "sending")) {
    await db
      .from("campaigns")
      .update({
        status: "sending",
        completed_at: null,
        updated_at: now,
      })
      .eq("id", campaignId);
  } else if ((pendingLeft || 0) === 0 && status === "sending") {
    await db
      .from("campaigns")
      .update({
        status: "sent",
        completed_at: now,
        updated_at: now,
      })
      .eq("id", campaignId);
  } else {
    await db.from("campaigns").update({ updated_at: now }).eq("id", campaignId);
  }

  revalidatePath("/admin/tools/campaigns");
  revalidatePath(`/admin/tools/campaigns/${campaignId}`);
  return { success: true, removed };
}

async function queueNextSequenceStep(input: {
  db: Awaited<ReturnType<typeof adminDb>>;
  campaignId: string;
  leadId: string | null;
  email: string;
  completedStepIndex: number;
  steps: SequenceStep[];
}) {
  const nextIndex = input.completedStepIndex + 1;
  const next = input.steps[nextIndex - 1];
  if (!next || !input.leadId) return;

  const sendAfter = new Date(
    Date.now() + Math.max(0, next.delayHours || 0) * 60 * 60 * 1000
  ).toISOString();

  const { error } = await input.db.from("campaign_sends").insert({
    campaign_id: input.campaignId,
    lead_id: input.leadId,
    email: input.email,
    step_index: nextIndex,
    send_after: sendAfter,
    status: "pending",
  });
  // Unique (campaign, lead, step) — ignore if already queued.
  if (error && !/duplicate|unique/i.test(error.message)) {
    console.error("[campaigns] queue next step:", error.message);
  }
}

/**
 * Process pending campaign_sends with rate limiting. Called by cron (or admin trigger).
 */
export async function dispatchPendingCampaignSends(options?: {
  limit?: number;
}): Promise<{ processed: number; sent: number; failed: number }> {
  if (!isServiceRoleConfigured()) {
    return { processed: 0, sent: 0, failed: 0 };
  }

  const db = createServiceRoleClient();
  const limit = Math.min(Math.max(options?.limit || CAMPAIGN_BATCH_SIZE, 1), 100);
  const now = new Date().toISOString();

  const { data: pending, error } = await db
    .from("campaign_sends")
    .select("*")
    .eq("status", "pending")
    .lte("send_after", now)
    .order("send_after", { ascending: true })
    .limit(limit);

  if (error || !pending?.length) {
    if (error) console.error("[campaigns] dispatch fetch:", error.message);
    return { processed: 0, sent: 0, failed: 0 };
  }

  let sent = 0;
  let failed = 0;

  for (const raw of pending) {
    const send = mapCampaignSendRow(raw as Record<string, unknown>);
    const { data: campaignRow } = await db
      .from("campaigns")
      .select("*")
      .eq("id", send.campaignId)
      .maybeSingle();

    if (!campaignRow) {
      await db
        .from("campaign_sends")
        .update({ status: "skipped", error: "Campaign missing", updated_at: now })
        .eq("id", send.id);
      failed += 1;
      continue;
    }

    const campaign = mapCampaignRow(campaignRow as Record<string, unknown>);
    if (campaign.status === "paused" || campaign.status === "cancelled") {
      await db
        .from("campaign_sends")
        .update({ status: "skipped", error: `Campaign ${campaign.status}`, updated_at: now })
        .eq("id", send.id);
      continue;
    }

    let leadName = "";
    let companyName = "";
    let leadUnsubToken = send.unsubscribeToken;
    let stillSubscribed = true;

    if (send.leadId) {
      const { data: leadRow } = await db
        .from("leads")
        .select("*")
        .eq("id", send.leadId)
        .maybeSingle();
      if (leadRow) {
        const lead = mapLeadRow(leadRow as Record<string, unknown>);
        stillSubscribed = lead.subscribed;
        leadName = lead.contactName;
        companyName = lead.companyName;
        leadUnsubToken = lead.unsubscribeToken || send.unsubscribeToken;
      }
    }

    if (!stillSubscribed) {
      await db
        .from("campaign_sends")
        .update({ status: "skipped", error: "Unsubscribed", updated_at: now })
        .eq("id", send.id);
      continue;
    }

    // step_index 0 = campaign primary body; follow-ups are sequenceSteps[n-1].
    const step =
      campaign.type === "sequence" && send.stepIndex > 0
        ? campaign.sequenceSteps[send.stepIndex - 1]
        : null;

    const subject = (step?.subject || campaign.subject)
      .replaceAll("{{contact_name}}", leadName || "there")
      .replaceAll("{{company_name}}", companyName);
    const bodyHtml = step?.htmlBody || campaign.htmlBody;
    const html = wrapCampaignHtml({
      bodyHtml,
      previewText: campaign.previewText,
      unsubscribeToken: leadUnsubToken,
      contactName: leadName,
      companyName,
    });
    const text =
      (step?.textBody || campaign.textBody || htmlToPlainText(bodyHtml)) +
      `\n\nUnsubscribe: ${unsubscribeUrl(leadUnsubToken)}`;

    const result = await sendEmail({
      to: send.email,
      subject,
      text,
      html,
      from: campaign.fromAddress || CONTACT_FROM,
    });

    const stamp = new Date().toISOString();
    if (result.success || result.skipped) {
      // skipped (no API key in dev) still advances so local queues drain.
      await db
        .from("campaign_sends")
        .update({
          status: "sent",
          resend_id: result.id || null,
          sent_at: stamp,
          delivered_at: stamp,
          error: result.skipped ? "Logged only (Resend not configured)" : null,
          updated_at: stamp,
        })
        .eq("id", send.id);

      await db
        .from("campaigns")
        .update({
          sent_count: campaign.sentCount + 1,
          delivered_count: campaign.deliveredCount + 1,
          updated_at: stamp,
        })
        .eq("id", campaign.id);

      if (campaign.type === "sequence") {
        await queueNextSequenceStep({
          db,
          campaignId: campaign.id,
          leadId: send.leadId,
          email: send.email,
          completedStepIndex: send.stepIndex,
          steps: campaign.sequenceSteps,
        });
      }

      sent += 1;
    } else {
      await db
        .from("campaign_sends")
        .update({
          status: "failed",
          error: result.error || "Send failed",
          updated_at: stamp,
        })
        .eq("id", send.id);

      await db
        .from("campaigns")
        .update({
          failed_count: campaign.failedCount + 1,
          updated_at: stamp,
        })
        .eq("id", campaign.id);

      failed += 1;
    }

    await sleep(CAMPAIGN_SEND_GAP_MS);
  }

  // Mark campaigns complete when no pending sends remain.
  const campaignIds = Array.from(new Set(pending.map((row) => String(row.campaign_id))));
  for (const campaignId of campaignIds) {
    const { count } = await db
      .from("campaign_sends")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId)
      .eq("status", "pending");

    if ((count || 0) === 0) {
      await db
        .from("campaigns")
        .update({
          status: "sent",
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", campaignId)
        .eq("status", "sending");
    }
  }

  return { processed: pending.length, sent, failed };
}

export async function pauseCampaign(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { success: false, error: "Unauthorized." };
  const db = await adminDb();
  const { error } = await db
    .from("campaigns")
    .update({ status: "paused", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "sending");
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/tools/campaigns");
  revalidatePath(`/admin/tools/campaigns/${id}`);
  return { success: true };
}

export async function resumeCampaign(
  id: string
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { success: false, error: "Unauthorized." };
  const db = await adminDb();
  const { error } = await db
    .from("campaigns")
    .update({ status: "sending", updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "paused");
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/tools/campaigns");
  revalidatePath(`/admin/tools/campaigns/${id}`);
  return { success: true };
}

/** Count pending campaign_sends waiting for dispatch. */
export async function getCampaignQueueStats(): Promise<{
  pending: number;
  sendingCampaigns: number;
}> {
  const admin = await requireAdmin();
  if (!admin) return { pending: 0, sendingCampaigns: 0 };

  const db = await adminDb();
  const [{ count: pendingCount }, { count: sendingCount }] = await Promise.all([
    db
      .from("campaign_sends")
      .select("id", { count: "exact", head: true })
      .eq("status", "pending"),
    db
      .from("campaigns")
      .select("id", { count: "exact", head: true })
      .eq("status", "sending"),
  ]);

  return {
    pending: pendingCount || 0,
    sendingCampaigns: sendingCount || 0,
  };
}

/** Admin-triggered flush of the send queue (rate-limited, multi-batch). */
export async function flushCampaignQueue(): Promise<{
  success: boolean;
  processed: number;
  sent: number;
  failed: number;
  remaining?: number;
  error?: string;
}> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, processed: 0, sent: 0, failed: 0, error: "Unauthorized." };
  }

  let processed = 0;
  let sent = 0;
  let failed = 0;

  // Up to ~250 emails per click (25 × 10), with gaps inside each batch.
  for (let i = 0; i < 10; i += 1) {
    const batch = await dispatchPendingCampaignSends({ limit: CAMPAIGN_BATCH_SIZE });
    processed += batch.processed;
    sent += batch.sent;
    failed += batch.failed;
    if (batch.processed === 0) break;
  }

  const remaining = (await getCampaignQueueStats()).pending;
  revalidatePath("/admin/tools/campaigns");
  return { success: true, processed, sent, failed, remaining };
}

export async function recordCampaignOpenByResendId(resendId: string) {
  if (!isServiceRoleConfigured() || !resendId) return;
  const db = createServiceRoleClient();
  const { data: send } = await db
    .from("campaign_sends")
    .select("id, campaign_id, open_count, opened_at")
    .eq("resend_id", resendId)
    .maybeSingle();
  if (!send?.id) return;

  const stamp = new Date().toISOString();
  await db
    .from("campaign_sends")
    .update({
      open_count: Number(send.open_count || 0) + 1,
      opened_at: send.opened_at || stamp,
      status: "delivered",
      delivered_at: stamp,
      updated_at: stamp,
    })
    .eq("id", send.id);

  const { data: campaign } = await db
    .from("campaigns")
    .select("open_count")
    .eq("id", send.campaign_id)
    .maybeSingle();
  await db
    .from("campaigns")
    .update({
      open_count: Number(campaign?.open_count || 0) + 1,
      updated_at: stamp,
    })
    .eq("id", send.campaign_id);
}

export async function recordCampaignClickByResendId(resendId: string) {
  if (!isServiceRoleConfigured() || !resendId) return;
  const db = createServiceRoleClient();
  const { data: send } = await db
    .from("campaign_sends")
    .select("id, campaign_id, click_count, clicked_at")
    .eq("resend_id", resendId)
    .maybeSingle();
  if (!send?.id) return;

  const stamp = new Date().toISOString();
  await db
    .from("campaign_sends")
    .update({
      click_count: Number(send.click_count || 0) + 1,
      clicked_at: send.clicked_at || stamp,
      updated_at: stamp,
    })
    .eq("id", send.id);

  const { data: campaign } = await db
    .from("campaigns")
    .select("click_count")
    .eq("id", send.campaign_id)
    .maybeSingle();
  await db
    .from("campaigns")
    .update({
      click_count: Number(campaign?.click_count || 0) + 1,
      updated_at: stamp,
    })
    .eq("id", send.campaign_id);
}

export async function recordCampaignBounceByResendId(resendId: string) {
  if (!isServiceRoleConfigured() || !resendId) return;
  const db = createServiceRoleClient();
  const { data: send } = await db
    .from("campaign_sends")
    .select("id, campaign_id")
    .eq("resend_id", resendId)
    .maybeSingle();
  if (!send?.id) return;

  const stamp = new Date().toISOString();
  await db
    .from("campaign_sends")
    .update({ status: "bounced", updated_at: stamp })
    .eq("id", send.id);

  const { data: campaign } = await db
    .from("campaigns")
    .select("bounce_count")
    .eq("id", send.campaign_id)
    .maybeSingle();
  await db
    .from("campaigns")
    .update({
      bounce_count: Number(campaign?.bounce_count || 0) + 1,
      updated_at: stamp,
    })
    .eq("id", send.campaign_id);
}
