"use client";

import React, { useEffect, useState, useTransition } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  CheckCircle2,
  CreditCard,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  LogIn,
  UserPlus,
  X,
} from "lucide-react";
import { signIn, signUp } from "@/actions/auth";
import {
  isBrowserTurnstileEnabled,
  TurnstileField,
} from "@/components/security/TurnstileField";

type AuthTab = "login" | "signup";
type AuthPhase = "form" | "success";

export const CREDIT_POST_AUTH_KEY = "plastipac_credit_post_auth_v1";

interface CreditAuthRequiredModalProps {
  open: boolean;
  onClose?: () => void;
  /** Prefill from the credit form when available */
  defaultEmail?: string;
  defaultFullName?: string;
  defaultCompanyName?: string;
  /** When true, closing is disabled — user must authenticate. */
  dismissible?: boolean;
  /**
   * Called after a session is established (before success animation + reload).
   * Parent should persist form draft / autosubmit intent — page will reload.
   */
  onAuthenticated: (info: {
    email: string;
    fullName?: string;
    companyName?: string;
    kind: "login" | "signup";
  }) => void | Promise<void>;
}

const fieldClass =
  "h-11 w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 text-sm text-slate-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20";

/**
 * Inline auth gate for the credit application — Login / Sign Up.
 * Company + corporate email belong on the credit form, not account creation.
 */
export function CreditAuthRequiredModal({
  open,
  onClose,
  defaultEmail = "",
  defaultFullName = "",
  defaultCompanyName = "",
  dismissible = true,
  onAuthenticated,
}: CreditAuthRequiredModalProps) {
  const [mounted, setMounted] = useState(false);
  const [tab, setTab] = useState<AuthTab>("signup");
  const [email, setEmail] = useState(defaultEmail);
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState(defaultFullName);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [phase, setPhase] = useState<AuthPhase>("form");
  const [successKind, setSuccessKind] = useState<"login" | "signup">("signup");
  const [isPending, startTransition] = useTransition();
  const turnstileRequired = isBrowserTurnstileEnabled();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setEmail(defaultEmail || "");
    setFullName(defaultFullName || "");
    setPassword("");
    setError(null);
    setTurnstileToken(null);
    setAcceptTerms(false);
    setPhase("form");
    setTab(defaultEmail ? "login" : "signup");
  }, [open, defaultEmail, defaultFullName]);

  if (!open || !mounted || typeof document === "undefined") return null;

  const finishAuth = async (info: {
    email: string;
    fullName?: string;
    companyName?: string;
  }) => {
    const kind = tab === "signup" ? "signup" : "login";
    setSuccessKind(kind);
    setPhase("success");
    try {
      await onAuthenticated({ ...info, kind });
    } catch {
      // Still reload — session cookies should already be set.
    }
    window.setTimeout(() => {
      window.location.reload();
    }, 1800);
  };

  const handleLogin = () => {
    setError(null);
    if (turnstileRequired && !turnstileToken) {
      setError("Please complete the bot check.");
      return;
    }
    startTransition(async () => {
      const result = await signIn({
        email,
        password,
        turnstileToken: turnstileToken || undefined,
      });
      if (!result.success) {
        setError(result.error || "Unable to log in.");
        return;
      }
      await finishAuth({
        email: email.trim().toLowerCase(),
        companyName: defaultCompanyName || undefined,
      });
    });
  };

  const handleSignUp = () => {
    setError(null);
    if (turnstileRequired && !turnstileToken) {
      setError("Please complete the bot check.");
      return;
    }
    if (!fullName.trim()) {
      setError("Please enter your name.");
      return;
    }
    if (!acceptTerms) {
      setError("Please accept the Terms of Service and Privacy Policy.");
      return;
    }
    startTransition(async () => {
      // Company is optional for account creation — B2B company lives on the credit form.
      const result = await signUp({
        email,
        password,
        fullName,
        companyName: defaultCompanyName || undefined,
        acceptTerms: true,
        turnstileToken: turnstileToken || undefined,
      });
      if (!result.success) {
        setError(result.error || "Unable to create account.");
        return;
      }

      // Prefer staying logged in after signup. If confirm-email blocked the session,
      // signUp already tries to confirm + sign in; fall back to an explicit login once.
      let hasSession = Boolean(result.hasSession);
      if (!hasSession) {
        const login = await signIn({
          email,
          password,
          turnstileToken: turnstileToken || undefined,
        });
        hasSession = Boolean(login.success);
        if (!hasSession) {
          setError(
            login.error ||
              result.message ||
              "Account created, but we could not start your session. Please log in."
          );
          setTab("login");
          return;
        }
      }

      await finishAuth({
        email: email.trim().toLowerCase(),
        fullName: fullName.trim(),
        companyName: defaultCompanyName || undefined,
      });
    });
  };

  const canDismiss = dismissible && phase === "form";

  return createPortal(
    <div
      key="credit-auth-backdrop"
      className="fixed inset-0 z-[120] flex animate-creditModalBackdrop items-end justify-center bg-slate-950/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="credit-auth-title"
      onClick={canDismiss ? onClose : undefined}
    >
      <div
        key="credit-auth-panel"
        className="relative max-h-[92dvh] w-full max-w-md origin-bottom animate-creditModalPanel overflow-y-auto overflow-x-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl will-change-transform sm:origin-center sm:animate-creditModalPanelDesktop"
        onClick={(e) => e.stopPropagation()}
      >
        {canDismiss && onClose ? (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        ) : null}

        {phase === "success" ? (
          <div className="flex flex-col items-center px-6 py-12 text-center">
            <div className="relative mb-5 flex h-20 w-20 items-center justify-center">
              <span
                className="absolute inset-0 rounded-full bg-emerald-400/30 animate-creditAuthSuccessRing"
                aria-hidden
              />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg shadow-emerald-500/30 animate-creditAuthSuccessPop">
                <CheckCircle2 className="h-10 w-10" strokeWidth={2.5} />
              </div>
            </div>
            <h2
              id="credit-auth-title"
              className="text-xl font-black tracking-tight text-slate-900"
            >
              {successKind === "signup"
                ? "¡Registrado correctamente!"
                : "¡Sesión iniciada!"}
            </h2>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-slate-600">
              {successKind === "signup"
                ? "Tu cuenta quedó creada y ya estás dentro. Recargamos la página para continuar con tu solicitud."
                : "Ya estás dentro. Recargamos la página para continuar con tu solicitud de crédito."}
            </p>
            <div className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-600" />
              Cargando sesión…
            </div>
          </div>
        ) : (
          <>
        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-800 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 animate-[creditModalPanel_0.55s_cubic-bezier(0.16,1,0.3,1)_0.08s_both] items-center justify-center rounded-xl border border-white/25 bg-white/10">
              <Lock className="h-5 w-5 text-sky-100" aria-hidden />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-sky-100/90">
                Account required
              </p>
              <h2
                id="credit-auth-title"
                className="text-base font-extrabold leading-snug"
              >
                Login or sign up to submit
              </h2>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          <div className="flex items-start gap-2.5 rounded-xl border border-sky-100 bg-sky-50/80 px-3 py-2.5 text-[13px] leading-relaxed text-sky-900">
            <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" aria-hidden />
            <p>
              Your credit form answers stay on this page. Company and corporate email are
              already on the application — here you only create or access your account.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
            <button
              type="button"
              onClick={() => {
                setTab("login");
                setError(null);
              }}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                tab === "login"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <LogIn className="h-3.5 w-3.5" />
              Login
            </button>
            <button
              type="button"
              onClick={() => {
                setTab("signup");
                setError(null);
              }}
              className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                tab === "signup"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <UserPlus className="h-3.5 w-3.5" />
              Sign Up
            </button>
          </div>

          {tab === "signup" ? (
            <div className="space-y-3">
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Full name
                </span>
                <input
                  className={fieldClass}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  autoComplete="name"
                  required
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Email
                </span>
                <input
                  type="email"
                  className={fieldClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Password
                </span>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className={`${fieldClass} pr-10`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="new-password"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
              <label className="flex items-start gap-2 text-[12px] leading-relaxed text-slate-600">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-sky-600"
                />
                <span>
                  I agree to the{" "}
                  <Link
                    href="/terms-of-service"
                    target="_blank"
                    className="font-semibold text-sky-700 hover:underline"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    href="/privacy-policy"
                    target="_blank"
                    className="font-semibold text-sky-700 hover:underline"
                  >
                    Privacy Policy
                  </Link>
                  .
                </span>
              </label>
            </div>
          ) : (
            <div className="space-y-3">
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Email
                </span>
                <input
                  type="email"
                  className={fieldClass}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Password
                </span>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className={`${fieldClass} pr-10`}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
            </div>
          )}

          {turnstileRequired ? <TurnstileField onToken={setTurnstileToken} /> : null}

          {error ? (
            <p
              className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800"
              role="alert"
            >
              {error}
            </p>
          ) : null}

          <button
            type="button"
            disabled={isPending}
            onClick={() => (tab === "signup" ? handleSignUp() : handleLogin())}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 via-sky-600 to-blue-700 px-4 py-3 text-sm font-bold text-white shadow-md shadow-sky-500/20 transition-opacity hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {tab === "signup" ? "Creating account…" : "Logging in…"}
              </>
            ) : tab === "signup" ? (
              <>
                <UserPlus className="h-4 w-4" />
                Sign up & submit application
              </>
            ) : (
              <>
                <LogIn className="h-4 w-4" />
                Login & submit application
              </>
            )}
          </button>
        </div>
          </>
        )}
      </div>
    </div>,
    document.body
  );
}
