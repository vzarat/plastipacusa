"use client";

import React, { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Lock, Loader2, ShieldCheck, X } from "lucide-react";
import { supabase } from "@/lib/supabase/client";
import { useLanguage } from "@/context/LanguageContext";

interface SetPasswordModalProps {
  isOpen: boolean;
}

export function SetPasswordModal({ isOpen }: SetPasswordModalProps) {
  const { locale, t } = useLanguage();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVisible, setIsVisible] = useState(isOpen);

  useEffect(() => {
    setIsVisible(isOpen);
    if (!isOpen) {
      setNewPassword("");
      setConfirmPassword("");
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  if (!isVisible) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (newPassword.length < 6) {
      setErrorMsg(locale === "es" ? "La contraseña debe tener al menos 6 caracteres." : "Password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg(locale === "es" ? "Las contraseñas no coinciden." : "Passwords do not match.");
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        throw error;
      }

      const user = (await supabase.auth.getUser()).data.user;
      if (user) {
        await supabase.from("profiles").upsert(
          {
            id: user.id,
            email: user.email,
            has_password: true,
            password_setup_skipped: false,
          },
          { onConflict: "id" }
        );
      }

      setSuccessMsg(
        locale === "es"
          ? "¡Contraseña configurada correctamente! Ya puedes iniciar sesión con tu correo y Google."
          : "Password set successfully! You can now sign in with your email or Google."
      );

      setTimeout(() => {
        setIsVisible(false);
      }, 1200);
    } catch (err: any) {
      const message =
        err?.message ||
        (locale === "es"
          ? "No se pudo configurar la contraseña. Inténtalo de nuevo."
          : "Unable to set your password. Please try again.");
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const title =
    locale === "es"
      ? "¡Bienvenido a Plastipac! Configura una contraseña"
      : "Welcome to Plastipac! Set a password";

  const description =
    locale === "es"
      ? "Configura una contraseña para tu cuenta para que también puedas ingresar con tu correo sin depender de Google."
      : "Set a password for your account so you can also log in directly with your email.";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 backdrop-blur-sm px-4">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-2 text-blue-950">
            <ShieldCheck className="h-5 w-5 text-blue-700" />
            <span className="text-sm font-black uppercase tracking-[0.18em]">Plastipac</span>
          </div>
          <button
            type="button"
            onClick={() => setIsVisible(false)}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Close password setup modal"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6">
          <div className="space-y-2 text-center sm:text-left">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">{title}</h2>
            <p className="text-sm text-slate-600">{description}</p>
          </div>

          {errorMsg && (
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-900">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {!successMsg && (
            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  {locale === "es" ? "Nueva Contraseña" : "New Password"}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={locale === "es" ? "Mínimo 6 caracteres" : "Min. 6 characters"}
                    className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-600"
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  {locale === "es" ? "Confirmar Contraseña" : "Confirm Password"}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={locale === "es" ? "Repite la contraseña" : "Re-enter password"}
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
                  <>
                    <span>{locale === "es" ? "Guardar Contraseña" : "Save Password"}</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
