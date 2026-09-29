/**
 * Shared order-confirmation email branding + HTML renderer.
 * Used by Resend webhook sends and the Admin live preview / test mailer.
 */

export const ORDER_CONFIRMATION_TEMPLATE_SLUG = "order_confirmation";
export const DASHBOARD_ORDERS_URL = "https://www.plastipacusa.com/dashboard/orders";
export const DEFAULT_ORDER_FROM = "Plastipac USA <orders@plastipacusa.com>";

/** Public absolute logo (same CDN asset used in Navbar/Footer). */
export const DEFAULT_LOGO_URL =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/PLASTIPAC_USA_LOGO%202.svg";

export interface EmailTemplateBranding {
  subject: string;
  logoUrl: string;
  primaryColor: string;
  navyColor: string;
  backgroundColor: string;
  panelColor: string;
  textColor: string;
  mutedColor: string;
  greetingPrefix: string;
  mainMessage: string;
  /** @deprecated CTA removed from template; kept for DB row compatibility */
  ctaLabel: string;
  /** @deprecated CTA removed from template; kept for DB row compatibility */
  ctaUrl: string;
  footerSalesEmail: string;
  footerSupportPhoneUs: string;
  footerSupportPhoneMx: string;
  footerAddress: string;
  footerWebsite: string;
  legalDisclaimer: string;
  fromAddress: string;
}

export const DEFAULT_EMAIL_TEMPLATE: EmailTemplateBranding = {
  subject: "Order Confirmation #{{orderId}} - Plastipac USA",
  logoUrl: DEFAULT_LOGO_URL,
  primaryColor: "#0055A5",
  navyColor: "#003366",
  backgroundColor: "#F8FAFC",
  panelColor: "#F1F5F9",
  textColor: "#1E293B",
  mutedColor: "#64748B",
  greetingPrefix: "Hello",
  mainMessage:
    "We have received your order and it is currently being processed. Your payment has been confirmed and order status is Paid & Cleared.",
  ctaLabel: "",
  ctaUrl: "",
  footerSalesEmail: "sales@plastipacusa.com",
  footerSupportPhoneUs: "+1 (956) 400-3683",
  footerSupportPhoneMx: "+52 (899) 923-1320",
  footerAddress:
    "Priv. San Rafael, Parque Moll Industrial, C.P. 88756, Reynosa, Tamps.",
  footerWebsite: "www.plastipacusa.com",
  legalDisclaimer:
    "This is an automated purchase confirmation email from Plastipac USA. If you have any questions about your order, reply to this email or contact our sales team.",
  fromAddress: DEFAULT_ORDER_FROM,
};

export interface OrderConfirmationLineItem {
  description: string;
  quantity: number;
  unitPrice?: number;
  total?: number;
}

export interface OrderConfirmationContent {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerCompany?: string;
  totalAmountUsd: number;
  itemsSummary?: string;
  itemCount?: number;
  shippingAddressSummary?: string;
  orderDate?: string;
  lineItems?: OrderConfirmationLineItem[];
}

export function escapeHtml(value: string): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function formatUsd(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(amount || 0));
}

export function formatOrderDateLabel(raw?: string): string {
  try {
    const d = raw ? new Date(raw) : new Date();
    if (Number.isNaN(d.getTime())) {
      return new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
    return d.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return new Date().toLocaleDateString("en-US");
  }
}

export function resolveSubject(
  template: EmailTemplateBranding,
  orderId: string
): string {
  return String(template.subject || DEFAULT_EMAIL_TEMPLATE.subject).replace(
    /\{\{\s*orderId\s*\}\}/gi,
    orderId
  );
}

export function resolveLineItems(
  payload: OrderConfirmationContent
): OrderConfirmationLineItem[] {
  if (Array.isArray(payload.lineItems) && payload.lineItems.length > 0) {
    return payload.lineItems;
  }

  const parts = String(payload.itemsSummary || "")
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return [
      {
        description: "Plastipac industrial order",
        quantity: payload.itemCount || 1,
        unitPrice: payload.totalAmountUsd,
        total: payload.totalAmountUsd,
      },
    ];
  }

  return parts.map((part) => {
    const match = part.match(/^(\d+)\s*[×x]\s*(.+)$/i);
    if (match) {
      return {
        description: match[2].trim(),
        quantity: Number(match[1]) || 1,
      };
    }
    return { description: part, quantity: 1 };
  });
}

function buildProductsTableRows(
  items: OrderConfirmationLineItem[],
  brand: EmailTemplateBranding
): string {
  const border = "#E2E8F0";
  const white = "#FFFFFF";
  return items
    .map((item, index) => {
      const qty = Number(item.quantity || 1) || 1;
      const unit =
        item.unitPrice != null
          ? Number(item.unitPrice)
          : item.total != null && qty > 0
            ? Number(item.total) / qty
            : null;
      const lineTotal =
        item.total != null
          ? Number(item.total)
          : unit != null
            ? unit * qty
            : null;
      const bg = index % 2 === 0 ? white : brand.panelColor;
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid ${border};background:${bg};color:${brand.textColor};font-size:13px;line-height:1.4;">
            ${escapeHtml(item.description)}
          </td>
          <td align="center" style="padding:10px 12px;border-bottom:1px solid ${border};background:${bg};color:${brand.textColor};font-size:13px;font-weight:700;white-space:nowrap;">
            ${qty}
          </td>
          <td align="right" style="padding:10px 12px;border-bottom:1px solid ${border};background:${bg};color:${brand.textColor};font-size:13px;white-space:nowrap;">
            ${unit != null ? escapeHtml(formatUsd(unit)) : "—"}
          </td>
          <td align="right" style="padding:10px 12px;border-bottom:1px solid ${border};background:${bg};color:${brand.textColor};font-size:13px;font-weight:700;white-space:nowrap;">
            ${lineTotal != null ? escapeHtml(formatUsd(lineTotal)) : "—"}
          </td>
        </tr>`;
    })
    .join("");
}

export function mergeEmailTemplate(
  partial?: Partial<EmailTemplateBranding> | null
): EmailTemplateBranding {
  return {
    ...DEFAULT_EMAIL_TEMPLATE,
    ...(partial || {}),
  };
}

export function buildOrderConfirmationHtml(
  templateInput: Partial<EmailTemplateBranding> | null | undefined,
  content: OrderConfirmationContent
): { html: string; text: string; subject: string; from: string } {
  const template = mergeEmailTemplate(templateInput);
  const orderId = content.orderId;
  const subject = resolveSubject(template, orderId);
  const totalFormatted = formatUsd(content.totalAmountUsd);
  const safeName = content.customerName || "Customer";
  const purchaseDate = formatOrderDateLabel(content.orderDate);
  const lineItems = resolveLineItems(content);
  const productRows = buildProductsTableRows(lineItems, template);
  const border = "#E2E8F0";
  const white = "#FFFFFF";
  const logoSrc =
    String(template.logoUrl || DEFAULT_LOGO_URL).trim() || DEFAULT_LOGO_URL;

  const companyBlock = content.customerCompany
    ? `<tr>
         <td style="padding:0 0 8px;color:${template.mutedColor};font-size:13px;">
           <strong style="color:${template.textColor};">Company:</strong> ${escapeHtml(content.customerCompany)}
         </td>
       </tr>`
    : "";

  const shippingBlock = content.shippingAddressSummary
    ? `<p style="margin:0 0 4px;color:${template.mutedColor};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Shipping Address</p>
       <p style="margin:0;color:${template.textColor};font-size:14px;line-height:1.55;">${escapeHtml(content.shippingAddressSummary)}</p>`
    : `<p style="margin:0;color:${template.mutedColor};font-size:14px;line-height:1.55;">Shipping address will be confirmed by our logistics team.</p>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${template.backgroundColor};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${template.backgroundColor};margin:0;padding:0;width:100%;">
    <tr>
      <td align="center" style="padding:28px 12px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background-color:${white};border:1px solid ${border};">
          <tr>
            <td align="center" style="background-color:${white};padding:28px 24px 18px;border-bottom:3px solid ${template.primaryColor};">
              <img
                src="${escapeHtml(logoSrc)}"
                alt="PLASTIPAC USA"
                width="220"
                style="display:block;margin:0 auto;max-width:220px;width:100%;height:auto;border:0;outline:none;text-decoration:none;"
                onerror="this.onerror=null;this.style.display='none';if(this.nextElementSibling){this.nextElementSibling.style.display='block';}"
              />
              <div style="display:none;margin:0 auto;font-family:Arial,Helvetica,sans-serif;font-size:22px;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;color:${template.navyColor};">
                PLASTIPAC USA
              </div>
              <p style="margin:14px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${template.navyColor};">
                Plastipac USA · Stretch Film &amp; Packaging
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:${template.navyColor};padding:14px 24px;">
              <h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:20px;line-height:1.3;font-weight:700;color:${white};text-align:center;">
                Order Confirmation
              </h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 24px 8px;font-family:Arial,Helvetica,sans-serif;color:${template.textColor};">
              <p style="margin:0 0 14px;font-size:16px;font-weight:700;color:${template.textColor};">
                ${escapeHtml(template.greetingPrefix)} ${escapeHtml(safeName)},
              </p>
              <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:${template.mutedColor};">
                ${escapeHtml(template.mainMessage)}
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${template.panelColor};border:1px solid ${border};margin:0 0 20px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding:0 0 8px;color:${template.mutedColor};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">
                          Order Summary
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 6px;color:${template.textColor};font-size:14px;">
                          <strong>Order Number:</strong> #${escapeHtml(orderId)}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 6px;color:${template.textColor};font-size:14px;">
                          <strong>Purchase Date:</strong> ${escapeHtml(purchaseDate)}
                        </td>
                      </tr>
                      ${companyBlock}
                    </table>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid ${border};margin:0 0 20px;">
                <tr>
                  <td colspan="4" style="background-color:${template.primaryColor};padding:10px 12px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${white};">
                    Product Details
                  </td>
                </tr>
                <tr>
                  <th align="left" style="padding:10px 12px;background-color:${template.panelColor};border-bottom:1px solid ${border};color:${template.navyColor};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Product</th>
                  <th align="center" style="padding:10px 12px;background-color:${template.panelColor};border-bottom:1px solid ${border};color:${template.navyColor};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Qty</th>
                  <th align="right" style="padding:10px 12px;background-color:${template.panelColor};border-bottom:1px solid ${border};color:${template.navyColor};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Unit Price</th>
                  <th align="right" style="padding:10px 12px;background-color:${template.panelColor};border-bottom:1px solid ${border};color:${template.navyColor};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Subtotal</th>
                </tr>
                ${productRows}
                <tr>
                  <td colspan="3" align="right" style="padding:14px 12px;background-color:${white};color:${template.textColor};font-size:14px;font-weight:700;border-top:2px solid ${template.navyColor};">
                    Total Paid (USD)
                  </td>
                  <td align="right" style="padding:14px 12px;background-color:${white};color:${template.primaryColor};font-size:16px;font-weight:800;border-top:2px solid ${template.navyColor};white-space:nowrap;">
                    ${escapeHtml(totalFormatted)}
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${template.panelColor};border:1px solid ${border};margin:0 0 8px;">
                <tr>
                  <td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;">
                    ${shippingBlock}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;background-color:${template.navyColor};font-family:Arial,Helvetica,sans-serif;color:${white};">
              <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#93C5FD;">
                Support
              </p>
              <p style="margin:0 0 6px;font-size:13px;line-height:1.5;color:${white};">
                <a href="mailto:${escapeHtml(template.footerSalesEmail)}" style="color:#BFDBFE;text-decoration:none;">${escapeHtml(template.footerSalesEmail)}</a>
              </p>
              <p style="margin:0 0 6px;font-size:13px;line-height:1.5;color:${white};">
                Phones: ${escapeHtml(template.footerSupportPhoneUs)} | ${escapeHtml(template.footerSupportPhoneMx)}
              </p>
              <p style="margin:0 0 6px;font-size:13px;line-height:1.5;color:#CBD5E1;">
                ${escapeHtml(template.footerAddress)}
              </p>
              <p style="margin:0 0 16px;font-size:13px;line-height:1.5;">
                <a href="https://${escapeHtml(template.footerWebsite.replace(/^https?:\/\//, ""))}" style="color:#93C5FD;text-decoration:underline;">${escapeHtml(template.footerWebsite)}</a>
              </p>
              <p style="margin:0;padding-top:14px;border-top:1px solid rgba(255,255,255,0.18);font-size:11px;line-height:1.55;color:#94A3B8;">
                ${escapeHtml(template.legalDisclaimer)}
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textBody = [
    `${template.greetingPrefix} ${safeName},`,
    "",
    "Order Confirmation — Plastipac USA",
    template.mainMessage,
    "",
    `Order Number: #${orderId}`,
    `Purchase Date: ${purchaseDate}`,
    content.customerCompany ? `Company: ${content.customerCompany}` : null,
    "",
    "Products:",
    ...lineItems.map((item) => {
      const qty = item.quantity || 1;
      const line =
        item.total != null
          ? formatUsd(item.total)
          : item.unitPrice != null
            ? formatUsd(Number(item.unitPrice) * qty)
            : "";
      return `- ${item.description} × ${qty}${line ? ` — ${line}` : ""}`;
    }),
    "",
    `Total Paid: ${totalFormatted} USD`,
    content.shippingAddressSummary
      ? `Shipping Address: ${content.shippingAddressSummary}`
      : null,
    "",
    "Support:",
    template.footerSalesEmail,
    `Phones: ${template.footerSupportPhoneUs} | ${template.footerSupportPhoneMx}`,
    template.footerAddress,
    template.footerWebsite,
    "",
    template.legalDisclaimer,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    html,
    text: textBody,
    subject,
    from: template.fromAddress || DEFAULT_ORDER_FROM,
  };
}

export const SAMPLE_ORDER_CONTENT: OrderConfirmationContent = {
  orderId: "TEST-123",
  customerName: "Carlos Mendoza",
  customerEmail: "test@example.com",
  customerCompany: "Mendoza Packaging LLC",
  totalAmountUsd: 1847.5,
  orderDate: new Date().toISOString(),
  shippingAddressSummary:
    "1200 Industrial Blvd · McAllen, TX 78501 · United States",
  lineItems: [
    {
      description: 'FORCE Hand Film 18" × 80 Ga × 1500 ft',
      quantity: 4,
      unitPrice: 286.0,
      total: 1144.0,
    },
    {
      description: "GENESIS Machine Roll 20\" × 5000 ft",
      quantity: 2,
      unitPrice: 351.75,
      total: 703.5,
    },
  ],
};

/** SQL to create the Supabase table used by the admin email template editor. */
export const EMAIL_TEMPLATES_SQL = `
create table if not exists public.email_templates (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null default 'Order Confirmation',
  subject text not null,
  logo_url text,
  primary_color text,
  navy_color text,
  background_color text,
  panel_color text,
  text_color text,
  muted_color text,
  greeting_prefix text,
  main_message text,
  cta_label text,
  cta_url text,
  footer_sales_email text,
  footer_support_phone_us text,
  footer_support_phone_mx text,
  footer_address text,
  footer_website text,
  legal_disclaimer text,
  from_address text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
`.trim();
