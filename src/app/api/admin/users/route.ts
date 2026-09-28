import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/actions/auth";
import {
  createServiceRoleClient,
  isServiceRoleConfigured,
} from "@/lib/supabase/admin";
import { fetchMergedAdminUsers } from "@/lib/admin/fetch-users";
import { revalidatePath } from "next/cache";

async function assertAdmin() {
  const currentUser = await getCurrentUser();
  if (!currentUser || currentUser.profile.role !== "admin") {
    return null;
  }
  return currentUser;
}

/**
 * GET /api/admin/users
 * Lists all auth users via Admin API, merged with profiles.
 */
export async function GET() {
  const currentUser = await assertAdmin();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const users = await fetchMergedAdminUsers();
    return NextResponse.json({ users });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

/**
 * POST /api/admin/users
 * Body: { action: "reset_password" | "delete", userId, password? }
 * Uses SUPABASE_SERVICE_ROLE_KEY for Auth Admin API.
 */
export async function POST(request: NextRequest) {
  const currentUser = await assertAdmin();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  if (!isServiceRoleConfigured()) {
    return NextResponse.json(
      {
        error:
          "SUPABASE_SERVICE_ROLE_KEY is not configured on the server.",
      },
      { status: 503 }
    );
  }

  let body: {
    action?: string;
    userId?: string;
    password?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const action = String(body.action || "").trim();
  const userId = String(body.userId || "").trim();

  if (!userId) {
    return NextResponse.json({ error: "Missing userId." }, { status: 400 });
  }

  if (userId === currentUser.user.id && action === "delete") {
    return NextResponse.json(
      { error: "You cannot delete your own admin account." },
      { status: 400 }
    );
  }

  try {
    const admin = createServiceRoleClient();

    if (action === "reset_password") {
      const password = String(body.password || "");
      if (password.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters." },
          { status: 400 }
        );
      }

      const { error } = await admin.auth.admin.updateUserById(userId, {
        password,
      });

      if (error) {
        return NextResponse.json(
          { error: error.message || "Password reset failed." },
          { status: 500 }
        );
      }

      // Mark has_password on profile
      await admin
        .from("profiles")
        .update({
          has_password: true,
          password_setup_skipped: false,
        })
        .eq("id", userId);

      revalidatePath("/admin/users");
      return NextResponse.json({ success: true });
    }

    if (action === "delete") {
      const { error } = await admin.auth.admin.deleteUser(userId);

      if (error) {
        return NextResponse.json(
          { error: error.message || "Delete failed." },
          { status: 500 }
        );
      }

      // Clean up profile if auth delete did not cascade
      await admin.from("profiles").delete().eq("id", userId);
      try {
        await admin.from("company_profiles").delete().eq("user_id", userId);
      } catch {
        // optional table
      }

      revalidatePath("/admin/users");
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Unknown action. Use reset_password or delete." },
      { status: 400 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
