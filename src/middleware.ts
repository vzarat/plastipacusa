import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/auth/callback")) {
    return NextResponse.next();
  }

  let response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  console.log("[middleware]", {
    pathname,
    cookieNames: request.cookies.getAll().map((cookie) => cookie.name),
    hasUser: !!user,
    error: error?.message,
  });

  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/admin") ||
    pathname === "/checkout" ||
    pathname.startsWith("/checkout/");

  if (pathname === "/checkout" && request.nextUrl.searchParams.has("products")) {
    const next = new URL("/meta-checkout", request.url);
    const products = request.nextUrl.searchParams.get("products");
    const coupon = request.nextUrl.searchParams.get("coupon");
    if (products) next.searchParams.set("products", products);
    if (coupon) next.searchParams.set("coupon", coupon);
    return NextResponse.redirect(next);
  }

  if (isProtectedRoute && (error || !user)) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect", pathname + search);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
    "/checkout",
    "/checkout/:path*",
  ],
};

