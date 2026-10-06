"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

interface CheckoutSessionExpiredModalProps {
  open: boolean;
  onRestart: () => void;
  restarting?: boolean;
}

export function CheckoutSessionExpiredModal({
  open,
  onRestart,
  restarting = false,
}: CheckoutSessionExpiredModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="checkout-session-expired-title"
        className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-md w-full p-6 text-center z-50"
      >
        <h2
          id="checkout-session-expired-title"
          className="text-lg font-bold text-slate-900 tracking-wide border-b border-slate-200 pb-3 mb-4"
        >
          SESSION EXPIRED
        </h2>
        <p className="text-sm text-slate-600 mb-6">
          Your session has expired due to inactivity. Please restart the checkout process to
          refresh stock availability and shipping rates.
        </p>
        <button
          type="button"
          onClick={onRestart}
          disabled={restarting}
          className="bg-slate-900 hover:bg-slate-800 text-white font-semibold py-2.5 px-6 rounded-xl w-full text-sm transition-all shadow-md disabled:opacity-60"
        >
          {restarting ? "Restarting…" : "OK / Restart Checkout"}
        </button>
      </div>
    </div>,
    document.body
  );
}
