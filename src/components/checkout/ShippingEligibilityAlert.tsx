"use client";

import {
  LOGISTICS_EMAIL,
  LOGISTICS_PHONE_DISPLAY,
  LOGISTICS_PHONE_TEL,
  type ShippingEligibility,
} from "@/lib/shippingRules";

const alertClass =
  "bg-blue-50 border border-blue-200 text-blue-900 rounded-2xl p-4";

export function ShippingEligibilityAlert({
  eligibility,
}: {
  eligibility: ShippingEligibility;
}) {
  if (!eligibility.banner && !eligibility.badge && !eligibility.notice) {
    return null;
  }

  return (
    <div className="space-y-3">
      {eligibility.banner && (
        <div className={`${alertClass} text-sm leading-relaxed`}>{eligibility.banner}</div>
      )}
      {(eligibility.badge || eligibility.notice) && (
        <div className={`${alertClass} space-y-3`}>
          {eligibility.badge && (
            <span className="inline-flex rounded-full border border-blue-200 bg-white px-2.5 py-1 text-xs font-bold text-blue-900">
              {eligibility.badge}
            </span>
          )}
          {eligibility.notice && (
            <p className="text-sm leading-relaxed">{eligibility.notice}</p>
          )}
          {eligibility.showQuoteActions && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <a
                href={`mailto:${LOGISTICS_EMAIL}?subject=${encodeURIComponent("LTL Freight Quote")}`}
                className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-white px-4 py-2 text-xs font-semibold text-blue-900 hover:bg-blue-100"
              >
                Request LTL Freight Quote
              </a>
              <a
                href={`tel:${LOGISTICS_PHONE_TEL}`}
                className="inline-flex items-center justify-center rounded-xl border border-blue-200 bg-white px-4 py-2 text-xs font-semibold text-blue-900 hover:bg-blue-100"
              >
                Call Logistics Dept for Direct Freight Rates
              </a>
            </div>
          )}
          {eligibility.showQuoteActions && (
            <p className="text-xs text-blue-800">
              {LOGISTICS_EMAIL} · {LOGISTICS_PHONE_DISPLAY}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
