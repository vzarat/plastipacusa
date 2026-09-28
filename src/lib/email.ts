import { Resend } from "resend";
import React from "react";

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

export function getSenderEmail(fallback = "onboarding@resend.dev"): string {
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

export interface SendEmailInput {
  to: string | string[];
  subject: string;
  text: string;
  html?: string;
  react?: React.ReactElement;
  replyTo?: string;
  from?: string;
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
      `Plastipac USA <${getSenderEmail("onboarding@resend.dev")}>`;

    const { data, error } = await resend.emails.send({
      from,
      to: recipients,
      subject: input.subject,
      text: input.text,
      ...(input.html ? { html: input.html } : {}),
      ...(input.react ? { react: input.react } : {}),
      ...(input.replyTo ? { replyTo: input.replyTo } : {}),
    });

    if (error) {
      console.error("[email] Resend error:", error);
      return { success: false, error: error.message || "Send failed." };
    }

    return { success: true, id: data?.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[email] send exception:", message);
    return { success: false, error: message };
  }
}

export interface CreditApplicationNotifyInput {
  customerName: string;
  companyName: string;
  taxIdEin: string;
  requestedCreditLimit?: string;
  workEmail?: string;
  phone?: string;
  /** auth.users / profiles id for dossier deep-link */
  userId?: string | null;
  notes?: string;
}

/**
 * Admin alert when a B2B Net 30 credit application is submitted.
 */
export async function notifyAdminCreditApplication(
  payload: CreditApplicationNotifyInput
): Promise<SendEmailResult> {
  const adminEmail = getAdminNotificationEmail();
  if (!adminEmail) {
    console.warn(
      "[email] ADMIN_NOTIFICATION_EMAIL is not set — credit alert skipped."
    );
    console.log("[email] credit application payload:", payload);
    return { success: false, skipped: true, error: "ADMIN_NOTIFICATION_EMAIL missing." };
  }

  const base = getAppBaseUrl();
  const dossierUrl = payload.userId
    ? `${base}/admin/customers/${payload.userId}`
    : `${base}/admin/credit-applications`;

  const limitDisplay = payload.requestedCreditLimit
    ? `$${String(payload.requestedCreditLimit).replace(/^\$/, "")}`
    : "Not specified";

  const lines = [
    "New B2B Net 30 Credit Application",
    "",
    `Customer Name: ${payload.customerName}`,
    `Company Name: ${payload.companyName}`,
    `TAX ID / FEIN: ${payload.taxIdEin || "—"}`,
    `Requested Credit Limit: ${limitDisplay}`,
    payload.workEmail ? `Work Email: ${payload.workEmail}` : null,
    payload.phone ? `Phone: ${payload.phone}` : null,
    payload.notes ? `Notes: ${payload.notes}` : null,
    "",
    `View Customer Dossier: ${dossierUrl}`,
    `Credit Applications Queue: ${base}/admin/credit-applications`,
  ].filter(Boolean) as string[];

  return sendEmail({
    to: adminEmail,
    subject: `B2B Credit Application — ${payload.companyName}`,
    text: lines.join("\n"),
    replyTo: payload.workEmail,
    from: `Plastipac Credit <${getSenderEmail("onboarding@resend.dev")}>`,
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
  itemCount?: number;
  itemsSummary?: string;
  orderDate?: string;
}

/**
 * Admin alert when a B2B purchase order / checkout completes.
 */
export async function notifyAdminPurchaseOrder(
  payload: PurchaseOrderNotifyInput
): Promise<SendEmailResult> {
  const adminEmail = getAdminNotificationEmail();
  if (!adminEmail) {
    console.warn(
      "[email] ADMIN_NOTIFICATION_EMAIL is not set — PO alert skipped."
    );
    console.log("[email] purchase order payload:", payload);
    return { success: false, skipped: true, error: "ADMIN_NOTIFICATION_EMAIL missing." };
  }

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
    payload.shippingAddressSummary
      ? `Ship To: ${payload.shippingAddressSummary}`
      : null,
    payload.itemCount != null ? `Line Items: ${payload.itemCount}` : null,
    payload.itemsSummary ? `Items: ${payload.itemsSummary}` : null,
    payload.orderDate ? `Order Date: ${payload.orderDate}` : null,
    "",
    `Open Admin Orders: ${base}/admin/orders`,
  ].filter(Boolean) as string[];

  return sendEmail({
    to: adminEmail,
    subject: `New B2B PO — ${payload.orderId} (${total})`,
    text: lines.join("\n"),
    replyTo: payload.customerEmail,
    from: `Plastipac Orders <${getSenderEmail("onboarding@resend.dev")}>`,
  });
}
