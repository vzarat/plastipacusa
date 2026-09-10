"use client";

import React, { useState, useTransition, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signUp } from "@/actions/auth";
import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { supabase } from "@/lib/supabase/client";
import {
  Lock,
  Mail,
  Building,
  User,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Building2,
  ShieldCheck,
} from "lucide-react";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTarget = searchParams.get("redirect") || "/dashboard";

  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  const [companyName, setCompanyName] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (!companyName.trim()) {
      setErrorMsg("Please provide your Company or Organization Name.");
      return;
    }
    if (!fullName.trim()) {
      setErrorMsg("Please provide your Contact Full Name.");
      return;
    }
    if (!email.trim()) {
      setErrorMsg("Please provide a valid Work Email Address.");
      return;
    }
    if (password.length < 6) {
      setErrorMsg("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match. Please re-enter your password.");
      return;
    }

    startTransition(async () => {
      const res = await signUp({
        companyName,
        fullName,
        email,
        password,
      });

      if (res.success) {
        if (res.hasSession) {
          window.location.href = redirectTarget;
        } else {
          setSuccessMsg(
            res.message ||
              "Commercial client registration initiated! Please check your email inbox to verify your account."
          );
        }
      } else {
        setErrorMsg(res.error || "Failed to register account. Please check your information.");
      }
    });
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200 shadow-xl shadow-slate-200/50 p-6 sm:p-8 space-y-6">
      {/* Header */}
      <div className="space-y-1.5 text-center sm:text-left">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-50 border border-blue-100 text-[11px] font-bold text-blue-800 uppercase tracking-wider mb-1">
          <Building2 className="w-3.5 h-3.5 text-blue-600" />
          B2B Commercial Registration
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Create Client Account
        </h1>
        <p className="text-xs sm:text-sm text-slate-500">
          Register your organization for factory-direct pallet pricing, fast reorders, and commercial terms.
        </p>
      </div>

      {/* Success Notice */}
      {successMsg && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-start gap-3 text-xs text-emerald-900 animate-fade-in-up">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <strong className="block font-bold text-emerald-950 mb-0.5">Registration Successful</strong>
            <span>{successMsg}</span>
            <div className="mt-2.5">
              <Link
                href="/login"
                className="inline-flex items-center gap-1 font-bold text-emerald-800 underline hover:text-emerald-950"
              >
                Proceed to Sign In →
              </Link>
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

      {/* Register Form */}
      {!successMsg && (
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Company Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Company / Entity Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Building className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Logistics Corp, Distribution LLC, etc."
                disabled={isPending}
                className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all disabled:opacity-60"
              />
            </div>
          </div>

          {/* Contact Full Name */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Procurement Officer / Full Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="John Doe"
                disabled={isPending}
                className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all disabled:opacity-60"
              />
            </div>
          </div>

          {/* Work Email */}
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              Corporate Work Email <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="johndoe@company.com"
                disabled={isPending}
                className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all disabled:opacity-60"
              />
            </div>
          </div>

          {/* Passwords (2 columns) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min. 6 chars"
                  disabled={isPending}
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all disabled:opacity-60"
                />
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Confirm Password <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  disabled={isPending}
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent transition-all disabled:opacity-60"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isPending}
            className="w-full py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-blue-950 text-white font-bold text-sm tracking-wide shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-60 cursor-pointer pt-3"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                <span>Creating Commercial Account...</span>
              </>
            ) : (
              <>
                <span>Register & Access Wholesale Pricing</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      )}

      <div className="relative border-t border-slate-100">
        <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Or continue with
        </span>
      </div>

      <GoogleSignInButton onClick={handleGoogleSignIn} />

      {/* Divider */}
      <div className="relative border-t border-slate-100">
        <span className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          Already Registered?
        </span>
      </div>

      {/* Sign In Link */}
      <div className="text-center">
        <Link
          href={`/login${redirectTarget !== "/dashboard" ? `?redirect=${encodeURIComponent(redirectTarget)}` : ""}`}
          className="inline-flex items-center justify-center gap-1.5 w-full py-3 px-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/70 hover:bg-slate-100/70 text-slate-800 text-xs font-bold transition-all"
        >
          <span>Sign In to Existing Account</span>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
        </Link>
      </div>

      {/* Trust Callout */}
      <div className="pt-1 flex items-center justify-center gap-1.5 text-[11px] text-slate-400 font-medium">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>Strict privacy • Factory-direct warranty & fulfillment terms</span>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xl p-8 text-center text-slate-400 text-sm font-semibold animate-pulse">
          Loading registration portal...
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}

