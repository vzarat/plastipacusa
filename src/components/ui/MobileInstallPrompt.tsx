"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import { Download, Share, X } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

const DISMISS_KEY = "plastipac_dismiss_install_prompt";
const DISMISS_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const APP_ICON =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/ICON_APP.png";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false;

  const displayStandalone = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone =
    "standalone" in window.navigator &&
    Boolean((window.navigator as Navigator & { standalone?: boolean }).standalone);

  return displayStandalone || iosStandalone;
}

function wasDismissedRecently(): boolean {
  if (typeof window === "undefined") return true;

  try {
    const raw = window.localStorage.getItem(DISMISS_KEY);
    if (!raw) return false;
    if (raw === "permanent") return true;

    const dismissedAt = Number(raw);
    if (!Number.isFinite(dismissedAt)) return false;

    return Date.now() - dismissedAt < DISMISS_MS;
  } catch {
    return false;
  }
}

function detectIOS(): boolean {
  if (typeof window === "undefined") return false;
  const ua = window.navigator.userAgent.toLowerCase();
  const isAppleMobile = /iphone|ipad|ipod/.test(ua);
  const isIpadOs = window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1;
  return isAppleMobile || isIpadOs;
}

export function MobileInstallPrompt() {
  const { locale } = useLanguage();
  const isSpanish = locale === "es";

  const [isVisible, setIsVisible] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandaloneMode() || wasDismissedRecently()) {
      setIsVisible(false);
      return;
    }

    setIsIOS(detectIOS());
    setIsVisible(true);

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setIsVisible(false);
      try {
        window.localStorage.setItem(DISMISS_KEY, "permanent");
      } catch {
        // ignore storage errors
      }
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const dismiss = (permanent = false) => {
    setIsVisible(false);
    try {
      window.localStorage.setItem(
        DISMISS_KEY,
        permanent ? "permanent" : String(Date.now())
      );
    } catch {
      // ignore storage errors
    }
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      setDeferredPrompt(null);

      if (choice.outcome === "accepted") {
        dismiss(true);
      }
    } catch {
      // Browser may reject prompt; keep banner for manual instructions
    }
  };

  if (!isVisible) return null;

  const title = isSpanish ? "Instalar Plastipac App" : "Install Plastipac App";
  const installLabel = isSpanish ? "Instalar" : "Install";
  const iosInstructions = isSpanish
    ? "Toca Compartir → Agregar a pantalla de inicio (+)."
    : "Tap Share → Add to Home Screen (+).";
  const androidInstructions = isSpanish
    ? "Toca Opciones (⋮) → Instalar app o Agregar a pantalla de inicio."
    : "Tap Options (⋮) → Install App or Add to Home Screen.";

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 block md:hidden">
      <div className="bg-white/95 backdrop-blur-md text-slate-900 rounded-2xl p-4 shadow-2xl border border-slate-200">
        <div className="flex items-start gap-3">
          <Image
            src={APP_ICON}
            alt="Plastipac App"
            width={40}
            height={40}
            className="h-10 w-10 rounded-xl object-cover flex-shrink-0 bg-slate-50 border border-slate-100"
          />

          <div className="min-w-0 flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-sm font-bold leading-snug pr-2 text-slate-900">{title}</h2>
              <button
                type="button"
                onClick={() => dismiss(false)}
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition-colors cursor-pointer"
                aria-label={isSpanish ? "Cerrar" : "Close"}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-[11px] leading-relaxed text-slate-600">
              {isIOS ? (
                <span className="inline-flex items-start gap-1.5">
                  <Share className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-sky-600" />
                  <span>{iosInstructions}</span>
                </span>
              ) : (
                <span>{androidInstructions}</span>
              )}
            </p>

            {!isIOS && (
              <button
                type="button"
                onClick={handleInstallClick}
                disabled={!deferredPrompt}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-3 py-2.5 text-xs font-bold text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 transition-colors cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                {installLabel}
              </button>
            )}

            {isIOS && (
              <p className="text-[10px] font-medium text-slate-500">
                {isSpanish
                  ? "Safari: usa el botón Compartir del navegador."
                  : "Safari: use the browser Share button."}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
