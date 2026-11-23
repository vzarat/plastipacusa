import { getAppBaseUrl } from "@/lib/app-url";
import { CONTACT_EMAIL, CONTACT_FROM } from "@/lib/company-email";
import { WHATSAPP_URL_BARE } from "@/lib/company-contact";

/** White logo for dark email headers (PNG for Outlook/Gmail compatibility). */
function campaignLogoUrl(): string {
  return `${getAppBaseUrl()}/email/plastipac-logo-white.png`;
}

const SOCIAL = {
  facebook: "https://www.facebook.com/profile.php?id=61557962543741",
  instagram: "https://www.instagram.com/plastipacusallc/",
  linkedin: "https://www.linkedin.com/company/plastipacusa",
  whatsapp: WHATSAPP_URL_BARE,
} as const;

export function escapeEmailHtml(value: string): string {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function defaultCampaignFromAddress(): string {
  return CONTACT_FROM;
}

export function unsubscribeUrl(token: string): string {
  return `${getAppBaseUrl()}/unsubscribe?token=${encodeURIComponent(token)}`;
}

export function catalogCtaHtml(label = "Shop Stretch Film Catalog"): string {
  const href = `${getAppBaseUrl()}/#product-catalog-section`;
  return `<a href="${href}" style="display:inline-block;background:#0284c7;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:10px;margin:4px 6px 4px 0">${escapeEmailHtml(label)}</a>`;
}

export function freeDeliveryCtaHtml(label = "See Free Delivery Offers"): string {
  const href = `${getAppBaseUrl()}/#product-catalog-section`;
  return `<a href="${href}" style="display:inline-block;background:#0ea5e9;color:#ffffff;text-decoration:none;font-weight:700;font-size:14px;padding:12px 22px;border-radius:10px;margin:4px 6px 4px 0">${escapeEmailHtml(label)}</a>`;
}

function socialIconUrl(name: "facebook" | "instagram" | "linkedin" | "whatsapp"): string {
  return `${getAppBaseUrl()}/email/social/${name}.png`;
}

function socialIconButton(
  href: string,
  label: string,
  icon: "facebook" | "instagram" | "linkedin" | "whatsapp"
): string {
  const src = socialIconUrl(icon);
  return `<a href="${href}" target="_blank" rel="noopener noreferrer" aria-label="${escapeEmailHtml(label)}" style="display:inline-block;margin:0 6px;text-decoration:none;border:0;line-height:0"><img src="${src}" alt="${escapeEmailHtml(label)}" width="36" height="36" style="display:block;width:36px;height:36px;border:0;border-radius:18px" /></a>`;
}

function socialLinksHtml(): string {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto 14px">
  <tr>
    <td style="padding:0;text-align:center">
      ${socialIconButton(SOCIAL.facebook, "Facebook", "facebook")}
      ${socialIconButton(SOCIAL.instagram, "Instagram", "instagram")}
      ${socialIconButton(SOCIAL.linkedin, "LinkedIn", "linkedin")}
      ${socialIconButton(SOCIAL.whatsapp, "WhatsApp", "whatsapp")}
    </td>
  </tr>
</table>`.trim();
}

/** Default promo-style body for mass campaigns (catalog / offers — no credit CTA). */
export function defaultCampaignBodyHtml(): string {
  return `
<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#0f172a">Hello {{contact_name}},</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#334155">
  This week from Plastipac USA: factory-direct stretch film, promo pricing, and free delivery offers
  for qualifying RGV / Houston orders. Browse the catalog and grab what your warehouse needs.
</p>
<p style="margin:0 0 8px;text-align:center">
  ${catalogCtaHtml()}
  ${freeDeliveryCtaHtml()}
</p>
`.trim();
}

export function wrapCampaignHtml(input: {
  bodyHtml: string;
  previewText?: string;
  unsubscribeToken: string;
  contactName?: string;
  companyName?: string;
}): string {
  const greetingName = String(input.contactName || "").trim() || "there";
  const company = String(input.companyName || "").trim();
  const body = String(input.bodyHtml || "")
    .replaceAll("{{contact_name}}", escapeEmailHtml(greetingName))
    .replaceAll("{{company_name}}", escapeEmailHtml(company))
    .replaceAll("{{unsubscribe_url}}", unsubscribeUrl(input.unsubscribeToken));

  const unsub = unsubscribeUrl(input.unsubscribeToken);
  const preview = escapeEmailHtml(String(input.previewText || "").trim());
  const logoUrl = campaignLogoUrl();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Plastipac USA</title>
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,Helvetica,sans-serif">
  ${preview ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${preview}</div>` : ""}
  <div style="padding:24px 12px">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden">
      <div style="background:#0f172a;padding:22px 24px;text-align:center">
        <img src="${logoUrl}" alt="Plastipac USA" width="180" style="display:inline-block;max-width:180px;height:auto;border:0" />
        <p style="margin:12px 0 0;font-size:11px;letter-spacing:0.08em;text-transform:uppercase;color:#94a3b8">Expert Manufacturer of Stretch Film</p>
      </div>
      <div style="padding:28px 24px;color:#0f172a;font-size:15px;line-height:1.6">
        ${body}
      </div>
      <div style="padding:20px 24px 24px;border-top:1px solid #e2e8f0;background:#f8fafc;text-align:center">
        ${socialLinksHtml()}
        <p style="margin:0 0 8px;font-size:12px;color:#64748b;line-height:1.5">
          Plastipac USA · ${escapeEmailHtml(CONTACT_EMAIL)}
        </p>
        <p style="margin:0;font-size:12px;color:#64748b;line-height:1.5">
          Don't want these emails?
          <a href="${unsub}" style="color:#0284c7;text-decoration:underline">Unsubscribe</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function htmlToPlainText(html: string): string {
  return String(html || "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}
