import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ACCESS_COOKIE = "sb-access-token";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(ACCESS_COOKIE)?.value;

  const isProtectedRoute = pathname.startsWith("/dashboard") || pathname.startsWith("/admin");

  // Protect /dashboard and /admin routes: redirect to /login if unauthenticated
  if (isProtectedRoute && !token) {
    const redirectUrl = new URL("/login", request.url);
    redirectUrl.searchParams.set("redirect", pathname + search);
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/admin/:path*",
  ],
};

