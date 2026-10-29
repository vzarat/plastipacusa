/** Order receipts, checkout confirmations, and order alerts. */
export const ORDERS_EMAIL = "orders@plastipacusa.com";

/** Registration, contact forms, help, and account recovery. */
export const SUPPORT_EMAIL = "support@plastipacusa.com";

/** Footer, proposals, company metadata, and the default Resend sender. */
export const CONTACT_EMAIL = "contact@plastipacusa.com";

export const ORDERS_FROM = `Plastipac USA <${ORDERS_EMAIL}>`;
export const SUPPORT_FROM = `Plastipac USA <${SUPPORT_EMAIL}>`;
export const CONTACT_FROM = `Plastipac USA <${CONTACT_EMAIL}>`;

export function mailboxRecipients(...emails: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      emails
        .map((email) => String(email || "").trim().toLowerCase())
        .filter(Boolean)
    )
  );
}
