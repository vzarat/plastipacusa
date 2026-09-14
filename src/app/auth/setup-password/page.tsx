"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Loader2, ShieldCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useLanguage } from "@/context/LanguageContext";

export default function SetupPasswordPage() {
  const router = useRouter();
  const { t, locale } = useLanguage();
  const authenticatedHomeRoute = "/dashboard";

  useEffect(() => {
    const verifySession = async () => {
      const supabaseClient = createClient();
      const {
        data: { session },
        error,
      } = await supabaseClient.auth.getSession();

      if (error || !session) {
        router.replace("/login");
      }
    };

    verifySession();
  }, [router]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      toast.error(
        locale === "es"
          ? "La contraseña debe tener al menos 6 caracteres."
          : "Password must be at least 6 characters long."
      );
      return;
    }

    if (password !== confirmPassword) {
      toast.error(
        locale === "es"
          ? "Las contraseñas no coinciden."
          : "Passwords do not match."
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const supabaseClient = createClient();
      const {
        data: { session },
        error: sessionError,
      } = await supabaseClient.auth.getSession();

      if (sessionError || !session) {
        router.replace("/login");
        return;
      }

      const { error } = await supabaseClient.auth.updateUser({
        password,
        data: { backup_password_pending: false },
      });

      if (error) {
        throw error;
      }

      toast.success(
        locale === "es"
          ? "Contraseña de respaldo configurada correctamente"
          : "Backup password configured successfully"
      );

      try {
        const {
          data: { user },
          error: userError,
        } = await supabaseClient.auth.getUser();

        if (!userError && user) {
          await supabaseClient.from("profiles").upsert(
            {
              id: user.id,
              email: user.email,
              has_password: true,
              password_setup_skipped: false,
            },
            { onConflict: "id" }
          );
        }
      } catch {
        // Ignore profile write errors so the user can still continue into the dashboard.
      }

      router.replace(authenticatedHomeRoute);
    } catch (err: any) {
      toast.error(
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

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              {t("auth.password")}
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={locale === "es" ? "Mínimo 6 caracteres" : "Min. 6 characters"}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
              {t("auth.confirmPassword")}
            </label>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={locale === "es" ? "Repite tu contraseña" : "Re-enter password"}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600"
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
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
          <button
            type="button"
            onClick={async () => {
              try {
                const supabaseClient = createClient();
                const {
                  data: { user },
                  error: userError,
                } = await supabaseClient.auth.getUser();

                if (!userError && user) {
                  await supabaseClient.auth.updateUser({
                    data: { backup_password_pending: true },
                  });

                  await supabaseClient.from("profiles").upsert(
                    {
                      id: user.id,
                      email: user.email,
                      has_password: false,
                      password_setup_skipped: true,
                    },
                    { onConflict: "id" }
                  );
                }
              } catch {
                // Ignore profile write errors and continue to the dashboard.
              }

              router.replace(authenticatedHomeRoute);
            }}
            className="inline-flex items-center justify-center text-sm font-semibold text-slate-600 transition hover:text-slate-900"
          >
            {t("auth.skipForNow")}
          </button>
        </div>
      </div>
    </div>
  );
}
