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
      `Plastipac USA <${getSenderEmail("onboarding@resend.dev")}>`;

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

const ORDER_CONFIRMATION_FROM = "Plastipac USA <orders@plastipacusa.com>";
const INTERNAL_SALES_EMAIL = "sales@plastipacusa.com";

export interface OrderConfirmationEmailInput {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerCompany?: string;
  totalAmountUsd: number;
  itemsSummary: string;
  itemCount?: number;
  shippingAddressSummary?: string;
  pdfBytes: Uint8Array;
}

function escapeHtml(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount || 0));
}

/**
 * Customer + sales confirmation after Stripe checkout completes.
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

  const recipients = Array.from(
    new Set([buyerEmail, INTERNAL_SALES_EMAIL].filter(Boolean))
  );

  const orderId = payload.orderId;
  const totalFormatted = formatUsd(payload.totalAmountUsd);
  const safeName = payload.customerName || "Customer";
  const companyLine = payload.customerCompany
    ? `<p style="margin:0 0 8px;color:#475569;font-size:14px;"><strong>Company:</strong> ${escapeHtml(payload.customerCompany)}</p>`
    : "";

  const shippingBlock = payload.shippingAddressSummary
    ? `<p style="margin:0 0 4px;color:#475569;font-size:14px;"><strong>Ship to:</strong></p>
       <p style="margin:0 0 16px;color:#334155;font-size:14px;line-height:1.5;">${escapeHtml(payload.shippingAddressSummary)}</p>`
    : `<p style="margin:0 0 16px;color:#64748b;font-size:14px;">Shipping address will be confirmed by our logistics team.</p>`;

  const itemsLine =
    payload.itemsSummary ||
    (payload.itemCount != null ? `${payload.itemCount} line item(s)` : "See attached PDF");

  const html = `<!DOCTYPE html>
<html lang="es">
  <body style="margin:0;padding:0;background:#f8fafc;font-family:Inter,Arial,sans-serif;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:560px;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
            <tr>
              <td style="background:linear-gradient(90deg,#1d4ed8,#4338ca);padding:20px 24px;color:#ffffff;">
                <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;opacity:0.9;">Plastipac USA</p>
                <h1 style="margin:8px 0 0;font-size:20px;font-weight:800;">Payment confirmed</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:24px;">
                <p style="margin:0 0 12px;color:#0f172a;font-size:16px;font-weight:700;">Hello ${escapeHtml(safeName)},</p>
                <p style="margin:0 0 16px;color:#475569;font-size:14px;line-height:1.6;">
                  Thank you for your B2B order. Your payment was processed successfully and your order is now
                  <strong style="color:#0369a1;">Paid &amp; Cleared</strong>.
                </p>
                ${companyLine}
                <div style="background:#f1f5f9;border-radius:12px;padding:16px;margin:0 0 16px;">
                  <p style="margin:0 0 8px;color:#0f172a;font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:0.06em;">Order summary</p>
                  <p style="margin:0 0 6px;color:#334155;font-size:14px;"><strong>Order ID:</strong> ${escapeHtml(orderId)}</p>
                  <p style="margin:0 0 6px;color:#334155;font-size:14px;"><strong>Items:</strong> ${escapeHtml(itemsLine)}</p>
                  <p style="margin:0;color:#0f172a;font-size:16px;font-weight:800;"><strong>Total paid:</strong> ${escapeHtml(totalFormatted)} USD</p>
                </div>
                ${shippingBlock}
                <p style="margin:0;color:#64748b;font-size:12px;line-height:1.5;">
                  Your branded order summary PDF is attached. For questions, reply to this email or contact
                  <a href="mailto:sales@plastipacusa.com" style="color:#0284c7;">sales@plastipacusa.com</a>.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = [
    `Hello ${safeName},`,
    "",
    "Your Plastipac USA payment was confirmed. Order status: Paid & Cleared.",
    "",
    `Order ID: ${orderId}`,
    `Items: ${itemsLine}`,
    `Total paid: ${totalFormatted} USD`,
    payload.shippingAddressSummary
      ? `Ship to: ${payload.shippingAddressSummary}`
      : null,
    "",
    "Your order summary PDF is attached.",
  ]
    .filter(Boolean)
    .join("\n");

  const pdfFilename = `Order_${orderId.replace(/[^a-zA-Z0-9._-]+/g, "-")}.pdf`;

  try {
    const result = await sendEmail({
      from: ORDER_CONFIRMATION_FROM,
      to: recipients,
      subject: `Confirmación de Pedido #${orderId} - Plastipac USA`,
      text,
      html,
      replyTo: INTERNAL_SALES_EMAIL,
      attachments: [
        {
          filename: pdfFilename,
          content: payload.pdfBytes,
        },
      ],
    });

    if (result.success) {
      console.log(
        `[email] Order confirmation sent for #${orderId} to ${recipients.join(", ")} (Resend id: ${result.id || "n/a"})`
      );
    } else if (!result.skipped) {
      console.error(
        `[email] Order confirmation failed for #${orderId}:`,
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
