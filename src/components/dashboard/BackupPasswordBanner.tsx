"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

interface BackupPasswordBannerProps {
  pending: boolean;
}

export function BackupPasswordBanner({ pending }: BackupPasswordBannerProps) {
  const { locale } = useLanguage();

  if (!pending) {
    return null;
  }

  const message =
    locale === "es"
      ? "⚠️ Contraseña de respaldo pendiente: Aún no has configurado una contraseña para ingresar directamente con tu correo."
      : "⚠️ Backup password pending: You have not set a backup password for direct email access yet.";

  const actionLabel = locale === "es" ? "Configurar ahora" : "Set up now";

  return (
    <div className="border-b border-amber-200 bg-amber-50">
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <p className="text-sm font-medium text-amber-900">{message}</p>
          </div>

          <Link
            href="/dashboard/settings"
            className="inline-flex items-center justify-center rounded-xl bg-amber-600 px-3.5 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-amber-700"
          >
            {actionLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
