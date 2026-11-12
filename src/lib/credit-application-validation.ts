/**
 * Shared client + server validation for B2B credit applications.
 * Keep free of server-only imports so the form can import this module.
 */

/** Common free / consumer webmail domains rejected for business credit. */
export const FREE_WEBMAIL_DOMAINS = new Set([
  "aol.com",
  "att.net",
  "comcast.net",
  "facebook.com",
  "fastmail.com",
  "gmx.com",
  "gmx.net",
  "gmail.com",
  "googlemail.com",
  "hey.com",
  "hotmail.co.uk",
  "hotmail.com",
  "hotmail.es",
  "hotmail.fr",
  "icloud.com",
  "inbox.com",
  "live.com",
  "mac.com",
  "mail.com",
  "me.com",
  "msn.com",
  "outlook.co.uk",
  "outlook.com",
  "outlook.es",
  "pm.me",
  "proton.me",
  "protonmail.com",
  "qq.com",
  "rocketmail.com",
  "sbcglobal.net",
  "tutanota.com",
  "verizon.net",
  "yahoo.ca",
  "yahoo.co.uk",
  "yahoo.com",
  "yahoo.com.mx",
  "yahoo.es",
  "yahoo.fr",
  "yandex.com",
  "yandex.ru",
  "zoho.com",
]);

/** US IRS EIN: XX-XXXXXXX or 9 digits. */
export const US_EIN_REGEX = /^(?:\d{2}-\d{7}|\d{9})$/;

const BASIC_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export function extractEmailDomain(email: string): string | null {
  const trimmed = String(email || "").trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at < 1 || at === trimmed.length - 1) return null;
  const domain = trimmed.slice(at + 1).replace(/\.+$/, "");
  return domain.includes(".") ? domain : null;
}

export function isFreeWebmailDomain(domain: string | null | undefined): boolean {
  if (!domain) return false;
  const host = domain.toLowerCase().trim();
  if (FREE_WEBMAIL_DOMAINS.has(host)) return true;
  // Block subdomains of known free webmail hosts (e.g. mail.googlemail.com)
  for (const blocked of FREE_WEBMAIL_DOMAINS) {
    if (host.endsWith(`.${blocked}`)) return true;
  }
  return false;
}

export function isValidCorporateEmail(email: string): {
  ok: boolean;
  error?: string;
  domain?: string;
} {
  const value = String(email || "").trim().toLowerCase();
  if (!value) {
    return { ok: false, error: "Please enter a corporate email address." };
  }
  if (!BASIC_EMAIL_REGEX.test(value)) {
    return { ok: false, error: "Please enter a valid corporate email address." };
  }
  const domain = extractEmailDomain(value);
  if (!domain) {
    return { ok: false, error: "Please enter a valid corporate email address." };
  }
  if (isFreeWebmailDomain(domain)) {
    return {
      ok: false,
      error:
        "Please use a company email address. Free webmail (Gmail, Yahoo, Outlook, Hotmail, etc.) is not accepted.",
      domain,
    };
  }
  return { ok: true, domain };
}

export function normalizeUsEin(value: string): string {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length !== 9) return String(value || "").trim();
  return `${digits.slice(0, 2)}-${digits.slice(2)}`;
}

export function isValidUsEin(value: string): { ok: boolean; error?: string; normalized?: string } {
  const raw = String(value || "").trim();
  if (!raw) {
    return { ok: false, error: "Please enter your Tax ID / EIN." };
  }
  if (!US_EIN_REGEX.test(raw)) {
    return {
      ok: false,
      error: "Tax ID / EIN must be in IRS format XX-XXXXXXX (or 9 digits).",
    };
  }
  return { ok: true, normalized: normalizeUsEin(raw) };
}

export function extractWebsiteHostname(website: string): string | null {
  const raw = String(website || "").trim();
  if (!raw) return null;
  try {
    const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    const url = new URL(withProtocol);
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    return host || null;
  } catch {
    return null;
  }
}

/**
 * Optional authenticity check: when a website is provided, its domain should
 * correlate with the corporate email domain (exact or parent/subdomain).
 */
export function emailMatchesWebsiteDomain(
  email: string,
  website: string
): { ok: boolean; error?: string; skipped?: boolean } {
  const rawWebsite = String(website || "").trim();
  if (!rawWebsite) {
    return { ok: true, skipped: true };
  }

  const siteHost = extractWebsiteHostname(rawWebsite);
  if (!siteHost || !siteHost.includes(".")) {
    return {
      ok: false,
      error: "Please enter a valid company website URL, or leave it blank.",
    };
  }

  const emailDomain = extractEmailDomain(email);
  if (!emailDomain) {
    return { ok: false, error: "Please enter a valid corporate email address." };
  }
  if (
    emailDomain === siteHost ||
    emailDomain.endsWith(`.${siteHost}`) ||
    siteHost.endsWith(`.${emailDomain}`)
  ) {
    return { ok: true };
  }
  return {
    ok: false,
    error: `Website domain (${siteHost}) should match your corporate email domain (${emailDomain}). Leave website blank or use your company site.`,
  };
}

export type CreditApplicationErrorField =
  | "email"
  | "apEmail"
  | "taxIdEin"
  | "website"
  | "creditLimitRequested"
  | "legalBusinessName"
  | "phone"
  | "businessStreet"
  | "businessCity"
  | "businessState"
  | "businessZip"
  | "billingStreet"
  | "billingCity"
  | "billingState"
  | "billingZip"
  | "businessType"
  | "apContactName"
  | "apPhone"
  | "authorizedRepresentativeName"
  | "title"
  | "eSignature"
  | "ref1CompanyName"
  | "ref1ContactPerson"
  | "ref1Phone"
  | "ref2CompanyName"
  | "ref2ContactPerson"
  | "ref2Phone"
  | "ref3CompanyName"
  | "ref3ContactPerson"
  | "ref3Phone"
  | "turnstile"
  | "form";

export const CREDIT_APPLICATION_FIELD_LABELS: Record<CreditApplicationErrorField, string> = {
  email: "Email Address",
  apEmail: "Accounts Payable Email",
  taxIdEin: "Tax ID / EIN",
  website: "Website",
  creditLimitRequested: "Credit Limit Requested",
  legalBusinessName: "Legal Business Name",
  phone: "Phone Number",
  businessStreet: "Business Street",
  businessCity: "Business City",
  businessState: "Business State",
  businessZip: "Business ZIP",
  billingStreet: "Billing Street",
  billingCity: "Billing City",
  billingState: "Billing State",
  billingZip: "Billing ZIP",
  businessType: "Business Type",
  apContactName: "Accounts Payable Name",
  apPhone: "Accounts Payable Phone",
  authorizedRepresentativeName: "Authorized Representative Name",
  title: "Title",
  eSignature: "E-Signature",
  ref1CompanyName: "Commercial Reference #1 — Company",
  ref1ContactPerson: "Commercial Reference #1 — Contact",
  ref1Phone: "Commercial Reference #1 — Phone",
  ref2CompanyName: "Commercial Reference #2 — Company",
  ref2ContactPerson: "Commercial Reference #2 — Contact",
  ref2Phone: "Commercial Reference #2 — Phone",
  ref3CompanyName: "Commercial Reference #3 — Company",
  ref3ContactPerson: "Commercial Reference #3 — Contact",
  ref3Phone: "Commercial Reference #3 — Phone",
  turnstile: "Bot check",
  form: "Form",
};

export interface CreditApplicationFieldValidationInput {
  email: string;
  apEmail: string;
  taxIdEin: string;
  website?: string;
}

export interface CreditApplicationFieldValidationResult {
  ok: boolean;
  error?: string;
  field?: CreditApplicationErrorField;
  normalizedEin?: string;
}

/** Run all anti-spam field rules. First failure wins. */
export function validateCreditApplicationIdentityFields(
  input: CreditApplicationFieldValidationInput
): CreditApplicationFieldValidationResult {
  const emailCheck = isValidCorporateEmail(input.email);
  if (!emailCheck.ok) {
    return { ok: false, field: "email", error: emailCheck.error };
  }

  const apCheck = isValidCorporateEmail(input.apEmail);
  if (!apCheck.ok) {
    return {
      ok: false,
      field: "apEmail",
      error: apCheck.error?.includes("webmail")
        ? "Accounts Payable email must be a company address (not Gmail, Yahoo, Outlook, etc.)."
        : `Accounts Payable email: ${apCheck.error}`,
    };
  }

  const einCheck = isValidUsEin(input.taxIdEin);
  if (!einCheck.ok) {
    return { ok: false, field: "taxIdEin", error: einCheck.error };
  }

  const website = String(input.website || "").trim();
  if (website) {
    const match = emailMatchesWebsiteDomain(input.email, website);
    if (!match.ok) {
      return { ok: false, field: "website", error: match.error };
    }
  }

  return { ok: true, normalizedEin: einCheck.normalized };
}

/** Map server/client error text to the related input when possible. */
export function inferCreditApplicationErrorField(
  message: string | null | undefined
): CreditApplicationErrorField {
  const text = String(message || "").toLowerCase();
  if (!text) return "form";
  if (text.includes("bot check") || text.includes("turnstile")) return "turnstile";
  if (text.includes("tax id") || text.includes("ein")) return "taxIdEin";
  if (text.includes("accounts payable email") || text.includes("ap email")) return "apEmail";
  if (text.includes("website")) return "website";
  if (text.includes("corporate email") || text.includes("email address") || text.includes("webmail")) {
    return "email";
  }
  if (text.includes("credit limit")) return "creditLimitRequested";
  if (text.includes("legal business") || text.includes("business name")) return "legalBusinessName";
  if (text.includes("billing")) {
    if (text.includes("street") || text.includes("address")) return "billingStreet";
    return "billingStreet";
  }
  if (text.includes("business address") || text.includes("full business")) return "businessStreet";
  if (text.includes("business type")) return "businessType";
  if (text.includes("accounts payable")) {
    if (text.includes("phone")) return "apPhone";
    if (text.includes("name") || text.includes("contact")) return "apContactName";
    return "apContactName";
  }
  if (text.includes("phone")) return "phone";
  if (text.includes("authorized") || text.includes("e-signature") || text.includes("signature")) {
    if (text.includes("title")) return "title";
    if (text.includes("signature")) return "eSignature";
    return "authorizedRepresentativeName";
  }
  if (text.includes("reference #1") || text.includes("reference 1")) {
    if (text.includes("phone")) return "ref1Phone";
    if (text.includes("contact")) return "ref1ContactPerson";
    return "ref1CompanyName";
  }
  if (text.includes("reference #2") || text.includes("reference 2")) {
    if (text.includes("phone")) return "ref2Phone";
    if (text.includes("contact")) return "ref2ContactPerson";
    return "ref2CompanyName";
  }
  if (text.includes("reference #3") || text.includes("reference 3")) {
    if (text.includes("phone")) return "ref3Phone";
    if (text.includes("contact")) return "ref3ContactPerson";
    return "ref3CompanyName";
  }
  return "form";
}
