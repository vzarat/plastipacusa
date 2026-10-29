"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Loader2, Mail } from "lucide-react";
import { EmailRateLimitNotice } from "@/components/auth/EmailRateLimitNotice";
import { SUPPORT_EMAIL } from "@/lib/company-email";
import { createClient } from "@/lib/supabase/client";
import { useEmailRateLimit } from "@/lib/auth/use-email-rate-limit";

const RESET_REDIRECT = "https://www.plastipacusa.com/update-password";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "";
  const loginHref = `/login${
    redirectTarget.startsWith("/") && !redirectTarget.startsWith("//")
      ? `?redirect=${encodeURIComponent(redirectTarget)}`
      : ""
  }`;
  const [email, setEmail] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const emailLimit = useEmailRateLimit("plastipac-email-limit-forgot");

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg(null);
    if (emailLimit.limited) return;
    const address = email.trim().toLowerCase();
    if (!address || !address.includes("@")) {
      setErrorMsg("Enter the email address on your account.");
      return;
    }

    setPending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.resetPasswordForEmail(address, {
        redirectTo: RESET_REDIRECT,
      });
      if (error) {
        if (emailLimit.lockFrom(error)) return;
        setErrorMsg(error.message || "Could not send the reset email. Try again.");
        return;
      }
      setSentTo(address);
    } catch (error) {
      if (emailLimit.lockFrom(error)) return;
      setErrorMsg("Could not send the reset email. Try again.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          Reset your password
        </h1>
        <p className="text-sm text-slate-500">
          Enter your account email. We will send a link to choose a new password.
        </p>
      </div>

      {sentTo ? (
        <div className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-900">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
          <div>
            <strong className="mb-0.5 block font-bold text-emerald-950">Check your inbox</strong>
            <span>
              If an account exists for {sentTo}, a reset link is on its way. Open it on this device
              and choose a new password. If it does not arrive, write to{" "}
              <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold underline">
                {SUPPORT_EMAIL}
              </a>
              .
            </span>
          </div>
        </div>
      ) : (
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          {emailLimit.limited && <EmailRateLimitNotice minutesLeft={emailLimit.minutesLeft} />}
          {errorMsg && !emailLimit.limited && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="purchasing@company.com"
                disabled={pending}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-60"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={pending || emailLimit.limited}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 px-4 text-sm font-bold tracking-wide text-white shadow-md transition-all hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            <span>
              {emailLimit.limited
                ? `Please wait ${emailLimit.minutesLeft} min`
                : pending
                  ? "Sending reset link..."
                  : "Send reset link"}
            </span>
          </button>
        </form>
      )}

      <p className="text-center text-[11px] text-slate-500">
        Account support:{" "}
        <a href={`mailto:${SUPPORT_EMAIL}`} className="font-semibold text-sky-700 hover:underline">
          {SUPPORT_EMAIL}
        </a>
      </p>
      <Link
        href={loginHref}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to sign in
      </Link>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-400 shadow-xl">
          Loading...
        </div>
      }
    >
      <ForgotPasswordForm />
    </Suspense>
  );
}
