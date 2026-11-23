export type LeadSource = "manual" | "csv" | "facebook" | "inquiry" | "import";
export type LeadStatus = "new" | "contacted" | "qualified" | "converted" | "archived";

export type CampaignType = "broadcast" | "sequence";
export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "sent"
  | "paused"
  | "cancelled";

export type CampaignSendStatus =
  | "pending"
  | "sent"
  | "delivered"
  | "failed"
  | "skipped"
  | "bounced";

export interface LeadRecord {
  id: string;
  email: string;
  companyName: string;
  contactName: string;
  phone: string;
  zipCode: string;
  source: LeadSource;
  tags: string[];
  status: LeadStatus;
  subscribed: boolean;
  unsubscribeToken: string;
  externalId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface SequenceStep {
  delayHours: number;
  subject: string;
  htmlBody: string;
  textBody?: string;
}

export interface CampaignRecord {
  id: string;
  name: string;
  type: CampaignType;
  status: CampaignStatus;
  subject: string;
  previewText: string;
  htmlBody: string;
  textBody: string;
  segmentTags: string[];
  fromAddress: string;
  scheduledAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  sequenceSteps: SequenceStep[];
  sentCount: number;
  deliveredCount: number;
  openCount: number;
  clickCount: number;
  unsubscribeCount: number;
  bounceCount: number;
  failedCount: number;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignSendRecord {
  id: string;
  campaignId: string;
  leadId: string | null;
  email: string;
  stepIndex: number;
  sendAfter: string;
  status: CampaignSendStatus;
  resendId: string | null;
  unsubscribeToken: string;
  error: string | null;
  openCount: number;
  clickCount: number;
  sentAt: string | null;
  deliveredAt: string | null;
  openedAt: string | null;
  clickedAt: string | null;
  unsubscribedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignDraftInput {
  name: string;
  type: CampaignType;
  subject: string;
  previewText?: string;
  htmlBody: string;
  textBody?: string;
  segmentTags?: string[];
  fromAddress?: string;
  scheduledAt?: string | null;
  sequenceSteps?: SequenceStep[];
}

export interface LeadImportRow {
  email: string;
  companyName?: string;
  contactName?: string;
  phone?: string;
  zipCode?: string;
  tags?: string[];
  source?: LeadSource;
}
