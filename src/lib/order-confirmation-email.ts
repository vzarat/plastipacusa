/**
 * Shared order-confirmation email branding + HTML renderer.
 * Used by Resend webhook sends and the Admin live preview / test mailer.
 */

export const ORDER_CONFIRMATION_TEMPLATE_SLUG = "order_confirmation";
export const DASHBOARD_ORDERS_URL = "https://www.plastipacusa.com/dashboard/orders";
export const DEFAULT_ORDER_FROM = "Plastipac USA <orders@plastipacusa.com>";

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
  ctaLabel: string;
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
  subject: "Confirmación de Pedido #{{orderId}} - Plastipac USA",
  logoUrl: "https://www.plastipacusa.com/logo.png",
  primaryColor: "#0055A5",
  navyColor: "#003366",
  backgroundColor: "#F8FAFC",
  panelColor: "#F1F5F9",
  textColor: "#1E293B",
  mutedColor: "#64748B",
  greetingPrefix: "Hola",
  mainMessage:
    "Hemos recibido tu pedido y se encuentra en proceso de preparación. Tu pago fue confirmado y el estado de la orden es Paid & Cleared.",
  ctaLabel: "Ver mi Pedido",
  ctaUrl: DASHBOARD_ORDERS_URL,
  footerSalesEmail: "sales@plastipacusa.com",
  footerSupportPhoneUs: "+1 (956) 400-3683",
  footerSupportPhoneMx: "+52 (899) 923-1320",
  footerAddress:
    "Priv. San Rafael, Parque Moll Industrial, C.P. 88756, Reynosa, Tamps.",
  footerWebsite: "www.plastipacusa.com",
  legalDisclaimer:
    "Este es un correo automático de confirmación de compra enviado por Plastipac USA. Si tienes alguna duda con tu pedido, responde directamente a este correo o contacta a nuestro equipo de ventas.",
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
      return new Date().toLocaleDateString("es-MX", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
    return d.toLocaleDateString("es-MX", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return new Date().toLocaleDateString("es-MX");
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
        description: "Pedido industrial Plastipac",
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
  const safeName = content.customerName || "Cliente";
  const purchaseDate = formatOrderDateLabel(content.orderDate);
  const lineItems = resolveLineItems(content);
  const productRows = buildProductsTableRows(lineItems, template);
  const border = "#E2E8F0";
  const white = "#FFFFFF";

  const companyBlock = content.customerCompany
    ? `<tr>
         <td style="padding:0 0 8px;color:${template.mutedColor};font-size:13px;">
           <strong style="color:${template.textColor};">Empresa:</strong> ${escapeHtml(content.customerCompany)}
         </td>
       </tr>`
    : "";

  const shippingBlock = content.shippingAddressSummary
    ? `<p style="margin:0 0 4px;color:${template.mutedColor};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Dirección de entrega</p>
       <p style="margin:0;color:${template.textColor};font-size:14px;line-height:1.55;">${escapeHtml(content.shippingAddressSummary)}</p>`
    : `<p style="margin:0;color:${template.mutedColor};font-size:14px;line-height:1.55;">La dirección de entrega será confirmada por nuestro equipo de logística.</p>`;

  const html = `<!DOCTYPE html>
<html lang="es">
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
                src="${escapeHtml(template.logoUrl)}"
                alt="Plastipac USA"
                width="220"
                style="display:block;margin:0 auto;max-width:220px;width:100%;height:auto;border:0;outline:none;text-decoration:none;"
              />
              <p style="margin:14px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${template.navyColor};">
                Plastipac USA · Stretch Film &amp; Packaging
              </p>
            </td>
          </tr>
          <tr>
            <td style="background-color:${template.navyColor};padding:14px 24px;">
              <h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:20px;line-height:1.3;font-weight:700;color:${white};text-align:center;">
                Confirmación de Pedido
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
                          Resumen del pedido
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 6px;color:${template.textColor};font-size:14px;">
                          <strong>Número de Orden:</strong> #${escapeHtml(orderId)}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 6px;color:${template.textColor};font-size:14px;">
                          <strong>Fecha de Compra:</strong> ${escapeHtml(purchaseDate)}
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
                    Detalle de productos
                  </td>
                </tr>
                <tr>
                  <th align="left" style="padding:10px 12px;background-color:${template.panelColor};border-bottom:1px solid ${border};color:${template.navyColor};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Producto</th>
                  <th align="center" style="padding:10px 12px;background-color:${template.panelColor};border-bottom:1px solid ${border};color:${template.navyColor};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Cant.</th>
                  <th align="right" style="padding:10px 12px;background-color:${template.panelColor};border-bottom:1px solid ${border};color:${template.navyColor};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">P. unitario</th>
                  <th align="right" style="padding:10px 12px;background-color:${template.panelColor};border-bottom:1px solid ${border};color:${template.navyColor};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Subtotal</th>
                </tr>
                ${productRows}
                <tr>
                  <td colspan="3" align="right" style="padding:14px 12px;background-color:${white};color:${template.textColor};font-size:14px;font-weight:700;border-top:2px solid ${template.navyColor};">
                    Total pagado (USD)
                  </td>
                  <td align="right" style="padding:14px 12px;background-color:${white};color:${template.primaryColor};font-size:16px;font-weight:800;border-top:2px solid ${template.navyColor};white-space:nowrap;">
                    ${escapeHtml(totalFormatted)}
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${template.panelColor};border:1px solid ${border};margin:0 0 24px;">
                <tr>
                  <td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;">
                    ${shippingBlock}
                  </td>
                </tr>
              </table>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 8px;">
                <tr>
                  <td align="center" bgcolor="${template.primaryColor}" style="background-color:${template.primaryColor};border-radius:8px;">
                    <a href="${escapeHtml(template.ctaUrl)}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:${white};text-decoration:none;border-radius:8px;background-color:${template.primaryColor};">
                      ${escapeHtml(template.ctaLabel)}
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${template.mutedColor};">
                <a href="${escapeHtml(template.ctaUrl)}" style="color:${template.primaryColor};">${escapeHtml(template.ctaUrl)}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:24px;background-color:${template.navyColor};font-family:Arial,Helvetica,sans-serif;color:${white};">
              <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#93C5FD;">
                Atención / Soporte
              </p>
              <p style="margin:0 0 6px;font-size:13px;line-height:1.5;color:${white};">
                <a href="mailto:${escapeHtml(template.footerSalesEmail)}" style="color:#BFDBFE;text-decoration:none;">${escapeHtml(template.footerSalesEmail)}</a>
              </p>
              <p style="margin:0 0 6px;font-size:13px;line-height:1.5;color:${white};">
                Teléfonos: ${escapeHtml(template.footerSupportPhoneUs)} | ${escapeHtml(template.footerSupportPhoneMx)}
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

  const text = [
    `${template.greetingPrefix} ${safeName},`,
    "",
    "Confirmación de Pedido — Plastipac USA",
    template.mainMessage,
    "",
    `Número de Orden: #${orderId}`,
    `Fecha de Compra: ${purchaseDate}`,
    content.customerCompany ? `Empresa: ${content.customerCompany}` : null,
    "",
    "Productos:",
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
    `Total pagado: ${totalFormatted} USD`,
    content.shippingAddressSummary
      ? `Dirección de entrega: ${content.shippingAddressSummary}`
      : null,
    "",
    `${template.ctaLabel}: ${template.ctaUrl}`,
    "",
    "Atención / Soporte:",
    template.footerSalesEmail,
    `Teléfonos: ${template.footerSupportPhoneUs} | ${template.footerSupportPhoneMx}`,
    template.footerAddress,
    template.footerWebsite,
    "",
    template.legalDisclaimer,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    html,
    text,
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
