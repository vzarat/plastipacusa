"use client";

import React, { useEffect, useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "@/actions/auth";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { createClient } from "@/lib/supabase/client";
import {
  Lock,
  Mail,
  ArrowRight,
  AlertCircle,
  Loader2,
  Building2,
  ShieldCheck,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/dashboard";
  const authError = searchParams.get("error");
  const errorCode = searchParams.get("error_code");
  const errorDescription = searchParams.get("error_description");
  const authErrorKey = [authError, errorCode, errorDescription].join("|");

  const [showAuthDetails, setShowAuthDetails] = useState(false);
  const [dismissAuthError, setDismissAuthError] = useState(false);

  useEffect(() => {
    setShowAuthDetails(false);
    setDismissAuthError(false);
  }, [authErrorKey]);

  const hasAuthError = Boolean(authError || errorCode);
  const authErrorMessage =
    errorDescription ||
    (authError === "auth-failed"
      ? "Could not complete Google Sign-In. Please try again."
      : "Authentication Error. Please try again.");

  const handleGoogleSignIn = async () => {
    const supabaseClient = createClient();
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://plastipacusa.vercel.app";

    await supabaseClient.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=/auth/setup-password`,
      },
    });
  };

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    // OAuth code exchange is handled server-side in /auth/callback/route.ts.
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email || !password) {
      setErrorMsg("Please enter your work email and password.");
      return;
    }

    startTransition(async () => {
      const res = await signIn({ email, password });
      if (res.success) {
        // Full refresh to ensure server components read updated cookies
        const explicitRedirect = searchParams.get("redirect");
        let target = res.role === "admin" ? "/admin" : "/dashboard";

        if (explicitRedirect) {
          if (res.role === "admin") {
            // Admin only honors admin redirects, otherwise goes directly to /admin
            target = explicitRedirect.startsWith("/admin") ? explicitRedirect : "/admin";
          } else {
            // Client never routes to /admin
            target = !explicitRedirect.startsWith("/admin") ? explicitRedirect : "/dashboard";
          }
        }

        window.location.replace(target);
      } else {
        setErrorMsg(res.error || "Failed to sign in. Please verify your credentials.");
      }
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="space-y-1.5 text-center sm:text-left">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-[11px] font-bold text-blue-800 uppercase tracking-wider mb-1">
          <Building2 className="w-3.5 h-3.5 text-blue-600" />
          Commercial Client Portal
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Sign In to Your Account
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Access your factory direct pricing, recurring orders, and shipping tracking.
        </p>
      </div>

      {hasAuthError && !dismissAuthError && (
        <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50 shadow-sm animate-fade-in-up">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <AlertCircle className="w-5 h-5 text-rose-600" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-sm font-bold text-rose-900">Authentication Error</div>
              <p className="mt-1 text-xs text-rose-800">{authErrorMessage}</p>

              {showAuthDetails && (
                <div className="mt-3 rounded-xl border border-rose-200 bg-white/70 p-3 text-[11px] text-rose-900">
                  <div className="font-semibold uppercase tracking-wide text-rose-700">Technical details</div>
                  <div className="mt-2 space-y-1">
                    <p>
                      <span className="font-semibold">Error:</span> {authError || "auth-failed"}
                    </p>
                    {errorCode && (
                      <p>
                        <span className="font-semibold">Code:</span> {errorCode}
                      </p>
                    )}
                    {errorDescription && (
                      <p>
                        <span className="font-semibold">Description:</span> {errorDescription}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAuthDetails((prev) => !prev)}
                className="text-[11px] font-semibold text-rose-700 hover:text-rose-900 underline underline-offset-2"
              >
                {showAuthDetails ? "Hide details" : "View details"}
              </button>
              <button
                type="button"
                onClick={() => setDismissAuthError(true)}
                className="text-lg leading-none text-rose-500 hover:text-rose-700"
                aria-label="Close authentication error"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Error Alert */}
      {errorMsg && (
        <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-2.5 text-xs text-rose-800 animate-fade-in-up">
          <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
          <span className="font-medium">{errorMsg}</span>
        </div>
      )}

      {/* Login Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Work Email */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
            Work Email Address <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="purchasing@company.com"
              disabled={isPending}
              className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all disabled:opacity-60"
            />
          </div>
        </div>

        {/* Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Password <span className="text-rose-500">*</span>
            </label>
            <span className="text-[11px] text-slate-400">Min. 6 characters</span>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              disabled={isPending}
              className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all disabled:opacity-60"
            />
          </div>
        </div>

        {/* Remember Me */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-blue-700 focus:ring-blue-600"
            />
            <span className="text-xs font-medium text-slate-600">Remember this device</span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-blue-950 text-white font-bold text-sm tracking-wide shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white" />
              <span>Authenticating...</span>
            </>
          ) : (
            <>
              <span>Sign In to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </>
          )}
        </button>
      </form>

      <div className="relative border-t border-slate-100">
        <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Or continue with
        </span>
      </div>

      <GoogleSignInButton onClick={handleGoogleSignIn} />

      {/* Divider */}
      <div className="relative border-t border-slate-100">
        <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          New Commercial Client?
        </span>
      </div>

      {/* Register Prompt */}
      <div className="text-center space-y-2">
        <p className="text-xs text-slate-600">
          Need a wholesale commercial account for volume packaging procurement?
        </p>
        <Link
          href={`/register${redirectTarget !== "/dashboard" ? `?redirect=${encodeURIComponent(redirectTarget)}` : ""}`}
          className="inline-flex items-center justify-center gap-1.5 w-full py-3 px-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/70 hover:bg-slate-100/70 text-slate-800 text-xs font-bold transition-all"
        >
          <span>Register Commercial Client Account</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
        </Link>
      </div>

      {/* Trust Callout */}
      <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>Direct manufacturer portal • Strict confidential purchasing</span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center text-slate-400 text-sm font-semibold animate-pulse">
          Loading commercial portal...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}

