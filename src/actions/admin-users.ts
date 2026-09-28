"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/actions/auth";
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

async function requireAdmin() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.profile.role !== "admin") {
    return null;
  }
  return currentUser;
}

function normalizeRole(value: unknown): AdminManagedRole {
  return String(value || "").toLowerCase() === "admin" ? "admin" : "client";
}

function mapProfileRow(row: Record<string, unknown>): AdminManagedUser {
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
}

export async function getAdminManagedUsers(): Promise<AdminManagedUser[]> {
  try {
    if (!(await requireAdmin()) || !isSupabaseConfigured) {
      return [];
    }

    const supabase = await createServerClient();
    const { data, error } = await supabase
      .from("profiles")
      .select(
        "id, full_name, email, company_name, phone, role, tax_id, created_at"
      )
      .order("created_at", { ascending: false });

    if (error) {
      console.warn("getAdminManagedUsers failed:", error.message);
      return [];
    }

    return (data || []).map((row) =>
      mapProfileRow(row as Record<string, unknown>)
    );
  } catch (err) {
    console.warn("getAdminManagedUsers exception:", err);
    return [];
  }
}

export async function updateAdminManagedUserProfile(input: {
  userId: string;
  fullName: string;
  companyName: string;
  phone: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (!(await requireAdmin())) {
      return { success: false, error: "Unauthorized." };
    }

    const userId = String(input.userId || "").trim();
    if (!userId) {
      return { success: false, error: "Missing user id." };
    }

    const fullName = String(input.fullName || "").trim();
    const companyName = String(input.companyName || "").trim();
    const phone = String(input.phone || "").trim();

    if (!fullName) {
      return { success: false, error: "Full name is required." };
    }

    const supabase = await createServerClient();
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName,
        company_name: companyName || null,
        phone: phone || null,
      })
      .eq("id", userId);

    if (error) {
      return { success: false, error: error.message || "Update failed." };
    }

    // Keep auth metadata in sync when service role is available
    if (isServiceRoleConfigured()) {
      try {
        const admin = createServiceRoleClient();
        await admin.auth.admin.updateUserById(userId, {
          user_metadata: {
            full_name: fullName,
            company_name: companyName,
            phone,
          },
        });
      } catch {
        // non-fatal
      }
    }

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message || "Update failed." };
  }
}

export async function updateAdminManagedUserRole(input: {
  userId: string;
  role: AdminManagedRole;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await requireAdmin();
    if (!currentUser) {
      return { success: false, error: "Unauthorized." };
    }

    const userId = String(input.userId || "").trim();
    const role = normalizeRole(input.role);

    if (!userId) {
      return { success: false, error: "Missing user id." };
    }

    if (userId === currentUser.user.id && role !== "admin") {
      return {
        success: false,
        error: "You cannot remove your own admin role.",
      };
    }

    const supabase = await createServerClient();
    const { error } = await supabase
      .from("profiles")
      .update({ role })
      .eq("id", userId);

    if (error) {
      return { success: false, error: error.message || "Role update failed." };
    }

    if (isServiceRoleConfigured()) {
      try {
        const admin = createServiceRoleClient();
        await admin.auth.admin.updateUserById(userId, {
          user_metadata: { role },
          app_metadata: { role },
        });
      } catch {
        // non-fatal
      }
    }

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, error: message || "Role update failed." };
  }
}
