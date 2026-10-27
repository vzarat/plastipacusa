"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AlertCircle, ArrowRight, Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { clearRecoverySession } from "@/actions/auth";
import { createClient } from "@/lib/supabase/client";

const MIN_PASSWORD = 6;

function safeContinuePath(value: string | null): string | null {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  if (
    value.startsWith("/checkout") ||
    value.startsWith("/products") ||
    value.startsWith("/catalog")
  ) {
    return value;
  }
  return null;
}

function UpdatePasswordForm() {
  const searchParams = useSearchParams();
  const continuePath = safeContinuePath(searchParams.get("redirect"));
  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const establishRecoverySession = async () => {
      const supabase = createClient();
      const code = searchParams.get("code");
      try {
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
          const accessToken = hash.get("access_token");
          const refreshToken = hash.get("refresh_token");
          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) throw error;
            window.history.replaceState(null, "", window.location.pathname);
          }
        }
        const { data } = await supabase.auth.getSession();
        if (cancelled) return;
        if (!data.session) {
          setLinkError("This reset link is invalid or has expired. Request a new one.");
        }
      } catch {
        if (!cancelled) {
          setLinkError("This reset link is invalid or has expired. Request a new one.");
        }
      } finally {
        if (!cancelled) setReady(true);
      }
    };

    void establishRecoverySession();
    return () => {
      cancelled = true;
    };
  }, [searchParams]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMsg(null);
    if (password.length < MIN_PASSWORD) {
      setErrorMsg(`Password must be at least ${MIN_PASSWORD} characters.`);
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    setPending(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setErrorMsg(error.message || "Could not update the password.");
        return;
      }

      await supabase.auth.signOut();
      await clearRecoverySession();
      toast.success("Password updated. Sign in with your new password.");
      const loginUrl = continuePath
        ? `/login?reset=success&redirect=${encodeURIComponent(continuePath)}`
        : "/login?reset=success";
      window.location.assign(loginUrl);
    } catch {
      setErrorMsg("Could not update the password.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
          Choose a new password
        </h1>
        <p className="text-sm text-slate-500">
          Use at least {MIN_PASSWORD} characters. You will sign in again after saving it.
        </p>
      </div>

      {!ready ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
          <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
          Checking your reset link...
        </div>
      ) : linkError ? (
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <span className="font-medium">{linkError}</span>
          </div>
          <Link
            href="/forgot-password"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:underline"
          >
            Request a new reset link
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : (
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4">
          {errorMsg && (
            <div className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}
          <PasswordField
            label="New password"
            value={password}
            shown={showPassword}
            onToggle={() => setShowPassword((value) => !value)}
            onChange={setPassword}
            autoComplete="new-password"
            disabled={pending}
          />
          <PasswordField
            label="Confirm new password"
            value={confirmPassword}
            shown={showConfirm}
            onToggle={() => setShowConfirm((value) => !value)}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            disabled={pending}
          />
          <button
            type="submit"
            disabled={pending}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 px-4 text-sm font-bold tracking-wide text-white shadow-md transition-all hover:bg-blue-950 disabled:opacity-60"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            <span>{pending ? "Saving password..." : "Update password"}</span>
          </button>
        </form>
      )}
    </div>
  );
}

function PasswordField({
  label,
  value,
  shown,
  onToggle,
  onChange,
  autoComplete,
  disabled,
}: {
  label: string;
  value: string;
  shown: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
  autoComplete: string;
  disabled: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
        {label}
      </label>
      <div className="relative">
        <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type={shown ? "text" : "password"}
          required
          minLength={MIN_PASSWORD}
          autoComplete={autoComplete}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={disabled}
          className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600 disabled:opacity-60"
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
          aria-label={shown ? "Hide password" : "Show password"}
        >
          {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

export default function UpdatePasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center text-sm font-semibold text-slate-400 shadow-xl">
          Loading...
        </div>
      }
    >
      <UpdatePasswordForm />
    </Suspense>
  );
}
