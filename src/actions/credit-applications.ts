"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/actions/auth";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  createServiceRoleClient,
  isServiceRoleConfigured,
} from "@/lib/supabase/admin";
import {
  notifyAdminCreditApplication,
  notifyApplicantCreditApplicationReceived,
  notifyCreditApplicationStatusChange,
} from "@/lib/email";
import { PRIMARY_PHONE_DISPLAY } from "@/lib/company-contact";
import {
  inferCreditApplicationErrorField,
  validateCreditApplicationIdentityFields,
  type CreditApplicationErrorField,
} from "@/lib/credit-application-validation";
import { requireTurnstileToken } from "@/lib/turnstile";
import { formatUsAddress } from "@/lib/us-states";

export type CreditApplicationStatus = "pending" | "approved" | "rejected";

export type PaymentTermsOption = "Net 15" | "Net 30" | "Net 45" | "Other";

export type BusinessTypeOption =
  | "Corporation"
  | "LLC"
  | "Partnership"
  | "Sole Proprietorship";

export interface TradeReferenceInput {
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  creditTerms: string;
}

export interface CommercialCreditApplicationInput {
  creditLimitRequested: string;
  paymentTermsRequested: PaymentTermsOption | string;
  legalBusinessName: string;
  dbaName?: string;
  taxIdEin: string;
  yearsInBusiness?: string;
  businessStreet: string;
  businessCity: string;
  businessState: string;
  businessZip: string;
  billingSameAsBusiness: boolean;
  billingStreet?: string;
  billingCity?: string;
  billingState?: string;
  billingZip?: string;
  phone: string;
  email: string;
  website?: string;
  businessType: BusinessTypeOption | string;
  apContactName: string;
  apPhone: string;
  apEmail: string;
  purchasingContactName?: string;
  purchasingPhone?: string;
  purchasingEmail?: string;
  references: [TradeReferenceInput, TradeReferenceInput, TradeReferenceInput];
  bankName?: string;
  bankContactPerson?: string;
  bankPhone?: string;
  authorizedRepresentativeName: string;
  title: string;
  eSignature: string;
  turnstileToken?: string;
}

/** Legacy short-form (dashboard) still supported. */
export interface CreditApplicationInput {
  companyName: string;
  contactName: string;
  workEmail: string;
  phone: string;
  taxIdEin: string;
  billingAddress?: string;
  shippingAddress?: string;
  country?: string;
  annualVolume?: string;
  desiredCreditLimit?: string;
  creditReference1?: string;
  creditReference2?: string;
  creditReference3?: string;
  notes?: string;
}

export interface CreditApplicationResult {
  success: boolean;
  message?: string;
  error?: string;
  /** Which form control failed, when known. */
  field?: CreditApplicationErrorField;
}

export interface AdminCreditApplication {
  id: string;
  userId: string | null;
  companyName: string;
  contactName: string;
  workEmail: string;
  phone: string;
  taxIdEin: string;
  billingAddress: string | null;
  shippingAddress: string | null;
  annualVolume: string | null;
  creditReference1: string | null;
  creditReference2: string | null;
  creditReference3: string | null;
  notes: string | null;
  status: CreditApplicationStatus;
  createdAt: string;
  reviewedAt: string | null;
  applicationDate: string | null;
  creditLimitRequested: number | null;
  paymentTermsRequested: string | null;
  legalBusinessName: string | null;
  dbaName: string | null;
  yearsInBusiness: number | null;
  businessStreet: string | null;
  businessCity: string | null;
  businessState: string | null;
  businessZip: string | null;
  billingSameAsBusiness: boolean;
  billingStreet: string | null;
  billingCity: string | null;
  billingState: string | null;
  billingZip: string | null;
  website: string | null;
  businessType: string | null;
  apContactName: string | null;
  apPhone: string | null;
  apEmail: string | null;
  purchasingContactName: string | null;
  purchasingPhone: string | null;
  purchasingEmail: string | null;
  ref1CompanyName: string | null;
  ref1ContactPerson: string | null;
  ref1Phone: string | null;
  ref1Email: string | null;
  ref1CreditTerms: string | null;
  ref2CompanyName: string | null;
  ref2ContactPerson: string | null;
  ref2Phone: string | null;
  ref2Email: string | null;
  ref2CreditTerms: string | null;
  ref3CompanyName: string | null;
  ref3ContactPerson: string | null;
  ref3Phone: string | null;
  ref3Email: string | null;
  ref3CreditTerms: string | null;
  bankName: string | null;
  bankContactPerson: string | null;
  bankPhone: string | null;
  authorizedRepresentativeName: string | null;
  authorizedTitle: string | null;
  eSignature: string | null;
  signatureDate: string | null;
  approvedCreditLimit: number | null;
  approvedPaymentTerms: string | null;
  approvalDate: string | null;
  adminComments: string | null;
  reviewedBy: string | null;
}

function normalizeStatus(value: unknown): CreditApplicationStatus {
  const raw = String(value || "pending").toLowerCase();
  if (raw === "approved" || raw === "rejected") return raw;
  return "pending";
}

function str(value: unknown): string {
  return String(value ?? "").trim();
}

function numOrNull(value: unknown): number | null {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function requireAdmin() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.profile.role !== "admin") return null;
  return currentUser;
}

async function getAdminCreditDbClient() {
  if (isServiceRoleConfigured()) return createServiceRoleClient();
  return createServerClient();
}

function mapCreditApplicationRow(row: Record<string, unknown>): AdminCreditApplication {
  return {
    id: String(row.id),
    userId: row.user_id ? String(row.user_id) : null,
    companyName: str(row.company_name || row.legal_business_name),
    contactName: str(row.contact_name || row.authorized_representative_name || row.ap_contact_name),
    workEmail: str(row.work_email || row.ap_email),
    phone: str(row.phone || row.ap_phone),
    taxIdEin: str(row.tax_id_ein),
    billingAddress: (row.billing_address as string | null) || null,
    shippingAddress: (row.shipping_address as string | null) || null,
    annualVolume: (row.annual_volume as string | null) || null,
    creditReference1: (row.credit_reference_1 as string | null) || null,
    creditReference2: (row.credit_reference_2 as string | null) || null,
    creditReference3: (row.credit_reference_3 as string | null) || null,
    notes: (row.notes as string | null) || null,
    status: normalizeStatus(row.status),
    createdAt: String(row.created_at || new Date().toISOString()),
    reviewedAt: (row.reviewed_at as string | null) || null,
    applicationDate: row.application_date ? String(row.application_date) : null,
    creditLimitRequested: numOrNull(row.credit_limit_requested),
    paymentTermsRequested: (row.payment_terms_requested as string | null) || null,
    legalBusinessName: (row.legal_business_name as string | null) || null,
    dbaName: (row.dba_name as string | null) || null,
    yearsInBusiness: numOrNull(row.years_in_business),
    businessStreet: (row.business_street as string | null) || null,
    businessCity: (row.business_city as string | null) || null,
    businessState: (row.business_state as string | null) || null,
    businessZip: (row.business_zip as string | null) || null,
    billingSameAsBusiness: Boolean(row.billing_same_as_business ?? true),
    billingStreet: (row.billing_street as string | null) || null,
    billingCity: (row.billing_city as string | null) || null,
    billingState: (row.billing_state as string | null) || null,
    billingZip: (row.billing_zip as string | null) || null,
    website: (row.website as string | null) || null,
    businessType: (row.business_type as string | null) || null,
    apContactName: (row.ap_contact_name as string | null) || null,
    apPhone: (row.ap_phone as string | null) || null,
    apEmail: (row.ap_email as string | null) || null,
    purchasingContactName: (row.purchasing_contact_name as string | null) || null,
    purchasingPhone: (row.purchasing_phone as string | null) || null,
    purchasingEmail: (row.purchasing_email as string | null) || null,
    ref1CompanyName: (row.ref1_company_name as string | null) || null,
    ref1ContactPerson: (row.ref1_contact_person as string | null) || null,
    ref1Phone: (row.ref1_phone as string | null) || null,
    ref1Email: (row.ref1_email as string | null) || null,
    ref1CreditTerms: (row.ref1_credit_terms as string | null) || null,
    ref2CompanyName: (row.ref2_company_name as string | null) || null,
    ref2ContactPerson: (row.ref2_contact_person as string | null) || null,
    ref2Phone: (row.ref2_phone as string | null) || null,
    ref2Email: (row.ref2_email as string | null) || null,
    ref2CreditTerms: (row.ref2_credit_terms as string | null) || null,
    ref3CompanyName: (row.ref3_company_name as string | null) || null,
    ref3ContactPerson: (row.ref3_contact_person as string | null) || null,
    ref3Phone: (row.ref3_phone as string | null) || null,
    ref3Email: (row.ref3_email as string | null) || null,
    ref3CreditTerms: (row.ref3_credit_terms as string | null) || null,
    bankName: (row.bank_name as string | null) || null,
    bankContactPerson: (row.bank_contact_person as string | null) || null,
    bankPhone: (row.bank_phone as string | null) || null,
    authorizedRepresentativeName: (row.authorized_representative_name as string | null) || null,
    authorizedTitle: (row.authorized_title as string | null) || null,
    eSignature: (row.e_signature as string | null) || null,
    signatureDate: row.signature_date ? String(row.signature_date) : null,
    approvedCreditLimit: numOrNull(row.approved_credit_limit),
    approvedPaymentTerms: (row.approved_payment_terms as string | null) || null,
    approvalDate: row.approval_date ? String(row.approval_date) : null,
    adminComments: (row.admin_comments as string | null) || null,
    reviewedBy: row.reviewed_by ? String(row.reviewed_by) : null,
  };
}

function todayIsoDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export async function submitCommercialCreditApplication(
  input: CommercialCreditApplicationInput
): Promise<CreditApplicationResult> {
  const currentUser = await getCurrentUser();
  if (!currentUser?.user?.id) {
    return {
      success: false,
      error: "Please sign in to your B2B account before submitting a credit application.",
      field: "form",
    };
  }
  const applicantUserId = currentUser.user.id;

  const turnstileError = await requireTurnstileToken(input.turnstileToken);
  if (turnstileError) {
    return { success: false, error: turnstileError, field: "turnstile" };
  }

  const legalBusinessName = str(input.legalBusinessName);
  const taxIdEin = str(input.taxIdEin);
  const phone = str(input.phone);
  const email = str(input.email).toLowerCase();
  const businessStreet = str(input.businessStreet);
  const businessCity = str(input.businessCity);
  const businessState = str(input.businessState);
  const businessZip = str(input.businessZip);
  const apContactName = str(input.apContactName);
  const apPhone = str(input.apPhone);
  const apEmail = str(input.apEmail).toLowerCase();
  const authorizedRepresentativeName = str(input.authorizedRepresentativeName);
  const title = str(input.title);
  const eSignature = str(input.eSignature);
  const creditLimitRequested = Number(
    String(input.creditLimitRequested || "").replace(/[$,\s]/g, "")
  );
  const paymentTermsRequested = str(input.paymentTermsRequested) || "Net 30";
  const businessType = str(input.businessType);
  const refs = input.references || [];

  if (!legalBusinessName) {
    return {
      success: false,
      field: "legalBusinessName",
      error: "Please enter the legal business name.",
    };
  }
  if (!taxIdEin) {
    return { success: false, field: "taxIdEin", error: "Please enter your Tax ID / EIN." };
  }
  if (!email) {
    return { success: false, field: "email", error: "Please enter a corporate email address." };
  }
  if (!phone) {
    return { success: false, field: "phone", error: "Please enter a phone number." };
  }

  const identity = validateCreditApplicationIdentityFields({
    email,
    apEmail,
    taxIdEin,
    website: str(input.website),
  });
  if (!identity.ok) {
    return {
      success: false,
      error: identity.error,
      field: identity.field || inferCreditApplicationErrorField(identity.error),
    };
  }
  const normalizedTaxIdEin = identity.normalizedEin || taxIdEin;

  if (!businessStreet) {
    return { success: false, field: "businessStreet", error: "Please enter the business street address." };
  }
  if (!businessCity) {
    return { success: false, field: "businessCity", error: "Please enter the business city." };
  }
  if (!businessState) {
    return { success: false, field: "businessState", error: "Please select the business state." };
  }
  if (!businessZip) {
    return { success: false, field: "businessZip", error: "Please enter the business ZIP code." };
  }
  if (!businessType) {
    return { success: false, field: "businessType", error: "Please select a business type." };
  }
  if (!apContactName) {
    return {
      success: false,
      field: "apContactName",
      error: "Please enter the Accounts Payable contact name.",
    };
  }
  if (!apPhone) {
    return {
      success: false,
      field: "apPhone",
      error: "Please enter the Accounts Payable phone number.",
    };
  }
  if (!apEmail) {
    return {
      success: false,
      field: "apEmail",
      error: "Please enter the Accounts Payable email address.",
    };
  }
  if (!Number.isFinite(creditLimitRequested) || creditLimitRequested <= 0) {
    return {
      success: false,
      field: "creditLimitRequested",
      error: "Please enter a valid credit limit requested (USD).",
    };
  }
  for (let i = 0; i < 3; i += 1) {
    const ref = refs[i];
    const n = (i + 1) as 1 | 2 | 3;
    if (!ref || !str(ref.companyName)) {
      return {
        success: false,
        field: `ref${n}CompanyName` as CreditApplicationErrorField,
        error: `Please enter company name for Commercial Reference #${n}.`,
      };
    }
    if (!str(ref.contactPerson)) {
      return {
        success: false,
        field: `ref${n}ContactPerson` as CreditApplicationErrorField,
        error: `Please enter contact person for Commercial Reference #${n}.`,
      };
    }
    if (!str(ref.phone)) {
      return {
        success: false,
        field: `ref${n}Phone` as CreditApplicationErrorField,
        error: `Please enter phone for Commercial Reference #${n}.`,
      };
    }
  }
  if (!authorizedRepresentativeName) {
    return {
      success: false,
      field: "authorizedRepresentativeName",
      error: "Please enter the authorized representative name.",
    };
  }
  if (!title) {
    return { success: false, field: "title", error: "Please enter the representative title." };
  }
  if (!eSignature) {
    return { success: false, field: "eSignature", error: "Please type your full legal name as e-signature." };
  }

  if (!isSupabaseConfigured) {
    return {
      success: false,
      error: `Credit applications are temporarily unavailable. Please call ${PRIMARY_PHONE_DISPLAY}.`,
    };
  }

  const billingSame = Boolean(input.billingSameAsBusiness);
  const billingStreet = billingSame ? businessStreet : str(input.billingStreet);
  const billingCity = billingSame ? businessCity : str(input.billingCity);
  const billingState = billingSame ? businessState : str(input.billingState);
  const billingZip = billingSame ? businessZip : str(input.billingZip);

  if (!billingSame && !billingStreet) {
    return { success: false, field: "billingStreet", error: "Please enter the billing street address." };
  }
  if (!billingSame && !billingCity) {
    return { success: false, field: "billingCity", error: "Please enter the billing city." };
  }
  if (!billingSame && !billingState) {
    return { success: false, field: "billingState", error: "Please select the billing state." };
  }
  if (!billingSame && !billingZip) {
    return { success: false, field: "billingZip", error: "Please enter the billing ZIP code." };
  }

  const businessAddress = formatUsAddress({
    street: businessStreet,
    city: businessCity,
    state: businessState,
    zip: businessZip,
    country: "United States",
  });
  const billingAddress = formatUsAddress({
    street: billingStreet,
    city: billingCity,
    state: billingState,
    zip: billingZip,
    country: "United States",
  });

  const today = todayIsoDate();

  const payload: Record<string, unknown> = {
    user_id: applicantUserId,
    application_date: today,
    credit_limit_requested: creditLimitRequested,
    payment_terms_requested: paymentTermsRequested,
    legal_business_name: legalBusinessName,
    company_name: legalBusinessName,
    dba_name: str(input.dbaName) || null,
    tax_id_ein: normalizedTaxIdEin,
    years_in_business: numOrNull(input.yearsInBusiness),
    business_street: businessStreet,
    business_city: businessCity,
    business_state: businessState,
    business_zip: businessZip,
    shipping_address: businessAddress || null,
    billing_same_as_business: billingSame,
    billing_street: billingStreet,
    billing_city: billingCity,
    billing_state: billingState,
    billing_zip: billingZip,
    billing_address: billingAddress || null,
    phone,
    work_email: email,
    website: str(input.website) || null,
    business_type: businessType,
    ap_contact_name: apContactName,
    ap_phone: apPhone,
    ap_email: apEmail,
    purchasing_contact_name: str(input.purchasingContactName) || null,
    purchasing_phone: str(input.purchasingPhone) || null,
    purchasing_email: str(input.purchasingEmail).toLowerCase() || null,
    contact_name: authorizedRepresentativeName || apContactName,
    ref1_company_name: str(refs[0].companyName),
    ref1_contact_person: str(refs[0].contactPerson),
    ref1_phone: str(refs[0].phone),
    ref1_email: str(refs[0].email).toLowerCase() || null,
    ref1_credit_terms: str(refs[0].creditTerms) || null,
    ref2_company_name: str(refs[1].companyName),
    ref2_contact_person: str(refs[1].contactPerson),
    ref2_phone: str(refs[1].phone),
    ref2_email: str(refs[1].email).toLowerCase() || null,
    ref2_credit_terms: str(refs[1].creditTerms) || null,
    ref3_company_name: str(refs[2].companyName),
    ref3_contact_person: str(refs[2].contactPerson),
    ref3_phone: str(refs[2].phone),
    ref3_email: str(refs[2].email).toLowerCase() || null,
    ref3_credit_terms: str(refs[2].creditTerms) || null,
    credit_reference_1: `${str(refs[0].companyName)} · ${str(refs[0].contactPerson)} · ${str(refs[0].phone)}`,
    credit_reference_2: `${str(refs[1].companyName)} · ${str(refs[1].contactPerson)} · ${str(refs[1].phone)}`,
    credit_reference_3: `${str(refs[2].companyName)} · ${str(refs[2].contactPerson)} · ${str(refs[2].phone)}`,
    bank_name: str(input.bankName) || null,
    bank_contact_person: str(input.bankContactPerson) || null,
    bank_phone: str(input.bankPhone) || null,
    authorized_representative_name: authorizedRepresentativeName,
    authorized_title: title,
    e_signature: eSignature,
    signature_date: today,
    status: "pending",
    notes: [
      `Payment terms requested: ${paymentTermsRequested}`,
      `Credit limit requested: $${creditLimitRequested.toFixed(2)}`,
      businessType ? `Business type: ${businessType}` : null,
    ]
      .filter(Boolean)
      .join("\n"),
  };

  try {
    const writeClient = isServiceRoleConfigured()
      ? createServiceRoleClient()
      : await createServerClient();

    const { data: inserted, error } = await writeClient
      .from("credit_applications")
      .insert(payload)
      .select("id")
      .maybeSingle();

    if (error) {
      console.warn("commercial credit insert failed:", error.message);
      return {
        success: false,
        error:
          error.message ||
          "Unable to submit credit application. Please try again or call our sales desk.",
      };
    }

    try {
      const sessionClient = await createServerClient();
      await sessionClient.from("profiles").upsert({
        id: applicantUserId,
        email: currentUser.user.email || email,
        company_name: legalBusinessName,
        phone,
        tax_id: normalizedTaxIdEin,
        credit_application_status: "pending",
      });
    } catch (profileError) {
      console.warn("[credit] profile pending status sync failed:", profileError);
    }

    // Email is best-effort: DB insert already succeeded — always confirm to the user.
    try {
      await notifyAdminCreditApplication({
        applicationId: inserted?.id ? String(inserted.id) : null,
        customerName: authorizedRepresentativeName || apContactName,
        companyName: legalBusinessName,
        legalBusinessName,
        dbaName: str(input.dbaName) || undefined,
        taxIdEin: normalizedTaxIdEin,
        yearsInBusiness: numOrNull(input.yearsInBusiness),
        businessType,
        businessAddress: businessAddress || undefined,
        billingAddress: billingAddress || undefined,
        website: str(input.website) || undefined,
        requestedCreditLimit: creditLimitRequested,
        paymentTermsRequested,
        workEmail: email,
        phone,
        apContactName,
        apPhone,
        apEmail,
        purchasingContactName: str(input.purchasingContactName) || undefined,
        purchasingPhone: str(input.purchasingPhone) || undefined,
        purchasingEmail: str(input.purchasingEmail).toLowerCase() || undefined,
        references: [
          {
            companyName: str(refs[0].companyName),
            contactPerson: str(refs[0].contactPerson),
            phone: str(refs[0].phone),
            email: str(refs[0].email).toLowerCase() || undefined,
            creditTerms: str(refs[0].creditTerms) || undefined,
          },
          {
            companyName: str(refs[1].companyName),
            contactPerson: str(refs[1].contactPerson),
            phone: str(refs[1].phone),
            email: str(refs[1].email).toLowerCase() || undefined,
            creditTerms: str(refs[1].creditTerms) || undefined,
          },
          {
            companyName: str(refs[2].companyName),
            contactPerson: str(refs[2].contactPerson),
            phone: str(refs[2].phone),
            email: str(refs[2].email).toLowerCase() || undefined,
            creditTerms: str(refs[2].creditTerms) || undefined,
          },
        ],
        bankName: str(input.bankName) || undefined,
        bankContactPerson: str(input.bankContactPerson) || undefined,
        bankPhone: str(input.bankPhone) || undefined,
        authorizedRepresentativeName,
        authorizedTitle: title,
        eSignature,
        signatureDate: today,
        userId: applicantUserId,
      });
    } catch (emailError) {
      console.error(
        "[credit] Resend admin dispatch error after successful insert:",
        emailError,
        "applicationId:",
        inserted?.id || "n/a"
      );
    }

    try {
      await notifyApplicantCreditApplicationReceived({
        workEmail: email,
        contactName: authorizedRepresentativeName || apContactName,
        companyName: legalBusinessName,
        requestedCreditLimit: creditLimitRequested,
        paymentTermsRequested,
        applicationId: inserted?.id ? String(inserted.id) : null,
      });
    } catch (receiptError) {
      console.error(
        "[credit] Resend applicant receipt error after successful insert:",
        receiptError,
        "applicationId:",
        inserted?.id || "n/a"
      );
    }

    revalidatePath("/admin/credit-applications");
    revalidatePath("/dashboard/credit");
    revalidatePath("/credit-application");
    if (inserted?.id) {
      revalidatePath(`/admin/credit-applications/${inserted.id}`);
    }

    return {
      success: true,
      message:
        "Form sent successfully. A Plastipac USA credit specialist will review your application.",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("submitCommercialCreditApplication failed:", message);
    return { success: false, error: "Unable to submit credit application. Please try again." };
  }
}

/** Legacy short-form submit used by dashboard Net 30 CTA. */
export async function submitCreditApplication(
  input: CreditApplicationInput
): Promise<CreditApplicationResult> {
  const companyName = str(input.companyName);
  const contactName = str(input.contactName);
  const workEmail = str(input.workEmail).toLowerCase();
  const phone = str(input.phone);
  const taxIdEin = str(input.taxIdEin);
  const desiredCreditLimit = str(input.desiredCreditLimit);

  if (!companyName || !contactName || !workEmail || !phone) {
    return {
      success: false,
      error: "Please provide company name, contact name, email, and phone.",
    };
  }
  if (!taxIdEin) {
    return {
      success: false,
      error: "Please provide a valid Tax ID / EIN (XX-XXXXXXX).",
    };
  }

  return submitCommercialCreditApplication({
    creditLimitRequested: desiredCreditLimit || "10000",
    paymentTermsRequested: "Net 30",
    legalBusinessName: companyName,
    taxIdEin,
    businessStreet: str(input.billingAddress) || "To be provided",
    businessCity: "—",
    businessState: "TX",
    businessZip: "00000",
    billingSameAsBusiness: true,
    phone,
    email: workEmail,
    businessType: "Corporation",
    apContactName: contactName,
    apPhone: phone,
    apEmail: workEmail,
    references: [
      {
        companyName: str(input.creditReference1) || "Pending reference",
        contactPerson: contactName,
        phone,
        email: workEmail,
        creditTerms: "Net 30",
      },
      {
        companyName: str(input.creditReference2) || "Pending reference",
        contactPerson: contactName,
        phone,
        email: workEmail,
        creditTerms: "Net 30",
      },
      {
        companyName: str(input.creditReference3) || "Pending reference",
        contactPerson: contactName,
        phone,
        email: workEmail,
        creditTerms: "Net 30",
      },
    ],
    authorizedRepresentativeName: contactName,
    title: "Authorized Representative",
    eSignature: contactName,
  });
}

export async function getAdminCreditApplications(): Promise<AdminCreditApplication[]> {
  try {
    if (!(await requireAdmin())) return [];
    if (!isSupabaseConfigured) return [];

    const supabase = await getAdminCreditDbClient();
    const { data, error } = await supabase
      .from("credit_applications")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("getAdminCreditApplications failed:", error.message);
      return [];
    }

    return (data || []).map((row) =>
      mapCreditApplicationRow(row as Record<string, unknown>)
    );
  } catch (err) {
    console.warn("getAdminCreditApplications exception:", err);
    return [];
  }
}

export interface ReviewCreditApplicationInput {
  id: string;
  status: Extract<CreditApplicationStatus, "approved" | "rejected">;
  approvedCreditLimit?: string;
  approvedPaymentTerms?: string;
  adminComments?: string;
}

export async function reviewCreditApplication(
  input: ReviewCreditApplicationInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await requireAdmin();
    if (!currentUser) return { success: false, error: "Unauthorized." };
    if (!input.id) return { success: false, error: "Missing application id." };
    if (!isSupabaseConfigured) {
      return { success: false, error: "Database is not configured." };
    }

    const supabase = await getAdminCreditDbClient();
    const { data: application } = await supabase
      .from("credit_applications")
      .select("*")
      .eq("id", input.id)
      .maybeSingle();

    if (!application) {
      return { success: false, error: "Application not found." };
    }

    const approvedLimit = numOrNull(
      String(input.approvedCreditLimit || "").replace(/[$,\s]/g, "")
    );
    const approvedTerms = str(input.approvedPaymentTerms);
    const nowIso = new Date().toISOString();

    const patch: Record<string, unknown> = {
      status: input.status,
      reviewed_at: nowIso,
      reviewed_by: currentUser.user.id,
      admin_comments: str(input.adminComments) || null,
      approval_date: input.status === "approved" ? nowIso : null,
      approved_credit_limit:
        input.status === "approved" ? approvedLimit : null,
      approved_payment_terms:
        input.status === "approved" ? approvedTerms || "Net 30" : null,
    };

    const { error } = await supabase
      .from("credit_applications")
      .update(patch)
      .eq("id", input.id);

    if (error) {
      console.warn("reviewCreditApplication failed:", error.message);
      return { success: false, error: error.message || "Failed to update status." };
    }

    // Sync profile credit fields when approved
    try {
      let profileId = application.user_id as string | null;
      if (!profileId && application.work_email) {
        const { data: byEmail } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", String(application.work_email).toLowerCase())
          .maybeSingle();
        profileId = byEmail?.id || null;
      }
      if (profileId) {
        const profilePatch: Record<string, unknown> = {
          credit_application_status: input.status,
        };
        if (input.status === "approved") {
          const limit = Math.max(0, approvedLimit || 10000);
          const terms = approvedTerms || "Net 30";
          profilePatch.credit_terms = terms;
          profilePatch.payment_terms = terms;
          profilePatch.credit_limit = limit;
          // Fresh approval resets usable balance to the approved limit.
          profilePatch.available_credit = limit;
        } else if (input.status === "rejected") {
          profilePatch.available_credit = 0;
        }
        await supabase.from("profiles").update(profilePatch).eq("id", profileId);
      }
    } catch {
      // non-fatal
    }

    try {
      await notifyCreditApplicationStatusChange({
        companyName: String(
          application.legal_business_name || application.company_name || "Applicant"
        ),
        workEmail: String(application.work_email || application.ap_email || ""),
        status: input.status,
        approvedCreditLimit:
          input.status === "approved" ? approvedLimit ?? undefined : undefined,
        approvedPaymentTerms:
          input.status === "approved" ? approvedTerms || "Net 30" : undefined,
        adminComments: str(input.adminComments) || undefined,
        contactName: String(
          application.authorized_representative_name ||
            application.contact_name ||
            application.ap_contact_name ||
            ""
        ),
      });
    } catch (emailError) {
      console.error("credit status email failed:", emailError);
    }

    revalidatePath("/admin/credit-applications");
    revalidatePath("/admin");
    revalidatePath("/dashboard");
    revalidatePath("/dashboard/credit");
    revalidatePath("/checkout");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn("reviewCreditApplication exception:", message);
    return { success: false, error: "Failed to update status." };
  }
}

/** @deprecated Prefer reviewCreditApplication for office-use fields. */
export async function updateCreditApplicationStatus(
  id: string,
  status: CreditApplicationStatus
): Promise<{ success: boolean; error?: string }> {
  if (status === "pending") {
    return { success: false, error: "Invalid status." };
  }
  return reviewCreditApplication({ id, status });
}

export type MyCreditStatus =
  | "not_applied"
  | "pending"
  | "approved"
  | "rejected";

export interface MyCreditStatusInfo {
  status: MyCreditStatus;
  creditLimit: number;
  creditTerms: string;
  taxId: string;
  applicationId: string | null;
  reviewedAt: string | null;
  applicationDate: string | null;
  requestedCreditLimit: number | null;
  paymentTermsRequested: string | null;
  legalBusinessName: string | null;
}

export async function getMyCreditStatus(): Promise<MyCreditStatusInfo> {
  const empty: MyCreditStatusInfo = {
    status: "not_applied",
    creditLimit: 0,
    creditTerms: "Registered",
    taxId: "",
    applicationId: null,
    reviewedAt: null,
    applicationDate: null,
    requestedCreditLimit: null,
    paymentTermsRequested: null,
    legalBusinessName: null,
  };

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || !isSupabaseConfigured) return empty;

    const supabase = await createServerClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("tax_id, credit_application_status, credit_limit, credit_terms, company_name")
      .eq("id", currentUser.user.id)
      .maybeSingle();

    const { data: application } = await supabase
      .from("credit_applications")
      .select(
        "id, status, reviewed_at, created_at, application_date, credit_limit_requested, payment_terms_requested, legal_business_name, company_name"
      )
      .eq("user_id", currentUser.user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const profileStatus = String(profile?.credit_application_status || "").toLowerCase();
    const appStatus = application ? normalizeStatus(application.status) : null;

    let status: MyCreditStatus = "not_applied";
    if (application) {
      status =
        appStatus === "approved"
          ? "approved"
          : appStatus === "rejected"
            ? "rejected"
            : "pending";
    } else if (profileStatus === "approved") {
      status = "approved";
    } else if (profileStatus === "rejected") {
      status = "rejected";
    } else if (profileStatus === "pending") {
      status = "pending";
    }

    return {
      status,
      creditLimit: Number(profile?.credit_limit || 0),
      creditTerms: String(profile?.credit_terms || "Registered"),
      taxId: String(profile?.tax_id || currentUser.profile.taxId || ""),
      applicationId: application?.id ? String(application.id) : null,
      reviewedAt: application?.reviewed_at ? String(application.reviewed_at) : null,
      applicationDate: application?.application_date
        ? String(application.application_date)
        : application?.created_at
          ? String(application.created_at).slice(0, 10)
          : null,
      requestedCreditLimit:
        application?.credit_limit_requested != null
          ? Number(application.credit_limit_requested)
          : null,
      paymentTermsRequested: application?.payment_terms_requested
        ? String(application.payment_terms_requested)
        : null,
      legalBusinessName: String(
        application?.legal_business_name ||
          application?.company_name ||
          profile?.company_name ||
          currentUser.profile.companyName ||
          ""
      ) || null,
    };
  } catch (err) {
    console.warn("getMyCreditStatus exception:", err);
    return empty;
  }
}
