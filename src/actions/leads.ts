"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/actions/auth";
import { parseLeadsCsv } from "@/lib/campaigns/csv";
import { mapLeadRow } from "@/lib/campaigns/map";
import type { LeadImportRow, LeadRecord, LeadStatus } from "@/lib/campaigns/types";
import { createServiceRoleClient, isServiceRoleConfigured } from "@/lib/supabase/admin";
import { createServerClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.profile.role !== "admin") return null;
  return currentUser;
}

async function adminDb() {
  if (isServiceRoleConfigured()) return createServiceRoleClient();
  return createServerClient();
}

function normalizeEmail(email: string): string {
  return String(email || "").trim().toLowerCase();
}

function normalizeTags(tags: string[] | undefined): string[] {
  return Array.from(
    new Set(
      (tags || [])
        .map((tag) => String(tag || "").trim().toLowerCase())
        .filter(Boolean)
    )
  );
}

export async function listLeads(input?: {
  q?: string;
  tag?: string;
  subscribedOnly?: boolean;
  limit?: number;
}): Promise<LeadRecord[]> {
  const admin = await requireAdmin();
  if (!admin) return [];

  const db = await adminDb();
  let query = db
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(Math.min(Math.max(input?.limit || 500, 1), 2000));

  if (input?.subscribedOnly) {
    query = query.eq("subscribed", true);
  }
  if (input?.tag) {
    query = query.contains("tags", [input.tag.trim().toLowerCase()]);
  }
  if (input?.q?.trim()) {
    const q = `%${input.q.trim()}%`;
    query = query.or(
      `email.ilike.${q},company_name.ilike.${q},contact_name.ilike.${q},phone.ilike.${q}`
    );
  }

  const { data, error } = await query;
  if (error) {
    console.error("[leads] listLeads:", error.message);
    return [];
  }
  return (data || []).map((row) => mapLeadRow(row as Record<string, unknown>));
}

export async function listLeadTags(): Promise<string[]> {
  const leads = await listLeads({ limit: 2000 });
  return Array.from(new Set(leads.flatMap((lead) => lead.tags))).sort();
}

export async function upsertLead(
  input: LeadImportRow & { status?: LeadStatus; subscribed?: boolean; externalId?: string | null }
): Promise<{ success: boolean; lead?: LeadRecord; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { success: false, error: "Unauthorized." };

  const email = normalizeEmail(input.email);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { success: false, error: "Valid email is required." };
  }

  const db = await adminDb();
  const payload = {
    email,
    company_name: String(input.companyName || "").trim(),
    contact_name: String(input.contactName || "").trim(),
    phone: String(input.phone || "").trim(),
    zip_code: String(input.zipCode || "").trim(),
    source: input.source || "manual",
    tags: normalizeTags(input.tags),
    status: input.status || "new",
    subscribed: input.subscribed !== false,
    external_id: input.externalId || null,
    updated_at: new Date().toISOString(),
  };

  const { data: existing } = await db
    .from("leads")
    .select("id, tags, subscribed")
    .ilike("email", email)
    .maybeSingle();

  if (existing?.id) {
    const mergedTags = normalizeTags([
      ...((existing.tags as string[]) || []),
      ...payload.tags,
    ]);
    const { data, error } = await db
      .from("leads")
      .update({
        ...payload,
        tags: mergedTags,
        // Never re-subscribe someone who already opted out via upsert.
        subscribed: existing.subscribed === false ? false : payload.subscribed,
      })
      .eq("id", existing.id)
      .select("*")
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, lead: mapLeadRow(data as Record<string, unknown>) };
  }

  const { data, error } = await db.from("leads").insert(payload).select("*").single();
  if (error) return { success: false, error: error.message };
  return { success: true, lead: mapLeadRow(data as Record<string, unknown>) };
}

/** Service-role safe upsert for Facebook webhook (no admin session). */
export async function upsertLeadFromWebhook(
  input: LeadImportRow & { externalId?: string | null; metadata?: Record<string, unknown> }
): Promise<{ success: boolean; lead?: LeadRecord; error?: string }> {
  if (!isServiceRoleConfigured()) {
    return { success: false, error: "Service role is not configured." };
  }
  const db = createServiceRoleClient();
  const email = normalizeEmail(input.email);
  if (!email) return { success: false, error: "Email required." };

  const payload = {
    email,
    company_name: String(input.companyName || "").trim(),
    contact_name: String(input.contactName || "").trim(),
    phone: String(input.phone || "").trim(),
    zip_code: String(input.zipCode || "").trim(),
    source: input.source || "facebook",
    tags: normalizeTags([...(input.tags || []), "facebook"]),
    status: "new" as const,
    subscribed: true,
    external_id: input.externalId || null,
    metadata: input.metadata || {},
    updated_at: new Date().toISOString(),
  };

  if (input.externalId) {
    const { data: byExternal } = await db
      .from("leads")
      .select("id, tags, subscribed")
      .eq("external_id", input.externalId)
      .maybeSingle();
    if (byExternal?.id) {
      const { data, error } = await db
        .from("leads")
        .update({
          ...payload,
          tags: normalizeTags([...(byExternal.tags as string[] || []), ...payload.tags]),
          subscribed: byExternal.subscribed === false ? false : true,
        })
        .eq("id", byExternal.id)
        .select("*")
        .single();
      if (error) return { success: false, error: error.message };
      return { success: true, lead: mapLeadRow(data as Record<string, unknown>) };
    }
  }

  const { data: existing } = await db
    .from("leads")
    .select("id, tags, subscribed")
    .ilike("email", email)
    .maybeSingle();

  if (existing?.id) {
    const { data, error } = await db
      .from("leads")
      .update({
        ...payload,
        tags: normalizeTags([...(existing.tags as string[] || []), ...payload.tags]),
        subscribed: existing.subscribed === false ? false : true,
      })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) return { success: false, error: error.message };
    return { success: true, lead: mapLeadRow(data as Record<string, unknown>) };
  }

  const { data, error } = await db.from("leads").insert(payload).select("*").single();
  if (error) return { success: false, error: error.message };
  return { success: true, lead: mapLeadRow(data as Record<string, unknown>) };
}

export async function createManualLead(input: {
  email: string;
  companyName?: string;
  contactName?: string;
  phone?: string;
  zipCode?: string;
  tags?: string[];
}): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { success: false, error: "Unauthorized." };

  const result = await upsertLead({
    ...input,
    source: "manual",
  });
  if (!result.success) return { success: false, error: result.error };
  revalidatePath("/admin/tools/leads");
  return { success: true };
}

export async function importLeadsCsv(
  csvText: string,
  defaultTags: string[] = []
): Promise<{ success: boolean; imported: number; updated: number; errors: string[] }> {
  const admin = await requireAdmin();
  if (!admin) {
    return { success: false, imported: 0, updated: 0, errors: ["Unauthorized."] };
  }

  const parsed = parseLeadsCsv(csvText);
  if (parsed.rows.length === 0) {
    return {
      success: false,
      imported: 0,
      updated: 0,
      errors: parsed.errors.length ? parsed.errors : ["No valid rows found."],
    };
  }

  const db = await adminDb();
  let imported = 0;
  let updated = 0;
  const errors = [...parsed.errors];

  for (const row of parsed.rows) {
    const email = normalizeEmail(row.email);
    const { data: existing } = await db
      .from("leads")
      .select("id")
      .ilike("email", email)
      .maybeSingle();

    const result = await upsertLead({
      ...row,
      tags: normalizeTags([...(row.tags || []), ...defaultTags]),
      source: "csv",
    });

    if (!result.success) {
      errors.push(`${email}: ${result.error || "failed"}`);
      continue;
    }
    if (existing?.id) updated += 1;
    else imported += 1;
  }

  revalidatePath("/admin/tools/leads");
  return {
    success: errors.length < parsed.rows.length,
    imported,
    updated,
    errors: errors.slice(0, 50),
  };
}

export async function updateLeadStatus(input: {
  id: string;
  status?: LeadStatus;
  subscribed?: boolean;
  tags?: string[];
}): Promise<{ success: boolean; error?: string }> {
  const admin = await requireAdmin();
  if (!admin) return { success: false, error: "Unauthorized." };

  const db = await adminDb();
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (input.status) patch.status = input.status;
  if (typeof input.subscribed === "boolean") patch.subscribed = input.subscribed;
  if (input.tags) patch.tags = normalizeTags(input.tags);

  const { error } = await db.from("leads").update(patch).eq("id", input.id);
  if (error) return { success: false, error: error.message };
  revalidatePath("/admin/tools/leads");
  return { success: true };
}

export async function unsubscribeByToken(
  token: string
): Promise<{ success: boolean; already?: boolean; error?: string }> {
  const clean = String(token || "").trim();
  if (!clean) return { success: false, error: "Missing unsubscribe token." };
  if (!isServiceRoleConfigured()) {
    return { success: false, error: "Service unavailable." };
  }

  const db = createServiceRoleClient();
  const now = new Date().toISOString();

  const { data: lead } = await db
    .from("leads")
    .select("id, subscribed")
    .eq("unsubscribe_token", clean)
    .maybeSingle();

  if (lead?.id) {
    if (lead.subscribed === false) return { success: true, already: true };
    const { error } = await db
      .from("leads")
      .update({ subscribed: false, updated_at: now })
      .eq("id", lead.id);
    if (error) return { success: false, error: error.message };

    await db
      .from("campaign_sends")
      .update({ unsubscribed_at: now, updated_at: now })
      .eq("lead_id", lead.id)
      .is("unsubscribed_at", null);

    return { success: true };
  }

  const { data: send } = await db
    .from("campaign_sends")
    .select("id, lead_id, campaign_id, email, unsubscribed_at")
    .eq("unsubscribe_token", clean)
    .maybeSingle();

  if (!send?.id) return { success: false, error: "Invalid or expired unsubscribe link." };
  if (send.unsubscribed_at) return { success: true, already: true };

  await db
    .from("campaign_sends")
    .update({ unsubscribed_at: now, updated_at: now })
    .eq("id", send.id);

  if (send.lead_id) {
    await db
      .from("leads")
      .update({ subscribed: false, updated_at: now })
      .eq("id", send.lead_id);
  } else if (send.email) {
    await db
      .from("leads")
      .update({ subscribed: false, updated_at: now })
      .ilike("email", String(send.email));
  }

  if (send.campaign_id) {
    const { data: campaign } = await db
      .from("campaigns")
      .select("unsubscribe_count")
      .eq("id", send.campaign_id)
      .maybeSingle();
    await db
      .from("campaigns")
      .update({
        unsubscribe_count: Number(campaign?.unsubscribe_count || 0) + 1,
        updated_at: now,
      })
      .eq("id", send.campaign_id);
  }

  return { success: true };
}
