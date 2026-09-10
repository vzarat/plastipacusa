import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const error = searchParams.get("error");
  const errorCode = searchParams.get("error_code");
  const errorDescription = searchParams.get("error_description");

  const redirectToLogin = (fallbackError = "auth-failed") => {
    const loginParams = new URLSearchParams();

    if (error) loginParams.set("error", error);
    else loginParams.set("error", fallbackError);

    if (errorCode) loginParams.set("error_code", errorCode);
    if (errorDescription) loginParams.set("error_description", errorDescription);

    return NextResponse.redirect(new URL(`/login?${loginParams.toString()}`, origin));
  };

  if (!code) {
    return redirectToLogin();
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
              // Called from Server Component
            }
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("OAuth callback exchangeCodeForSession error:", error);
      return redirectToLogin();
    }

    return NextResponse.redirect(new URL(next, origin));
  } catch (error) {
    console.error("OAuth callback route error:", error);
    return redirectToLogin();
  }
}
