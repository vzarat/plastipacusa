"use client";

import Link from "next/link";
import { Bell, CheckCheck, X } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/context/LanguageContext";

interface NotificationBellProps {
  pending: boolean;
}

export function NotificationBell({ pending }: NotificationBellProps) {
  const { locale } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  const shouldShowNotification = pending && !isDismissed;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-700 transition hover:border-slate-300 hover:text-slate-900"
        aria-label={locale === "es" ? "Centro de notificaciones" : "Notification center"}
      >
        <Bell className="h-4 w-4" />
        {shouldShowNotification && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold text-white">
            1
          </span>
        )}
      </button>

      {isOpen && shouldShowNotification && (
        <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-200/70">
          <div className="border-b border-slate-100 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
              {locale === "es" ? "Notificaciones" : "Notifications"}
            </p>
          </div>

          <div className="p-3">
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-sm font-bold text-amber-900">
                    {locale === "es"
                      ? "Configurar contraseña de respaldo"
                      : "Set backup password"}
                  </p>
                  <p className="text-xs text-amber-800">
                    {locale === "es"
                      ? "Aún no has creado una contraseña para tu cuenta."
                      : "You have not created a password for your account yet."}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDismissed(true)}
                  className="rounded-full p-1 text-amber-700 transition hover:bg-amber-100"
                  aria-label={locale === "es" ? "Marcar como leída" : "Mark as read"}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <Link
                  href="/dashboard/settings"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex items-center gap-1 rounded-xl bg-amber-600 px-2.5 py-1.5 text-xs font-bold text-white transition hover:bg-amber-700"
                >
                  {locale === "es" ? "Configurar ahora" : "Set up now"}
                </Link>

                <button
                  type="button"
                  onClick={() => {
                    setIsDismissed(true);
                    setIsOpen(false);
                  }}
                  className="inline-flex items-center gap-1 rounded-xl border border-amber-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-amber-800 transition hover:bg-amber-100"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  {locale === "es" ? "Listo" : "Done"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
