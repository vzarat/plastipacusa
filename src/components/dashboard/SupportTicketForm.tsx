"use client";

import React, { useState, useTransition } from "react";
import { toast } from "sonner";
import { CheckCircle2, Loader2, LifeBuoy, Send } from "lucide-react";
import {
  submitSupportTicket,
  type SupportTicketCategory,
} from "@/actions/support-tickets";
import {
  isBrowserTurnstileEnabled,
  TurnstileField,
} from "@/components/security/TurnstileField";

const CATEGORIES: { value: SupportTicketCategory; label: string }[] = [
  { value: "platform", label: "Platform / Website" },
  { value: "orders", label: "Orders / Shipping" },
  { value: "account", label: "Account / Login" },
  { value: "other", label: "Other" },
];

export function SupportTicketForm() {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<SupportTicketCategory>("platform");
  const [message, setMessage] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();
  const turnstileRequired = isBrowserTurnstileEnabled();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (turnstileRequired && !turnstileToken) {
      toast.error("Please complete the bot check.");
      return;
    }

    startTransition(async () => {
      const result = await submitSupportTicket({
        subject,
        category,
        message,
        turnstileToken: turnstileToken || undefined,
      });

      if (!result.success) {
        toast.error(result.error || "Could not send your ticket.");
        return;
      }

      setSent(true);
      setSubject("");
      setMessage("");
      setCategory("platform");
      setTurnstileToken(null);
      toast.success("Ticket sent. Our support team will follow up by email.");
    });
  };

  if (sent) {
    return (
      <div className="rounded-3xl border border-emerald-200 bg-emerald-50/70 p-6 sm:p-7 space-y-3">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">
              Ticket submitted
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Thanks — your message was sent to our support desk. We will reply
              to the email on your account as soon as we can.
            </p>
            <button
              type="button"
              onClick={() => setSent(false)}
              className="mt-2 text-xs font-bold text-emerald-800 underline-offset-2 hover:underline cursor-pointer"
            >
              Submit another ticket
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm space-y-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-sky-600 text-white">
          <LifeBuoy className="h-5 w-5" />
        </div>
        <div className="space-y-1 min-w-0">
          <h3 className="text-base font-bold text-slate-900">
            Having trouble with the platform?
          </h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            Open a support ticket and tell us what went wrong — login issues,
            checkout errors, missing orders, or anything else in your customer
            portal. We will review it at{" "}
            <span className="font-semibold text-slate-800">
              support@plastipacusa.com
            </span>
            .
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label
              htmlFor="support-ticket-category"
              className="block text-[11px] font-bold uppercase tracking-wider text-slate-500"
            >
              Category
            </label>
            <select
              id="support-ticket-category"
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as SupportTicketCategory)
              }
              disabled={isPending}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:opacity-60 cursor-pointer"
            >
              {CATEGORIES.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <label
              htmlFor="support-ticket-subject"
              className="block text-[11px] font-bold uppercase tracking-wider text-slate-500"
            >
              Subject
            </label>
            <input
              id="support-ticket-subject"
              type="text"
              required
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              disabled={isPending}
              placeholder="e.g. Cannot open an invoice PDF"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:opacity-60"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="support-ticket-message"
            className="block text-[11px] font-bold uppercase tracking-wider text-slate-500"
          >
            Describe the problem
          </label>
          <textarea
            id="support-ticket-message"
            required
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={isPending}
            placeholder="What were you trying to do, what happened, and any error messages you saw…"
            className="w-full resize-y rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-200 disabled:opacity-60 min-h-[8rem]"
          />
        </div>

        <TurnstileField onToken={setTurnstileToken} />

        <button
          type="submit"
          disabled={
            isPending || (turnstileRequired && !turnstileToken)
          }
          className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-950 disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
          <span>{isPending ? "Sending ticket…" : "Submit support ticket"}</span>
        </button>
      </form>
    </div>
  );
}
