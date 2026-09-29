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
const SUPPORT_EMAIL = "support@plastipacusa.com";
const ORDER_CONFIRMATION_LOGO_URL =
  process.env.NEXT_PUBLIC_EMAIL_LOGO_URL?.trim() ||
  "https://www.plastipacusa.com/logo.png";
const DASHBOARD_ORDERS_URL = "https://www.plastipacusa.com/dashboard/orders";

/** Corporate palette for transactional HTML emails */
const BRAND = {
  primary: "#0055A5",
  navy: "#003366",
  bg: "#F8FAFC",
  panel: "#F1F5F9",
  text: "#1E293B",
  muted: "#64748B",
  border: "#E2E8F0",
  white: "#FFFFFF",
} as const;

export interface OrderConfirmationLineItem {
  description: string;
  quantity: number;
  unitPrice?: number;
  total?: number;
}

export interface OrderConfirmationEmailInput {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerCompany?: string;
  totalAmountUsd: number;
  itemsSummary: string;
  itemCount?: number;
  shippingAddressSummary?: string;
  orderDate?: string;
  lineItems?: OrderConfirmationLineItem[];
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

function formatOrderDateLabel(raw?: string): string {
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

function resolveLineItems(
  payload: OrderConfirmationEmailInput
): OrderConfirmationLineItem[] {
  if (Array.isArray(payload.lineItems) && payload.lineItems.length > 0) {
    return payload.lineItems;
  }

  // Fallback: parse "2× Product; 1× Other" style summaries from Stripe.
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

function buildProductsTableRows(items: OrderConfirmationLineItem[]): string {
  return items
    .map((item, index) => {
      const qty = Number(item.quantity || 1) || 1;
      const lineTotal =
        item.total != null
          ? Number(item.total)
          : item.unitPrice != null
            ? Number(item.unitPrice) * qty
            : null;
      const bg = index % 2 === 0 ? BRAND.white : BRAND.panel;
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid ${BRAND.border};background:${bg};color:${BRAND.text};font-size:13px;line-height:1.4;">
            ${escapeHtml(item.description)}
          </td>
          <td align="center" style="padding:10px 12px;border-bottom:1px solid ${BRAND.border};background:${bg};color:${BRAND.text};font-size:13px;font-weight:700;white-space:nowrap;">
            ${qty}
          </td>
          <td align="right" style="padding:10px 12px;border-bottom:1px solid ${BRAND.border};background:${bg};color:${BRAND.text};font-size:13px;font-weight:700;white-space:nowrap;">
            ${lineTotal != null ? escapeHtml(formatUsd(lineTotal)) : "—"}
          </td>
        </tr>`;
    })
    .join("");
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
  const safeName = payload.customerName || "Cliente";
  const purchaseDate = formatOrderDateLabel(payload.orderDate);
  const lineItems = resolveLineItems(payload);
  const productRows = buildProductsTableRows(lineItems);

  const companyBlock = payload.customerCompany
    ? `<tr>
         <td style="padding:0 0 8px;color:${BRAND.muted};font-size:13px;">
           <strong style="color:${BRAND.text};">Empresa:</strong> ${escapeHtml(payload.customerCompany)}
         </td>
       </tr>`
    : "";

  const shippingBlock = payload.shippingAddressSummary
    ? `<p style="margin:0 0 4px;color:${BRAND.muted};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">Dirección de entrega</p>
       <p style="margin:0;color:${BRAND.text};font-size:14px;line-height:1.55;">${escapeHtml(payload.shippingAddressSummary)}</p>`
    : `<p style="margin:0;color:${BRAND.muted};font-size:14px;line-height:1.55;">La dirección de entrega será confirmada por nuestro equipo de logística.</p>`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Confirmación de Pedido #${escapeHtml(orderId)}</title>
  <!--[if mso]>
  <style type="text/css">
    body, table, td { font-family: Arial, Helvetica, sans-serif !important; }
  </style>
  <![endif]-->
</head>
<body style="margin:0;padding:0;background-color:${BRAND.bg};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${BRAND.bg};margin:0;padding:0;width:100%;">
    <tr>
      <td align="center" style="padding:28px 12px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background-color:${BRAND.white};border:1px solid ${BRAND.border};">

          <!-- HEADER / LOGO -->
          <tr>
            <td align="center" style="background-color:${BRAND.white};padding:28px 24px 18px;border-bottom:3px solid ${BRAND.primary};">
              <img
                src="${ORDER_CONFIRMATION_LOGO_URL}"
                alt="Plastipac USA"
                width="220"
                style="display:block;margin:0 auto;max-width:220px;width:100%;height:auto;border:0;outline:none;text-decoration:none;"
              />
              <p style="margin:14px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:${BRAND.navy};">
                Plastipac USA · Stretch Film &amp; Packaging
              </p>
            </td>
          </tr>

          <!-- ACCENT BAR -->
          <tr>
            <td style="background-color:${BRAND.navy};padding:14px 24px;">
              <h1 style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:20px;line-height:1.3;font-weight:700;color:${BRAND.white};text-align:center;">
                Confirmación de Pedido
              </h1>
            </td>
          </tr>

          <!-- BODY -->
          <tr>
            <td style="padding:28px 24px 8px;font-family:Arial,Helvetica,sans-serif;color:${BRAND.text};">
              <p style="margin:0 0 14px;font-size:16px;font-weight:700;color:${BRAND.text};">
                Hola ${escapeHtml(safeName)},
              </p>
              <p style="margin:0 0 18px;font-size:14px;line-height:1.6;color:${BRAND.muted};">
                Hemos recibido tu pedido y se encuentra en proceso de preparación.
                Tu pago fue confirmado y el estado de la orden es
                <strong style="color:${BRAND.primary};">Paid &amp; Cleared</strong>.
              </p>

              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${BRAND.panel};border:1px solid ${BRAND.border};margin:0 0 20px;">
                <tr>
                  <td style="padding:16px 18px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding:0 0 8px;color:${BRAND.muted};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;">
                          Resumen del pedido
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 6px;color:${BRAND.text};font-size:14px;">
                          <strong>Número de Orden:</strong> #${escapeHtml(orderId)}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:0 0 6px;color:${BRAND.text};font-size:14px;">
                          <strong>Fecha de Compra:</strong> ${escapeHtml(purchaseDate)}
                        </td>
                      </tr>
                      ${companyBlock}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- PRODUCTS TABLE -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border:1px solid ${BRAND.border};margin:0 0 20px;">
                <tr>
                  <td colspan="3" style="background-color:${BRAND.primary};padding:10px 12px;font-family:Arial,Helvetica,sans-serif;font-size:12px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${BRAND.white};">
                    Detalle de productos
                  </td>
                </tr>
                <tr>
                  <th align="left" style="padding:10px 12px;background-color:${BRAND.panel};border-bottom:1px solid ${BRAND.border};color:${BRAND.navy};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Producto</th>
                  <th align="center" style="padding:10px 12px;background-color:${BRAND.panel};border-bottom:1px solid ${BRAND.border};color:${BRAND.navy};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Cant.</th>
                  <th align="right" style="padding:10px 12px;background-color:${BRAND.panel};border-bottom:1px solid ${BRAND.border};color:${BRAND.navy};font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.04em;">Subtotal</th>
                </tr>
                ${productRows}
                <tr>
                  <td colspan="2" align="right" style="padding:14px 12px;background-color:${BRAND.white};color:${BRAND.text};font-size:14px;font-weight:700;border-top:2px solid ${BRAND.navy};">
                    Total pagado (USD)
                  </td>
                  <td align="right" style="padding:14px 12px;background-color:${BRAND.white};color:${BRAND.primary};font-size:16px;font-weight:800;border-top:2px solid ${BRAND.navy};white-space:nowrap;">
                    ${escapeHtml(totalFormatted)}
                  </td>
                </tr>
              </table>

              <!-- SHIPPING -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:${BRAND.panel};border:1px solid ${BRAND.border};margin:0 0 24px;">
                <tr>
                  <td style="padding:16px 18px;font-family:Arial,Helvetica,sans-serif;">
                    ${shippingBlock}
                  </td>
                </tr>
              </table>

              <!-- CTA -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 8px;">
                <tr>
                  <td align="center" bgcolor="${BRAND.primary}" style="background-color:${BRAND.primary};border-radius:8px;">
                    <!--[if mso]>
                    <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" href="${DASHBOARD_ORDERS_URL}" style="height:44px;v-text-anchor:middle;width:220px;" arcsize="12%" stroke="f" fillcolor="${BRAND.primary}">
                      <w:anchorlock/>
                      <center style="color:#ffffff;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;">Ver mi Pedido</center>
                    </v:roundrect>
                    <![endif]-->
                    <!--[if !mso]><!-- -->
                    <a href="${DASHBOARD_ORDERS_URL}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:${BRAND.white};text-decoration:none;border-radius:8px;background-color:${BRAND.primary};">
                      Ver mi Pedido
                    </a>
                    <!--<![endif]-->
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:${BRAND.muted};">
                También puedes abrir: <a href="${DASHBOARD_ORDERS_URL}" style="color:${BRAND.primary};">${DASHBOARD_ORDERS_URL}</a>
              </p>
              <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:1.5;color:${BRAND.muted};text-align:center;">
                El PDF del resumen de tu pedido está adjunto a este correo.
              </p>
            </td>
          </tr>

          <!-- FOOTER -->
          <tr>
            <td style="padding:24px;background-color:${BRAND.navy};font-family:Arial,Helvetica,sans-serif;color:${BRAND.white};">
              <p style="margin:0 0 10px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#93C5FD;">
                Atención a Clientes / Soporte
              </p>
              <p style="margin:0 0 6px;font-size:13px;line-height:1.5;color:${BRAND.white};">
                <a href="mailto:${INTERNAL_SALES_EMAIL}" style="color:#BFDBFE;text-decoration:none;">${INTERNAL_SALES_EMAIL}</a>
                &nbsp;|&nbsp;
                <a href="mailto:${SUPPORT_EMAIL}" style="color:#BFDBFE;text-decoration:none;">${SUPPORT_EMAIL}</a>
              </p>
              <p style="margin:0 0 6px;font-size:13px;line-height:1.5;color:${BRAND.white};">
                Teléfonos: +1 (956) 400-3683 / +52 (899) 923-1320
              </p>
              <p style="margin:0 0 6px;font-size:13px;line-height:1.5;color:#CBD5E1;">
                Priv. San Rafael, Parque Moll Industrial, C.P. 88756, Reynosa, Tamps.
              </p>
              <p style="margin:0 0 16px;font-size:13px;line-height:1.5;">
                <a href="https://www.plastipacusa.com" style="color:#93C5FD;text-decoration:underline;">www.plastipacusa.com</a>
              </p>
              <p style="margin:0;padding-top:14px;border-top:1px solid rgba(255,255,255,0.18);font-size:11px;line-height:1.55;color:#94A3B8;">
                Este es un correo automático de confirmación de compra enviado por Plastipac USA.
                Si tienes alguna duda con tu pedido, responde directamente a este correo o contacta a nuestro equipo de ventas.
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
    `Hola ${safeName},`,
    "",
    "Confirmación de Pedido — Plastipac USA",
    "Hemos recibido tu pedido y se encuentra en proceso de preparación.",
    "",
    `Número de Orden: #${orderId}`,
    `Fecha de Compra: ${purchaseDate}`,
    payload.customerCompany ? `Empresa: ${payload.customerCompany}` : null,
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
    payload.shippingAddressSummary
      ? `Dirección de entrega: ${payload.shippingAddressSummary}`
      : null,
    "",
    `Ver mi Pedido: ${DASHBOARD_ORDERS_URL}`,
    "",
    "Atención a Clientes / Soporte:",
    `${INTERNAL_SALES_EMAIL} | ${SUPPORT_EMAIL}`,
    "Teléfonos: +1 (956) 400-3683 / +52 (899) 923-1320",
    "Priv. San Rafael, Parque Moll Industrial, C.P. 88756, Reynosa, Tamps.",
    "www.plastipacusa.com",
    "",
    "Este es un correo automático de confirmación de compra enviado por Plastipac USA. Si tienes alguna duda con tu pedido, responde directamente a este correo o contacta a nuestro equipo de ventas.",
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
