import { Resend } from "resend";
import React from "react";
import {
  CONTACT_EMAIL,
  CONTACT_FROM,
  mailboxRecipients,
  ORDERS_EMAIL,
  ORDERS_FROM,
  PAYABLES_EMAIL,
  SUPPORT_EMAIL,
  SUPPORT_FROM,
} from "@/lib/company-email";
import { logEmailDispatch } from "@/lib/resend-usage";

/** Prefer ADMIN_NOTIFICATION_EMAIL for all admin alerts. */
export function getAdminNotificationEmail(): string {
  return (
    process.env.ADMIN_NOTIFICATION_EMAIL ||
    process.env.ADMIN_EMAIL ||
    ""
  ).trim();
}

export function getAppBaseUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, "");
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "https://plastipacusa.com";
}

export function getSenderEmail(fallback = CONTACT_EMAIL): string {
  return (
    process.env.SENDER_EMAIL ||
    process.env.RESEND_FROM_EMAIL ||
    fallback
  ).trim();
}

function isResendConfigured(): boolean {
  const key = process.env.RESEND_API_KEY?.trim() || "";
  return Boolean(key) && !key.includes("placeholder") && key !== "re_123456789";
}

export interface EmailAttachmentInput {
  filename: string;
  content: Buffer | Uint8Array;
}

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  react?: React.ReactElement;
  replyTo?: string;
  from?: string;
  attachments?: EmailAttachmentInput[];
}

export interface SendEmailResult {
  success: boolean;
  skipped?: boolean;
  error?: string;
  id?: string;
}

/**
 * Low-level send via Resend. Logs to console in local/dev when API key is missing.
 */
export async function sendEmail(
  input: SendEmailInput
): Promise<SendEmailResult> {
  const recipients = (Array.isArray(input.to) ? input.to : [input.to])
    .map((e) => e.trim())
    .filter(Boolean);

  if (recipients.length === 0) {
    console.warn("[email] No recipients — skipping send:", input.subject);
    return { success: false, skipped: true, error: "No recipients." };
  }

  if (!isResendConfigured()) {
    console.log("[email] RESEND_API_KEY missing — logging notification only");
    console.log("[email] to:", recipients.join(", "));
    console.log("[email] subject:", input.subject);
    console.log("[email] body:\n" + input.text);
    return { success: false, skipped: true };
  }

  try {
    const resend = new Resend(process.env.RESEND_API_KEY!);
    const from =
      input.from ||
      CONTACT_FROM;

    const attachments = input.attachments?.map((file) => ({
      filename: file.filename,
      content: Buffer.from(file.content),
    }));

    const { data, error } = await resend.emails.send({
      from,
      to: recipients,
      subject: input.subject,
      text: input.text,
      ...(input.html ? { html: input.html } : {}),
      ...(input.react ? { react: input.react } : {}),
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
      ...(attachments?.length ? { attachments } : {}),
    });

    if (error) {
      console.error("[email] Resend error:", error);
      void logEmailDispatch({
        subject: input.subject,
        recipientCount: recipients.length,
        status: "failed",
      });
      return { success: false, error: error.message || "Send failed." };
    }

    void logEmailDispatch({
      resendId: data?.id,
      subject: input.subject,
      recipientCount: recipients.length,
      status: "sent",
    });
    return { success: true, id: data?.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email] send exception:", message);
    void logEmailDispatch({
      subject: input.subject,
      recipientCount: recipients.length,
      status: "failed",
    });
    return { success: false, error: message };
  }
}

export interface CreditTradeReferenceEmail {
  companyName?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  creditTerms?: string;
}

export interface CreditApplicationNotifyInput {
  applicationId?: string | null;
  customerName: string;
  companyName: string;
  legalBusinessName?: string;
  dbaName?: string;
  taxIdEin: string;
  yearsInBusiness?: string | number | null;
  businessType?: string;
  businessAddress?: string;
  billingAddress?: string;
  website?: string;
  requestedCreditLimit?: string | number;
  paymentTermsRequested?: string;
  workEmail?: string;
  phone?: string;
  apContactName?: string;
  apPhone?: string;
  apEmail?: string;
  purchasingContactName?: string;
  purchasingPhone?: string;
  purchasingEmail?: string;
  references?: CreditTradeReferenceEmail[];
  bankName?: string;
  bankContactPerson?: string;
  bankPhone?: string;
  authorizedRepresentativeName?: string;
  authorizedTitle?: string;
  eSignature?: string;
  signatureDate?: string;
  /** auth.users / profiles id for dossier deep-link */
  userId?: string | null;
  notes?: string;
}

function formatCreditLimitDisplay(value: string | number | undefined): string {
  if (value == null || value === "") return "Not specified";
  const raw = String(value).replace(/[$,\s]/g, "");
  const n = Number(raw);
  if (!Number.isFinite(n)) return `$${String(value).replace(/^\$/, "")}`;
  return `$${n.toLocaleString("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}

function emailSection(title: string, rows: Array<[string, string | undefined | null]>): string {
  const body = rows
    .map(([label, value]) => {
      const display = String(value ?? "").trim() || "—";
      return `<tr>
        <td style="padding:6px 0;color:#64748b;font-size:13px;width:42%;vertical-align:top">${escapeEmailHtml(label)}</td>
        <td style="padding:6px 0;color:#0f172a;font-size:13px;font-weight:600;vertical-align:top">${escapeEmailHtml(display)}</td>
      </tr>`;
    })
    .join("");
  return `
    <div style="margin:0 0 18px">
      <h3 style="margin:0 0 8px;font-size:13px;letter-spacing:0.06em;text-transform:uppercase;color:#0369a1">${escapeEmailHtml(title)}</h3>
      <table style="width:100%;border-collapse:collapse">${body}</table>
    </div>`;
}

/**
 * Simultaneous Resend dispatch to payables@ + contact@ after a successful
 * credit_applications insert. Email failures are logged; callers should still
 * treat DB persistence as success.
 */
export async function notifyAdminCreditApplication(
  payload: CreditApplicationNotifyInput
): Promise<SendEmailResult> {
  const recipients = mailboxRecipients(PAYABLES_EMAIL, CONTACT_EMAIL);
  if (recipients.length === 0) {
    console.warn("[email] No credit-application recipient — alert skipped.");
    return { success: false, skipped: true, error: "No credit-application recipient." };
  }

  const base = getAppBaseUrl();
  const legalName =
    String(payload.legalBusinessName || payload.companyName || "Applicant").trim();
  const limitDisplay = formatCreditLimitDisplay(payload.requestedCreditLimit);
  const reviewUrl = payload.applicationId
    ? `${base}/admin/credit-applications/${payload.applicationId}`
    : `${base}/admin/credit-applications`;

  const refs = (payload.references || []).slice(0, 3);
  while (refs.length < 3) refs.push({});

  const subject = `[Credit Application] New Submission - ${legalName} (Requested: ${limitDisplay})`;

  const textLines = [
    "New B2B Commercial Credit Application",
    "",
    `Legal business name: ${legalName}`,
    payload.dbaName ? `DBA: ${payload.dbaName}` : null,
    `Tax ID / EIN: ${payload.taxIdEin || "—"}`,
    `Business address: ${payload.businessAddress || "—"}`,
    `Years in business: ${payload.yearsInBusiness ?? "—"}`,
    `Business type: ${payload.businessType || "—"}`,
    "",
    `Payment terms requested: ${payload.paymentTermsRequested || "—"}`,
    `Credit limit requested: ${limitDisplay}`,
    "",
    `AP contact: ${payload.apContactName || "—"} · ${payload.apEmail || "—"} · ${payload.apPhone || "—"}`,
    `Purchasing contact: ${payload.purchasingContactName || "—"} · ${payload.purchasingEmail || "—"} · ${payload.purchasingPhone || "—"}`,
    `Business phone: ${payload.phone || "—"}`,
    `Business email: ${payload.workEmail || "—"}`,
    "",
    ...refs.flatMap((ref, i) => [
      `Trade reference #${i + 1}: ${ref.companyName || "—"} · ${ref.contactPerson || "—"} · ${ref.phone || "—"} · ${ref.email || "—"} · ${ref.creditTerms || "—"}`,
    ]),
    "",
    `Bank: ${payload.bankName || "—"} · ${payload.bankContactPerson || "—"} · ${payload.bankPhone || "—"}`,
    `Authorized representative: ${payload.authorizedRepresentativeName || payload.customerName || "—"}`,
    `Title: ${payload.authorizedTitle || "—"}`,
    `E-signature: ${payload.eSignature || "—"}`,
    `Signature date: ${payload.signatureDate || "—"}`,
    "",
    `Review in admin: ${reviewUrl}`,
  ].filter((line) => line !== null) as string[];

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:24px">
      <div style="max-width:680px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden">
        <div style="background:#0f172a;color:#ffffff;padding:20px 24px">
          <p style="margin:0 0 4px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.75">Plastipac USA · Credit Desk</p>
          <h1 style="margin:0;font-size:20px;line-height:1.3">New Credit Application Submission</h1>
          <p style="margin:8px 0 0;font-size:14px;opacity:0.9">${escapeEmailHtml(legalName)} · ${escapeEmailHtml(limitDisplay)}</p>
        </div>
        <div style="padding:24px">
          ${emailSection("Business Details", [
            ["Legal business name", legalName],
            ["DBA", payload.dbaName],
            ["Tax ID / EIN", payload.taxIdEin],
            ["Business address", payload.businessAddress],
            ["Billing address", payload.billingAddress],
            ["Years in business", payload.yearsInBusiness != null ? String(payload.yearsInBusiness) : null],
            ["Business type", payload.businessType],
            ["Website", payload.website],
            ["Phone", payload.phone],
            ["Email", payload.workEmail],
          ])}
          ${emailSection("Requested Terms", [
            ["Payment terms", payload.paymentTermsRequested],
            ["Requested credit limit", limitDisplay],
          ])}
          ${emailSection("Contact Information", [
            ["AP contact name", payload.apContactName],
            ["AP email", payload.apEmail],
            ["AP phone", payload.apPhone],
            ["Purchasing contact name", payload.purchasingContactName],
            ["Purchasing email", payload.purchasingEmail],
            ["Purchasing phone", payload.purchasingPhone],
          ])}
          ${refs
            .map((ref, i) =>
              emailSection(`Commercial / Trade Reference #${i + 1}`, [
                ["Company", ref.companyName],
                ["Contact person", ref.contactPerson],
                ["Phone", ref.phone],
                ["Email", ref.email],
                ["Credit terms", ref.creditTerms],
              ])
            )
            .join("")}
          ${emailSection("Bank Details", [
            ["Bank name", payload.bankName],
            ["Bank contact", payload.bankContactPerson],
            ["Bank phone", payload.bankPhone],
          ])}
          ${emailSection("Authorized Representative & E-Signature", [
            ["Representative", payload.authorizedRepresentativeName || payload.customerName],
            ["Title", payload.authorizedTitle],
            ["E-signature", payload.eSignature],
            ["Signature date", payload.signatureDate],
          ])}
          <div style="margin:24px 0 0;text-align:center">
            <a href="${reviewUrl}"
               style="display:inline-block;background:#0369a1;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:10px">
              Open in Admin Dashboard
            </a>
            <p style="margin:10px 0 0;font-size:12px;color:#64748b">${escapeEmailHtml(reviewUrl)}</p>
          </div>
        </div>
      </div>
    </div>
  `;

  const result = await sendEmail({
    to: recipients,
    subject,
    text: textLines.join("\n"),
    html,
    replyTo: payload.workEmail || payload.apEmail,
    from: CONTACT_FROM,
  });

  if (!result.success) {
    console.error(
      "[email] credit application notify failed:",
      result.error || (result.skipped ? "skipped" : "unknown"),
      "recipients:",
      recipients.join(", "),
      "applicationId:",
      payload.applicationId || "n/a"
    );
  }

  return result;
}

function escapeEmailHtml(value: string): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface CreditStatusChangeNotifyInput {
  companyName: string;
  workEmail?: string;
  contactName?: string;
  status: "approved" | "rejected";
  approvedCreditLimit?: number;
  approvedPaymentTerms?: string;
  adminComments?: string;
}

/** Applicant notice when finance begins validating trade/bank references. */
export async function notifyApplicantReferencesUnderReview(payload: {
  workEmail?: string;
  contactName?: string;
  companyName: string;
}): Promise<SendEmailResult> {
  const email = String(payload.workEmail || "").trim().toLowerCase();
  if (!email) {
    return { success: false, skipped: true, error: "No applicant email." };
  }

  const base = getAppBaseUrl();
  const dashboardUrl = `${base}/dashboard/credit`;
  const greeting = payload.contactName ? `Hello ${payload.contactName},` : "Hello,";

  const text = [
    greeting,
    "",
    `Our finance team is currently validating the trade and bank references on your Plastipac USA commercial credit application for ${payload.companyName}.`,
    "",
    "Status: Verifying references",
    "No action is required from you right now. We will email you if we need additional information.",
    "",
    `Track progress anytime: ${dashboardUrl}`,
    "",
    `Questions? Email ${SUPPORT_EMAIL}.`,
    "",
    "Plastipac USA Credit Desk",
  ].join("\n");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:24px">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden">
        <div style="background:#0f172a;color:#ffffff;padding:20px 24px">
          <p style="margin:0 0 4px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.75">Plastipac USA · Credit Desk</p>
          <h1 style="margin:0;font-size:20px;line-height:1.3">References Under Review</h1>
        </div>
        <div style="padding:24px;color:#0f172a;font-size:14px;line-height:1.6">
          <p style="margin:0 0 12px">${escapeEmailHtml(greeting)}</p>
          <p style="margin:0 0 12px">Our finance team is validating trade and bank references for <strong>${escapeEmailHtml(payload.companyName)}</strong>.</p>
          <p style="margin:0 0 16px">No action is required right now. We will contact you if we need additional information.</p>
          <p style="margin:0">
            <a href="${escapeEmailHtml(dashboardUrl)}" style="display:inline-block;background:#0284c7;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px">
              View credit status
            </a>
          </p>
        </div>
      </div>
    </div>`;

  return sendEmail({
    to: email,
    subject: `Your Plastipac USA credit references are being verified — ${payload.companyName}`,
    text,
    html,
    from: SUPPORT_FROM,
  });
}

/** Applicant notice when finance needs more information. */
export async function notifyApplicantActionRequired(payload: {
  workEmail?: string;
  contactName?: string;
  companyName: string;
  adminNotes?: string;
}): Promise<SendEmailResult> {
  const email = String(payload.workEmail || "").trim().toLowerCase();
  if (!email) {
    return { success: false, skipped: true, error: "No applicant email." };
  }

  const base = getAppBaseUrl();
  const dashboardUrl = `${base}/dashboard/credit`;
  const greeting = payload.contactName ? `Hello ${payload.contactName},` : "Hello,";
  const notes = String(payload.adminNotes || "").trim();

  const text = [
    greeting,
    "",
    `We need additional information to continue reviewing your Plastipac USA commercial credit application for ${payload.companyName}.`,
    notes ? `\nNotes from our credit desk:\n${notes}\n` : "",
    "",
    `Please reply to this email or contact ${SUPPORT_EMAIL}.`,
    `Track status: ${dashboardUrl}`,
    "",
    "Plastipac USA Credit Desk",
  ]
    .filter((line) => line !== "")
    .join("\n");

  return sendEmail({
    to: email,
    subject: `Action required — Plastipac USA credit application (${payload.companyName})`,
    text,
    from: SUPPORT_FROM,
  });
}

/**
 * Notify internal desks + applicant when credit application is approved/denied.
 */
/**
 * Confirmation receipt to the applicant after a successful credit_applications insert.
 */
export async function notifyApplicantCreditApplicationReceived(payload: {
  workEmail: string;
  contactName?: string;
  companyName: string;
  requestedCreditLimit?: string | number;
  paymentTermsRequested?: string;
  applicationId?: string | null;
}): Promise<SendEmailResult> {
  const email = String(payload.workEmail || "").trim().toLowerCase();
  if (!email) {
    return { success: false, skipped: true, error: "No applicant email." };
  }

  const base = getAppBaseUrl();
  const limitDisplay = formatCreditLimitDisplay(payload.requestedCreditLimit);
  const dashboardUrl = `${base}/dashboard/credit`;
  const greeting = payload.contactName ? `Hello ${payload.contactName},` : "Hello,";

  const text = [
    greeting,
    "",
    `We received your Plastipac USA commercial credit application for ${payload.companyName}.`,
    "",
    `Requested credit limit: ${limitDisplay}`,
    `Payment terms requested: ${payload.paymentTermsRequested || "Net 30"}`,
    payload.applicationId ? `Application reference: ${payload.applicationId}` : null,
    "",
    "Status: Pending review",
    "Our credit desk typically responds within 24–48 business hours.",
    "",
    `Track your application status here: ${dashboardUrl}`,
    "",
    `Questions? Email ${SUPPORT_EMAIL} or call our sales desk.`,
    "",
    "Plastipac USA Credit Desk",
  ]
    .filter(Boolean)
    .join("\n");

  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:24px">
      <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden">
        <div style="background:#0f172a;color:#ffffff;padding:20px 24px">
          <p style="margin:0 0 4px;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;opacity:0.75">Plastipac USA · Credit Desk</p>
          <h1 style="margin:0;font-size:20px;line-height:1.3">Credit Application Received</h1>
        </div>
        <div style="padding:24px;color:#0f172a;font-size:14px;line-height:1.6">
          <p style="margin:0 0 12px">${escapeEmailHtml(greeting)}</p>
          <p style="margin:0 0 12px">We received your commercial credit application for <strong>${escapeEmailHtml(payload.companyName)}</strong>.</p>
          ${emailSection("Application Summary", [
            ["Requested credit limit", limitDisplay],
            ["Payment terms requested", payload.paymentTermsRequested || "Net 30"],
            ["Status", "Pending review"],
            ["Application reference", payload.applicationId || null],
          ])}
          <p style="margin:0 0 16px">Our credit desk typically responds within 24–48 business hours. You can track status anytime in your dashboard.</p>
          <p style="margin:0">
            <a href="${escapeEmailHtml(dashboardUrl)}" style="display:inline-block;background:#0284c7;color:#ffffff;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:10px">
              View credit status
            </a>
          </p>
        </div>
      </div>
    </div>`;

  return sendEmail({
    to: email,
    subject: `We received your Plastipac USA credit application — ${payload.companyName}`,
    text,
    html,
    from: SUPPORT_FROM,
  });
}

export async function notifyCreditApplicationStatusChange(
  payload: CreditStatusChangeNotifyInput
): Promise<SendEmailResult> {
  const statusLabel = payload.status === "approved" ? "Approved" : "Denied";
  const limitDisplay =
    payload.approvedCreditLimit != null && Number.isFinite(payload.approvedCreditLimit)
      ? `$${Number(payload.approvedCreditLimit).toLocaleString("en-US", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}`
      : "—";

  const internalRecipients = mailboxRecipients(
    ORDERS_EMAIL,
    SUPPORT_EMAIL,
    CONTACT_EMAIL,
    PAYABLES_EMAIL,
    getAdminNotificationEmail()
  );

  const lines = [
    `B2B Credit Application ${statusLabel}`,
    "",
    `Company: ${payload.companyName}`,
    payload.contactName ? `Contact: ${payload.contactName}` : null,
    payload.workEmail ? `Applicant email: ${payload.workEmail}` : null,
    `Status: ${statusLabel}`,
    payload.status === "approved"
      ? `Approved credit limit: ${limitDisplay}`
      : null,
    payload.status === "approved"
      ? `Approved payment terms: ${payload.approvedPaymentTerms || "Net 30"}`
      : null,
    payload.adminComments ? `Admin comments: ${payload.adminComments}` : null,
  ].filter(Boolean) as string[];

  const internal = await sendEmail({
    to: internalRecipients,
    subject: `Credit Application ${statusLabel} — ${payload.companyName}`,
    text: lines.join("\n"),
    from: ORDERS_FROM,
    replyTo: payload.workEmail,
  });

  if (payload.workEmail) {
    const applicantText =
      payload.status === "approved"
        ? [
            `Hello${payload.contactName ? ` ${payload.contactName}` : ""},`,
            "",
            `Your Plastipac USA commercial credit application for ${payload.companyName} has been approved.`,
            "",
            `Approved credit limit: ${limitDisplay}`,
            `Payment terms: ${payload.approvedPaymentTerms || "Net 30"}`,
            payload.adminComments ? `Notes: ${payload.adminComments}` : null,
            "",
            "Our team will follow up if any additional onboarding steps are required.",
            "",
            "Plastipac USA Credit Desk",
          ]
            .filter(Boolean)
            .join("\n")
        : [
            `Hello${payload.contactName ? ` ${payload.contactName}` : ""},`,
            "",
            `Thank you for applying for commercial credit with Plastipac USA.`,
            `After review, we are unable to approve credit terms for ${payload.companyName} at this time.`,
            payload.adminComments ? `Notes: ${payload.adminComments}` : null,
            "",
            `Questions? Email ${SUPPORT_EMAIL} or call our sales desk.`,
            "",
            "Plastipac USA Credit Desk",
          ]
            .filter(Boolean)
            .join("\n");

    await sendEmail({
      to: payload.workEmail,
      subject: `Plastipac USA Credit Application ${statusLabel}`,
      text: applicantText,
      from: SUPPORT_FROM,
    });
  }

  return internal;
}

export interface TaxExemptionNotifyInput {
  companyName: string;
  taxId: string;
  registrationState: string;
  note?: string;
  customerEmail?: string;
  customerName?: string;
  shippingSummary?: string;
  attachmentName?: string;
}

/**
 * Admin alert when a checkout customer requests tax-exempt status.
 */
export async function notifyAdminTaxExemption(
  payload: TaxExemptionNotifyInput,
  attachment?: EmailAttachmentInput
): Promise<SendEmailResult> {
  const recipients = mailboxRecipients(ORDERS_EMAIL, getAdminNotificationEmail());

  const lines = [
    "Tax exemption verification requested during checkout",
    "",
    `Company Name: ${payload.companyName}`,
    `Tax ID / Resale Certificate: ${payload.taxId}`,
    `State of Registration: ${payload.registrationState}`,
    payload.customerName ? `Customer: ${payload.customerName}` : null,
    payload.customerEmail ? `Email: ${payload.customerEmail}` : null,
    payload.shippingSummary ? `Ship to: ${payload.shippingSummary}` : null,
    payload.note ? `Note: ${payload.note}` : null,
    payload.attachmentName ? `Certificate file: ${payload.attachmentName}` : null,
    "",
    "Please verify this certificate before removing sales tax from the order.",
  ].filter(Boolean) as string[];

  return sendEmail({
    to: recipients,
    subject: `Tax exemption request — ${payload.companyName}`,
    text: lines.join("\n"),
    replyTo: payload.customerEmail,
    from: `Plastipac Orders <${ORDERS_EMAIL}>`,
    attachments: attachment ? [attachment] : undefined,
  });
}

export interface PurchaseOrderNotifyInput {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerCompany: string;
  totalAmount: number;
  shippingState?: string;
  shippingCity?: string;
  shippingAddressSummary?: string;
  shippingPhone?: string;
  itemCount?: number;
  itemsSummary?: string;
  orderDate?: string;
  fridayDeliveryDate?: string;
  fridayDeliveryService?: string;
  detailsText?: string;
}

/**
 * Admin alert when a B2B purchase order / checkout completes.
 */
export async function notifyAdminPurchaseOrder(
  payload: PurchaseOrderNotifyInput
): Promise<SendEmailResult> {
  const recipients = mailboxRecipients(ORDERS_EMAIL, getAdminNotificationEmail());

  const base = getAppBaseUrl();
  const total = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(payload.totalAmount || 0));

  const lines = [
    "New B2B Purchase Order",
    "",
    `PO Reference: ${payload.orderId}`,
    `Customer: ${payload.customerName}`,
    `Company: ${payload.customerCompany}`,
    `Email: ${payload.customerEmail}`,
    `Total Amount: ${total}`,
    payload.shippingState
      ? `Shipping State: ${payload.shippingState}`
      : null,
    payload.shippingCity ? `Shipping City: ${payload.shippingCity}` : null,
    payload.fridayDeliveryService || null,
    payload.fridayDeliveryDate ? `Friday delivery: ${payload.fridayDeliveryDate}` : null,
    payload.shippingAddressSummary || payload.shippingPhone
      ? [
          "SHIPPING ADDRESS",
          payload.shippingAddressSummary,
          payload.shippingPhone &&
          !payload.shippingAddressSummary?.includes(payload.shippingPhone)
            ? `Phone: ${payload.shippingPhone}`
            : null,
        ]
          .filter(Boolean)
          .join("\n")
      : null,
    payload.itemCount != null ? `Line Items: ${payload.itemCount}` : null,
    payload.detailsText || (payload.itemsSummary ? `Items: ${payload.itemsSummary}` : null),
    payload.orderDate ? `Order Date: ${payload.orderDate}` : null,
    "",
    `Open Admin Orders: ${base}/admin/orders`,
  ].filter(Boolean) as string[];

  return sendEmail({
    to: recipients,
    subject: `New B2B PO — ${payload.orderId} (${total})`,
    text: lines.join("\n"),
    replyTo: payload.customerEmail,
    from: `Plastipac Orders <${ORDERS_EMAIL}>`,
  });
}

export type {
  OrderConfirmationLineItem,
  OrderConfirmationContent as OrderConfirmationEmailPayload,
} from "@/lib/order-confirmation-email";

export interface OrderConfirmationEmailInput {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerCompany?: string;
  totalAmountUsd: number;
  itemsSummary: string;
  itemCount?: number;
  shippingAddressSummary?: string;
  shippingAddress?: import("@/lib/order-confirmation-email").OrderConfirmationContent["shippingAddress"];
  orderDate?: string;
  lineItems?: import("@/lib/order-confirmation-email").OrderConfirmationLineItem[];
  subtotalUsd?: number;
  discountUsd?: number;
  shippingUsd?: number;
  taxUsd?: number;
  shippingSelection?: import("@/lib/order-confirmation-email").OrderShippingSelection;
  fridayDeliveryDate?: string;
  fridayDeliveryService?: string;
  pdfBytes: Uint8Array;
}

/**
 * Customer + sales confirmation after Stripe checkout completes.
 * Uses branding from Supabase `email_templates` when available.
 * Never throws — logs and returns result (webhook must stay ACK'd).
 */
export async function sendOrderConfirmationEmail(
  payload: OrderConfirmationEmailInput
): Promise<SendEmailResult> {
  const buyerEmail = payload.customerEmail.trim().toLowerCase();
  if (!buyerEmail) {
    console.warn("[email] Order confirmation skipped — missing customer email.");
    return { success: false, skipped: true, error: "Missing customer email." };
  }

  try {
    const { fetchOrderConfirmationTemplate } = await import(
      "@/lib/email-template-store"
    );
    const { buildOrderConfirmationHtml } = await import(
      "@/lib/order-confirmation-email"
    );

    const template = {
      ...(await fetchOrderConfirmationTemplate()),
      footerSalesEmail: ORDERS_EMAIL,
      fromAddress: ORDERS_FROM,
    };
    const recipients = mailboxRecipients(buyerEmail, ORDERS_EMAIL);

    const rendered = buildOrderConfirmationHtml(template, {
      orderId: payload.orderId,
      customerName: payload.customerName,
      customerEmail: buyerEmail,
      customerCompany: payload.customerCompany,
      totalAmountUsd: payload.totalAmountUsd,
      itemsSummary: payload.itemsSummary,
      itemCount: payload.itemCount,
      shippingAddressSummary: payload.shippingAddressSummary,
      shippingAddress: payload.shippingAddress,
      orderDate: payload.orderDate,
      lineItems: payload.lineItems,
      subtotalUsd: payload.subtotalUsd,
      discountUsd: payload.discountUsd,
      shippingUsd: payload.shippingUsd,
      taxUsd: payload.taxUsd,
      shippingSelection: payload.shippingSelection,
      fridayDeliveryDate: payload.fridayDeliveryDate,
      fridayDeliveryService: payload.fridayDeliveryService,
    });

    const pdfFilename = `Order_${payload.orderId.replace(/[^a-zA-Z0-9._-]+/g, "-")}.pdf`;

    const result = await sendEmail({
      from: rendered.from,
      to: recipients,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      replyTo: ORDERS_EMAIL,
      attachments: [
        {
          filename: pdfFilename,
          content: payload.pdfBytes,
        },
      ],
    });

    if (result.success) {
      console.log(
        `[email] Order confirmation sent for #${payload.orderId} to ${recipients.join(", ")} (Resend id: ${result.id || "n/a"})`
      );
    } else if (!result.skipped) {
      console.error(
        `[email] Order confirmation failed for #${payload.orderId}:`,
        result.error || "unknown"
      );
    }

    return result;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email] Order confirmation exception:", message);
    return { success: false, error: message };
  }
}
