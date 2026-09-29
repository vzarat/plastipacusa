"use server";

import { getCurrentUser } from "@/actions/auth";
import { sendEmail } from "@/lib/email";
import {
  createServiceRoleClient,
  isServiceRoleConfigured,
} from "@/lib/supabase/admin";
import {
  DEFAULT_EMAIL_TEMPLATE,
  EMAIL_TEMPLATES_SQL,
  ORDER_CONFIRMATION_TEMPLATE_SLUG,
  SAMPLE_ORDER_CONTENT,
  buildOrderConfirmationHtml,
  mergeEmailTemplate,
  type EmailTemplateBranding,
} from "@/lib/order-confirmation-email";
import {
  fetchOrderConfirmationTemplate,
  rowToBranding,
} from "@/lib/email-template-store";

function requireAdmin() {
  return getCurrentUser().then((user) => {
    if (!user || user.profile.role !== "admin") {
      throw new Error("Unauthorized");
    }
    return user;
  });
}

function brandingToRow(branding: EmailTemplateBranding) {
  return {
    slug: ORDER_CONFIRMATION_TEMPLATE_SLUG,
    name: "Order Confirmation",
    subject: branding.subject,
    logo_url: branding.logoUrl,
    primary_color: branding.primaryColor,
    navy_color: branding.navyColor,
    background_color: branding.backgroundColor,
    panel_color: branding.panelColor,
    text_color: branding.textColor,
    muted_color: branding.mutedColor,
    greeting_prefix: branding.greetingPrefix,
    main_message: branding.mainMessage,
    cta_label: branding.ctaLabel,
    cta_url: branding.ctaUrl,
    footer_sales_email: branding.footerSalesEmail,
    footer_support_phone_us: branding.footerSupportPhoneUs,
    footer_support_phone_mx: branding.footerSupportPhoneMx,
    footer_address: branding.footerAddress,
    footer_website: branding.footerWebsite,
    legal_disclaimer: branding.legalDisclaimer,
    from_address: branding.fromAddress,
    updated_at: new Date().toISOString(),
  };
}

export async function getOrderConfirmationTemplate(): Promise<EmailTemplateBranding> {
  return fetchOrderConfirmationTemplate();
}

export async function loadEmailTemplateForAdmin(): Promise<{
  success: boolean;
  template: EmailTemplateBranding;
  persisted: boolean;
  sqlHint?: string;
  error?: string;
}> {
  try {
    await requireAdmin();
    if (!isServiceRoleConfigured()) {
      return {
        success: true,
        template: { ...DEFAULT_EMAIL_TEMPLATE },
        persisted: false,
        sqlHint: EMAIL_TEMPLATES_SQL,
        error: "SUPABASE_SERVICE_ROLE_KEY is not configured.",
      };
    }

    const supabase = createServiceRoleClient();
    const { data, error } = await supabase
      .from("email_templates")
      .select("*")
      .eq("slug", ORDER_CONFIRMATION_TEMPLATE_SLUG)
      .maybeSingle();

    if (error) {
      return {
        success: true,
        template: { ...DEFAULT_EMAIL_TEMPLATE },
        persisted: false,
        sqlHint: EMAIL_TEMPLATES_SQL,
        error: error.message,
      };
    }

    return {
      success: true,
      template: rowToBranding(data as Record<string, unknown> | null),
      persisted: Boolean(data),
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      template: { ...DEFAULT_EMAIL_TEMPLATE },
      persisted: false,
      error: message,
    };
  }
}

export async function saveEmailTemplate(
  branding: EmailTemplateBranding
): Promise<{
  success: boolean;
  error?: string;
  sqlHint?: string;
}> {
  try {
    await requireAdmin();
    if (!isServiceRoleConfigured()) {
      return {
        success: false,
        error: "SUPABASE_SERVICE_ROLE_KEY is not configured.",
        sqlHint: EMAIL_TEMPLATES_SQL,
      };
    }

    const supabase = createServiceRoleClient();
    const payload = brandingToRow(mergeEmailTemplate(branding));
    const { error } = await supabase
      .from("email_templates")
      .upsert(payload, { onConflict: "slug" });

    if (error) {
      return {
        success: false,
        error: error.message,
        sqlHint: EMAIL_TEMPLATES_SQL,
      };
    }

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}

export async function sendTestOrderConfirmationEmail(input: {
  to: string;
  template?: EmailTemplateBranding;
}): Promise<{ success: boolean; error?: string; id?: string }> {
  try {
    await requireAdmin();
    const to = String(input.to || "").trim().toLowerCase();
    if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
      return { success: false, error: "Enter a valid test email address." };
    }

    const stored = await fetchOrderConfirmationTemplate();
    const template = mergeEmailTemplate(input.template || stored);
    const rendered = buildOrderConfirmationHtml(template, {
      ...SAMPLE_ORDER_CONTENT,
      customerEmail: to,
      orderDate: new Date().toISOString(),
    });

    const result = await sendEmail({
      from: rendered.from,
      to,
      subject: `[TEST] ${rendered.subject}`,
      text: rendered.text,
      html: rendered.html,
      replyTo: template.footerSalesEmail,
    });

    if (!result.success) {
      return {
        success: false,
        error:
          result.error ||
          (result.skipped ? "Resend is not configured." : "Send failed."),
      };
    }

    console.log(
      `[email-templates] Test confirmation sent to ${to} (id: ${result.id || "n/a"})`
    );
    return { success: true, id: result.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message };
  }
}
