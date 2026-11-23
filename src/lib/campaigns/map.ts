import type {
  CampaignRecord,
  CampaignSendRecord,
  CampaignSendStatus,
  CampaignStatus,
  CampaignType,
  LeadRecord,
  LeadSource,
  LeadStatus,
  SequenceStep,
} from "@/lib/campaigns/types";

function asString(value: unknown, fallback = ""): string {
  return value == null ? fallback : String(value);
}

function asTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((tag) => String(tag || "").trim().toLowerCase())
    .filter(Boolean);
}

function asSteps(value: unknown): SequenceStep[] {
  if (!Array.isArray(value)) return [];
  return value.map((step) => {
    const row = (step || {}) as Record<string, unknown>;
    return {
      delayHours: Math.max(0, Number(row.delayHours ?? row.delay_hours ?? 0) || 0),
      subject: asString(row.subject),
      htmlBody: asString(row.htmlBody ?? row.html_body),
      textBody: asString(row.textBody ?? row.text_body) || undefined,
    };
  });
}

export function mapLeadRow(row: Record<string, unknown>): LeadRecord {
  return {
    id: asString(row.id),
    email: asString(row.email).trim().toLowerCase(),
    companyName: asString(row.company_name),
    contactName: asString(row.contact_name),
    phone: asString(row.phone),
    zipCode: asString(row.zip_code),
    source: (asString(row.source, "manual") as LeadSource) || "manual",
    tags: asTags(row.tags),
    status: (asString(row.status, "new") as LeadStatus) || "new",
    subscribed: row.subscribed !== false,
    unsubscribeToken: asString(row.unsubscribe_token),
    externalId: row.external_id ? asString(row.external_id) : null,
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
}

export function mapCampaignRow(row: Record<string, unknown>): CampaignRecord {
  return {
    id: asString(row.id),
    name: asString(row.name),
    type: (asString(row.type, "broadcast") as CampaignType) || "broadcast",
    status: (asString(row.status, "draft") as CampaignStatus) || "draft",
    subject: asString(row.subject),
    previewText: asString(row.preview_text),
    htmlBody: asString(row.html_body),
    textBody: asString(row.text_body),
    segmentTags: asTags(row.segment_tags),
    fromAddress: asString(row.from_address, "Plastipac USA <contact@plastipacusa.com>"),
    scheduledAt: row.scheduled_at ? asString(row.scheduled_at) : null,
    startedAt: row.started_at ? asString(row.started_at) : null,
    completedAt: row.completed_at ? asString(row.completed_at) : null,
    sequenceSteps: asSteps(row.sequence_steps),
    sentCount: Number(row.sent_count || 0) || 0,
    deliveredCount: Number(row.delivered_count || 0) || 0,
    openCount: Number(row.open_count || 0) || 0,
    clickCount: Number(row.click_count || 0) || 0,
    unsubscribeCount: Number(row.unsubscribe_count || 0) || 0,
    bounceCount: Number(row.bounce_count || 0) || 0,
    failedCount: Number(row.failed_count || 0) || 0,
    createdBy: row.created_by ? asString(row.created_by) : null,
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
}

export function mapCampaignSendRow(row: Record<string, unknown>): CampaignSendRecord {
  return {
    id: asString(row.id),
    campaignId: asString(row.campaign_id),
    leadId: row.lead_id ? asString(row.lead_id) : null,
    email: asString(row.email).trim().toLowerCase(),
    stepIndex: Number(row.step_index || 0) || 0,
    sendAfter: asString(row.send_after),
    status: (asString(row.status, "pending") as CampaignSendStatus) || "pending",
    resendId: row.resend_id ? asString(row.resend_id) : null,
    unsubscribeToken: asString(row.unsubscribe_token),
    error: row.error ? asString(row.error) : null,
    openCount: Number(row.open_count || 0) || 0,
    clickCount: Number(row.click_count || 0) || 0,
    sentAt: row.sent_at ? asString(row.sent_at) : null,
    deliveredAt: row.delivered_at ? asString(row.delivered_at) : null,
    openedAt: row.opened_at ? asString(row.opened_at) : null,
    clickedAt: row.clicked_at ? asString(row.clicked_at) : null,
    unsubscribedAt: row.unsubscribed_at ? asString(row.unsubscribed_at) : null,
    createdAt: asString(row.created_at),
    updatedAt: asString(row.updated_at),
  };
}
