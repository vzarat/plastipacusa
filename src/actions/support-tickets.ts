"use server";

import { getCurrentUser } from "@/actions/auth";
import { SUPPORT_EMAIL, SUPPORT_FROM } from "@/lib/company-email";
import { sendEmail } from "@/lib/email";
import { requireTurnstileToken } from "@/lib/turnstile";

export type SupportTicketCategory =
  | "platform"
  | "orders"
  | "account"
  | "other";

export interface SubmitSupportTicketInput {
  subject: string;
  category?: SupportTicketCategory;
  message: string;
  turnstileToken?: string;
}

export async function submitSupportTicket(
  input: SubmitSupportTicketInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) {
      return { success: false, error: "Please sign in to submit a support ticket." };
    }

    const turnstileError = await requireTurnstileToken(input.turnstileToken);
    if (turnstileError) {
      return { success: false, error: turnstileError };
    }

    const subject = String(input.subject || "").trim();
    const message = String(input.message || "").trim();
    const category = (input.category || "platform") as SupportTicketCategory;

    if (subject.length < 3) {
      return { success: false, error: "Please enter a short subject for your ticket." };
    }
    if (message.length < 10) {
      return {
        success: false,
        error: "Please describe the problem in a bit more detail (at least a few sentences).",
      };
    }

    const profile = currentUser.profile;
    const userEmail = currentUser.user.email || profile.email || "";
    const categoryLabel =
      category === "orders"
        ? "Orders / Shipping"
        : category === "account"
          ? "Account / Login"
          : category === "other"
            ? "Other"
            : "Platform / Website";

    const result = await sendEmail({
      from: SUPPORT_FROM,
      to: SUPPORT_EMAIL,
      replyTo: userEmail || undefined,
      subject: `[Support Ticket] ${subject}`.slice(0, 180),
      text: [
        "New customer support ticket",
        "",
        `Category: ${categoryLabel}`,
        `Subject: ${subject}`,
        "",
        `Customer: ${profile.fullName || "—"}`,
        `Company: ${profile.companyName || "—"}`,
        `Email: ${userEmail || "—"}`,
        `Phone: ${profile.phone || "—"}`,
        `User ID: ${currentUser.user.id}`,
        "",
        "Message:",
        message,
      ].join("\n"),
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;color:#0f172a;line-height:1.5">
          <h2 style="margin:0 0 12px;font-size:18px">New customer support ticket</h2>
          <p style="margin:0 0 8px"><strong>Category:</strong> ${escapeHtml(categoryLabel)}</p>
          <p style="margin:0 0 8px"><strong>Subject:</strong> ${escapeHtml(subject)}</p>
          <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0" />
          <p style="margin:0 0 4px"><strong>Customer:</strong> ${escapeHtml(profile.fullName || "—")}</p>
          <p style="margin:0 0 4px"><strong>Company:</strong> ${escapeHtml(profile.companyName || "—")}</p>
          <p style="margin:0 0 4px"><strong>Email:</strong> ${escapeHtml(userEmail || "—")}</p>
          <p style="margin:0 0 4px"><strong>Phone:</strong> ${escapeHtml(profile.phone || "—")}</p>
          <p style="margin:0 0 16px"><strong>User ID:</strong> ${escapeHtml(currentUser.user.id)}</p>
          <p style="margin:0 0 6px"><strong>Message</strong></p>
          <pre style="white-space:pre-wrap;font-family:Arial,Helvetica,sans-serif;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px;margin:0">${escapeHtml(message)}</pre>
        </div>
      `,
    });

    if (!result.success) {
      return {
        success: false,
        error:
          result.error ||
          "Could not send your ticket right now. Please email support@plastipacusa.com directly.",
      };
    }

    return { success: true };
  } catch (err: unknown) {
    console.error("submitSupportTicket failed:", err);
    return {
      success: false,
      error:
        "Could not send your ticket right now. Please email support@plastipacusa.com directly.",
    };
  }
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
