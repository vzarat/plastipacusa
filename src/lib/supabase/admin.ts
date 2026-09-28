import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.SUPABASE_URL ||
  "";

/**
 * Privileged Supabase client using the service role key.
 * NEVER import this into client components — server-only.
 */
export function createServiceRoleClient(): SupabaseClient {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY (and URL) must be configured for admin user operations."
    );
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function isServiceRoleConfigured(): boolean {
  return Boolean(
    supabaseUrl &&
      process.env.SUPABASE_SERVICE_ROLE_KEY &&
      !String(process.env.SUPABASE_SERVICE_ROLE_KEY).includes("placeholder")
  );
}
