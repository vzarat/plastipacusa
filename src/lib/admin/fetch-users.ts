import {
  createServiceRoleClient,
  isServiceRoleConfigured,
} from "@/lib/supabase/admin";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/server";

export type AdminManagedRole = "client" | "admin";

export interface AdminManagedUser {
  id: string;
  fullName: string;
  email: string;
  companyName: string;
  phone: string;
  role: AdminManagedRole;
  taxId: string;
  hasTaxId: boolean;
  createdAt: string | null;
}

function normalizeRole(value: unknown): AdminManagedRole {
  return String(value || "").toLowerCase() === "admin" ? "admin" : "client";
}

/**
 * Fetch every auth user via Admin API and merge with public.profiles.
 * Auth is the source of truth so incomplete profile rows still appear.
 */
export async function fetchMergedAdminUsers(): Promise<AdminManagedUser[]> {
  if (!isServiceRoleConfigured()) {
    if (!isSupabaseConfigured) return [];
    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, full_name, email, company_name, phone, role, tax_id, created_at"
      )
      .order("created_at", { ascending: false });

    if (error || !data) return [];

    return data.map((row) => {
      const taxId = String(row.tax_id || "").trim();
      return {
        id: String(row.id),
        fullName: String(row.full_name || ""),
        email: String(row.email || ""),
        companyName: String(row.company_name || ""),
        phone: String(row.phone || ""),
        role: normalizeRole(row.role),
        taxId,
        hasTaxId: Boolean(taxId),
        createdAt: row.created_at ? String(row.created_at) : null,
      };
    });
  }

  const admin = createServiceRoleClient();

  const authUsers: Array<{
    id: string;
    email?: string;
    created_at?: string;
    user_metadata?: Record<string, unknown>;
    app_metadata?: Record<string, unknown>;
  }> = [];

  const perPage = 1000;
  let page = 1;
  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage,
    });
    if (error) {
      throw new Error(error.message || "Failed to list auth users.");
    }
    const batch = data?.users || [];
    authUsers.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
    if (page > 50) break;
  }

  const { data: profiles, error: profilesError } = await admin
    .from("profiles")
    .select(
      "id, full_name, email, company_name, phone, role, tax_id, created_at"
    );

  if (profilesError) {
    console.warn(
      "fetchMergedAdminUsers profiles query:",
      profilesError.message
    );
  }

  const profileById = new Map<string, Record<string, unknown>>();
  for (const row of profiles || []) {
    profileById.set(
      String((row as { id: string }).id),
      row as Record<string, unknown>
    );
  }

  const merged: AdminManagedUser[] = authUsers.map((authUser) => {
    const profile = profileById.get(authUser.id);
    const meta = authUser.user_metadata || {};
    const taxId = String(profile?.tax_id || "").trim();
    const roleFromProfile = profile?.role;
    const roleFromMeta = meta.role ?? authUser.app_metadata?.role;

    return {
      id: authUser.id,
      email: String(
        authUser.email || profile?.email || meta.email || ""
      ).trim(),
      fullName: String(
        profile?.full_name || meta.full_name || meta.fullName || ""
      ).trim(),
      companyName: String(
        profile?.company_name || meta.company_name || meta.companyName || ""
      ).trim(),
      phone: String(profile?.phone || meta.phone || "").trim(),
      role: normalizeRole(roleFromProfile ?? roleFromMeta),
      taxId,
      hasTaxId: Boolean(taxId),
      createdAt: authUser.created_at
        ? String(authUser.created_at)
        : profile?.created_at
          ? String(profile.created_at)
          : null,
    };
  });

  for (const [id, profile] of profileById) {
    if (merged.some((u) => u.id === id)) continue;
    const taxId = String(profile.tax_id || "").trim();
    merged.push({
      id,
      email: String(profile.email || "").trim(),
      fullName: String(profile.full_name || "").trim(),
      companyName: String(profile.company_name || "").trim(),
      phone: String(profile.phone || "").trim(),
      role: normalizeRole(profile.role),
      taxId,
      hasTaxId: Boolean(taxId),
      createdAt: profile.created_at ? String(profile.created_at) : null,
    });
  }

  merged.sort((a, b) => {
    const ta = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const tb = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return tb - ta;
  });

  return merged;
}
