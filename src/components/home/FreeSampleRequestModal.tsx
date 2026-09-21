"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Package, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  submitSampleRequest,
  type SampleFilmType,
} from "@/actions/sample-requests";

interface FreeSampleRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  productSlug?: string;
  productName?: string;
}

const EMPTY_FORM = {
  fullName: "",
  companyName: "",
  workEmail: "",
  shippingZip: "",
  shippingAddress: "",
  filmType: "hand" as SampleFilmType,
};

export function FreeSampleRequestModal({
  isOpen,
  onClose,
  productSlug,
  productName,
}: FreeSampleRequestModalProps) {
  const [mounted, setMounted] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      setForm((prev) => ({
        ...prev,
        filmType: productName?.toLowerCase().includes("genesis")
          ? "machine"
          : prev.filmType,
      }));
    }
  }, [isOpen, productName]);

  if (!mounted || !isOpen) return null;

  const update = <K extends keyof typeof EMPTY_FORM>(
    key: K,
    value: (typeof EMPTY_FORM)[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const result = await submitSampleRequest({
        fullName: form.fullName,
        companyName: form.companyName,
        workEmail: form.workEmail,
        shippingZip: form.shippingZip,
        shippingAddress: form.shippingAddress,
        filmType: form.filmType,
        productSlug,
        productName,
      });

      if (!result.success) {
        toast.error(result.error || "Unable to submit sample request.");
        return;
      }

      toast.success(
        result.message ||
          "Sample request received. Our team will contact you shortly."
      );
      setForm(EMPTY_FORM);
      onClose();
    } catch {
      toast.error("Unable to submit sample request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        aria-label="Close sample request dialog"
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-[2px] cursor-pointer"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="free-sample-modal-title"
        className="relative z-10 w-full sm:max-w-lg max-h-[92vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="sticky top-0 flex items-start justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
          <div className="space-y-1 pr-2">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 border border-blue-100 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-blue-700">
              <Package className="h-3 w-3" />
              Free Sample Roll
            </div>
            <h2
              id="free-sample-modal-title"
              className="text-lg sm:text-xl font-black text-slate-900 tracking-tight"
            >
              Request a Free Sample
            </h2>
            {productName ? (
              <p className="text-xs text-slate-500">
                Product interest:{" "}
                <span className="font-semibold text-slate-700">{productName}</span>
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-800 cursor-pointer"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-5 sm:px-6 space-y-4">
          <label className="block space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Full Name
            </span>
            <Input
              required
              value={form.fullName}
              onChange={(e) => update("fullName", e.target.value)}
              placeholder="Jane Smith"
              className="rounded-xl"
            />
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="block space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Company Name
              </span>
              <Input
                required
                value={form.companyName}
                onChange={(e) => update("companyName", e.target.value)}
                placeholder="Acme Logistics"
                className="rounded-xl"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Work Email
              </span>
              <Input
                required
                type="email"
                value={form.workEmail}
                onChange={(e) => update("workEmail", e.target.value)}
                placeholder="jane@company.com"
                className="rounded-xl"
              />
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Shipping ZIP Code
            </span>
            <Input
              required
              value={form.shippingZip}
              onChange={(e) => update("shippingZip", e.target.value)}
              placeholder="78501"
              className="rounded-xl"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Shipping Address (optional)
            </span>
            <Input
              value={form.shippingAddress}
              onChange={(e) => update("shippingAddress", e.target.value)}
              placeholder="Facility street address"
              className="rounded-xl"
            />
          </label>

          <fieldset className="space-y-2">
            <legend className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Current Film Type Used
            </legend>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { value: "hand" as const, label: "Hand Wrap" },
                  { value: "machine" as const, label: "Machine Film" },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => update("filmType", option.value)}
                  className={`rounded-xl border px-3 py-2.5 text-xs font-bold transition-colors cursor-pointer ${
                    form.filmType === option.value
                      ? "border-blue-600 bg-blue-50 text-blue-900"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </fieldset>

          <p className="text-[10px] leading-relaxed text-slate-400">
            *Restrictions apply. Free sample rolls are available strictly for
            verified corporate accounts and high-volume packaging operations in
            the contiguous US. Subject to evaluation and availability.
          </p>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="rounded-xl bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-bold"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Submitting…
                </>
              ) : (
                "Submit Sample Request"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
