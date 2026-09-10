import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=oauth", origin));
  }

  try {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: Array<{ name: string; value: string; options?: any }>) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // The `setAll` method can throw in some cases if the cookie store is unavailable.
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("OAuth callback exchangeCodeForSession error:", error);
      return NextResponse.redirect(new URL("/login?error=oauth", origin));
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("OAuth callback getUser error:", userError);
      return NextResponse.redirect(new URL("/login?error=oauth", origin));
    }

    const hasPassword = Boolean(
      user.user_metadata?.has_password || user.app_metadata?.has_password
    );

    const target = hasPassword ? next : "/dashboard?setup_password=true";

    return NextResponse.redirect(new URL(target, origin));
  } catch (error) {
    console.error("OAuth callback route error:", error);
    return NextResponse.redirect(new URL("/login?error=oauth", origin));
  }
}
