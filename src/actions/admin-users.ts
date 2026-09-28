"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/actions/auth";
import {
  createServiceRoleClient,
  isServiceRoleConfigured,
} from "@/lib/supabase/admin";
import { createServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  fetchMergedAdminUsers,
  type AdminManagedRole,
  type AdminManagedUser,
} from "@/lib/admin/fetch-users";

export type { AdminManagedRole, AdminManagedUser };

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

export async function getAdminManagedUsers(): Promise<AdminManagedUser[]> {
  try {
    if (!(await requireAdmin()) || !isSupabaseConfigured) {
      return [];
    }
    return await fetchMergedAdminUsers();
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

    const supabase = isServiceRoleConfigured()
      ? createServiceRoleClient()
      : await createServerClient();

    const { error } = await supabase.from("profiles").upsert(
      {
        id: userId,
        full_name: fullName,
        company_name: companyName || null,
        phone: phone || null,
      },
      { onConflict: "id" }
    );

    if (error) {
      return { success: false, error: error.message || "Update failed." };
    }

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

    const supabase = isServiceRoleConfigured()
      ? createServiceRoleClient()
      : await createServerClient();

    const { error } = await supabase.from("profiles").upsert(
      {
        id: userId,
        role,
      },
      { onConflict: "id" }
    );

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
