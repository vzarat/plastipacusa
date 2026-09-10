"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lock, AlertCircle, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useLanguage } from "@/context/LanguageContext";

export default function SetupPasswordPage() {
  const router = useRouter();
  const { t, locale } = useLanguage();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 6) {
      setErrorMsg(
        locale === "es"
          ? "La contraseña debe tener al menos 6 caracteres."
          : "Password must be at least 6 characters long."
      );
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg(
        locale === "es"
          ? "Las contraseñas no coinciden."
          : "Passwords do not match."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password,
      });

      if (error) {
        throw error;
      }

      router.push("/dashboard");
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          (locale === "es"
            ? "No se pudo guardar la contraseña. Inténtalo de nuevo."
            : "Unable to save your password. Please try again.")
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-xl shadow-slate-200/50 sm:p-8">
        <div className="mb-6 flex items-center justify-center gap-2 text-blue-950">
          <ShieldCheck className="h-6 w-6 text-blue-700" />
          <span className="text-sm font-black uppercase tracking-[0.18em]">Plastipac</span>
        </div>

        <div className="space-y-1.5 text-center">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            {t("auth.setupPasswordTitle")}
          </h1>
          <p className="text-sm text-slate-600">{t("auth.setupPasswordSubtitle")}</p>
        </div>

        {errorMsg && (
          <div className="mt-5 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              {t("auth.password")}
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={locale === "es" ? "Mínimo 6 caracteres" : "Min. 6 characters"}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600"
                autoComplete="new-password"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              {t("auth.confirmPassword")}
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={locale === "es" ? "Repite tu contraseña" : "Re-enter password"}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600"
                autoComplete="new-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3.5 text-sm font-bold text-white shadow-md transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>{locale === "es" ? "Guardando..." : "Saving..."}</span>
              </>
            ) : (
              <>{t("auth.savePassword")}</>
            )}
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center text-sm font-semibold text-slate-600 transition hover:text-slate-900"
          >
            {t("auth.skipForNow")}
          </Link>
        </div>
      </div>
    </div>
  );
}
