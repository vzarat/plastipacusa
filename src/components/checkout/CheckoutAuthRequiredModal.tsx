"use client";

import React from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Lock, LogIn, UserPlus, X } from "lucide-react";
interface CheckoutAuthRequiredModalProps {
  open: boolean;
  onClose: () => void;
  /** Path to return to after auth (default /checkout) */
  redirectTo?: string;
}

/**
 * Explains that B2B checkout requires an account, with Sign In / Register CTAs.
 */
export function CheckoutAuthRequiredModal({
  open,
  onClose,
  redirectTo = "/checkout",
}: CheckoutAuthRequiredModalProps) {
  if (!open || typeof document === "undefined") return null;

  const redirect = encodeURIComponent(redirectTo);
  const loginHref = `/login?redirect=${redirect}`;
  const registerHref = `/register?redirect=${redirect}`;

  return createPortal(
    <div
      className="fixed inset-0 z-[120] flex items-end justify-center bg-slate-950/50 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="checkout-auth-title"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="bg-gradient-to-r from-blue-700 via-blue-600 to-indigo-800 px-6 py-5 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/25 bg-white/10">
              <Lock className="h-5 w-5 text-sky-100" aria-hidden />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-sky-100/90">
                B2B account required
              </p>
              <h2
                id="checkout-auth-title"
                className="text-base font-extrabold leading-snug"
              >
                Sign in to complete checkout
              </h2>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-6 py-5">
          <p className="text-sm leading-relaxed text-slate-600">
            You must sign in or create a B2B account to complete your order.
          </p>

          <div className="flex flex-col gap-2.5 pt-1">
            <Link
              href={loginHref}
              onClick={onClose}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 via-sky-600 to-blue-700 px-4 py-3 text-sm font-bold text-white shadow-md shadow-sky-500/20 transition-opacity hover:opacity-95"
            >
              <LogIn className="h-4 w-4" aria-hidden />
              Sign In
            </Link>
            <Link
              href={registerHref}
              onClick={onClose}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-800 transition-colors hover:bg-slate-50"
            >
              <UserPlus className="h-4 w-4" aria-hidden />
              Create B2B Account
            </Link>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
