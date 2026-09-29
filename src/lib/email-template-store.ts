import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createServiceRoleClient,
  isServiceRoleConfigured,
} from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";
import {
  DEFAULT_EMAIL_TEMPLATE,
  ORDER_CONFIRMATION_TEMPLATE_SLUG,
  mergeEmailTemplate,
  type EmailTemplateBranding,
} from "@/lib/order-confirmation-email";

function rowToBranding(row: Record<string, unknown> | null): EmailTemplateBranding {
  if (!row) return { ...DEFAULT_EMAIL_TEMPLATE };
  return mergeEmailTemplate({
    subject: String(row.subject || DEFAULT_EMAIL_TEMPLATE.subject),
    logoUrl: String(row.logo_url || DEFAULT_EMAIL_TEMPLATE.logoUrl),
    primaryColor: String(row.primary_color || DEFAULT_EMAIL_TEMPLATE.primaryColor),
    navyColor: String(row.navy_color || DEFAULT_EMAIL_TEMPLATE.navyColor),
    backgroundColor: String(
      row.background_color || DEFAULT_EMAIL_TEMPLATE.backgroundColor
    ),
    panelColor: String(row.panel_color || DEFAULT_EMAIL_TEMPLATE.panelColor),
    textColor: String(row.text_color || DEFAULT_EMAIL_TEMPLATE.textColor),
    mutedColor: String(row.muted_color || DEFAULT_EMAIL_TEMPLATE.mutedColor),
    greetingPrefix: String(
      row.greeting_prefix || DEFAULT_EMAIL_TEMPLATE.greetingPrefix
    ),
    mainMessage: String(row.main_message || DEFAULT_EMAIL_TEMPLATE.mainMessage),
    ctaLabel: String(row.cta_label || DEFAULT_EMAIL_TEMPLATE.ctaLabel),
    ctaUrl: String(row.cta_url || DEFAULT_EMAIL_TEMPLATE.ctaUrl),
    footerSalesEmail: String(
      row.footer_sales_email || DEFAULT_EMAIL_TEMPLATE.footerSalesEmail
    ),
    footerSupportPhoneUs: String(
      row.footer_support_phone_us || DEFAULT_EMAIL_TEMPLATE.footerSupportPhoneUs
    ),
    footerSupportPhoneMx: String(
      row.footer_support_phone_mx || DEFAULT_EMAIL_TEMPLATE.footerSupportPhoneMx
    ),
    footerAddress: String(
      row.footer_address || DEFAULT_EMAIL_TEMPLATE.footerAddress
    ),
    footerWebsite: String(
      row.footer_website || DEFAULT_EMAIL_TEMPLATE.footerWebsite
    ),
    legalDisclaimer: String(
      row.legal_disclaimer || DEFAULT_EMAIL_TEMPLATE.legalDisclaimer
    ),
    fromAddress: String(row.from_address || DEFAULT_EMAIL_TEMPLATE.fromAddress),
  });
}

/**
 * Prefer service-role when configured; otherwise use the standard
 * cookie-based anon/server client (admin session / RLS).
 */
export async function getEmailTemplatesClient(): Promise<{
  client: SupabaseClient;
  mode: "service_role" | "anon";
}> {
  if (isServiceRoleConfigured()) {
    return { client: createServiceRoleClient(), mode: "service_role" };
  }
  return { client: await createServerClient(), mode: "anon" };
}

/** Load order confirmation branding (defaults if table/key missing). */
export async function fetchOrderConfirmationTemplate(): Promise<EmailTemplateBranding> {
  try {
    const { client } = await getEmailTemplatesClient();
    const { data, error } = await client
      .from("email_templates")
      .select("*")
      .eq("slug", ORDER_CONFIRMATION_TEMPLATE_SLUG)
      .maybeSingle();

    if (error) {
      console.warn("[email-templates] load skipped:", error.message || error);
      return { ...DEFAULT_EMAIL_TEMPLATE };
    }

    return rowToBranding(data as Record<string, unknown> | null);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("[email-templates] load exception:", message);
    return { ...DEFAULT_EMAIL_TEMPLATE };
  }
}

export { rowToBranding };
