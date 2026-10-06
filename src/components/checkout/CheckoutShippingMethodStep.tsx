"use client";

import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, Calendar, Loader2, MapPin, Warehouse, X } from "lucide-react";
import { toast } from "sonner";
import { submitTaxExemptionRequest } from "@/actions/tax-exemption";
import { Button } from "@/components/ui/button";
import { useCheckoutState } from "@/components/checkout/CheckoutStateContext";
import { useCartStore } from "@/lib/store/useCartStore";
import { formatCurrency } from "@/lib/utils";
import { ShippingEligibilityAlert } from "@/components/checkout/ShippingEligibilityAlert";
import {
  WAREHOUSE_ORIGIN,
  activeShippingMethod,
  buildShippingOffer,
  buildShippingSchedule,
  countCartBoxes,
  estimateShippingCost,
  type DeliveryMethodId,
  type ShippingSchedule,
} from "@/lib/shipping-method";
import { evalShippingEligibility } from "@/lib/shippingRules";

const fieldClass =
  "h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 md:h-auto md:py-2.5";

const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS",
  "KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY",
  "NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV",
  "WI","WY","DC",
];

interface CheckoutShippingMethodStepProps {
  checkoutEmail: string;
  onBack: () => void;
  onProceed: () => void;
}

export function CheckoutShippingMethodStep({
  checkoutEmail,
  onBack,
  onProceed,
}: CheckoutShippingMethodStepProps) {
  const items = useCartStore((state) => state.items);
  const totalWeight = useCartStore((state) => state.getTotalWeight());
  const {
    selectedAddress,
    deliveryMethod,
    setDeliveryMethod,
    taxExemptRequested,
    setTaxExemptRequested,
  } = useCheckoutState();
  const [schedule, setSchedule] = useState<ShippingSchedule | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [companyName, setCompanyName] = useState(selectedAddress?.companyName || "");
  const [taxId, setTaxId] = useState("");
  const [registrationState, setRegistrationState] = useState(selectedAddress?.state || "");
  const [note, setNote] = useState("");
  const [certificate, setCertificate] = useState<File | null>(null);

  useEffect(() => {
    setSchedule(buildShippingSchedule(new Date()));
  }, []);

  const itemCount = useMemo(
    () => items.reduce((total, item) => total + item.quantity, 0),
    [items]
  );
  const boxCount = useMemo(() => countCartBoxes(items), [items]);
  const shippingOffer = useMemo(
    () =>
      buildShippingOffer({
        city: selectedAddress?.city,
        state: selectedAddress?.state,
        postalCode: selectedAddress?.postalCode,
        boxCount,
        weightLbs: totalWeight,
      }),
    [selectedAddress, boxCount, totalWeight]
  );
  const shippingEligibility = useMemo(
    () =>
      evalShippingEligibility(
        selectedAddress?.postalCode || "",
        selectedAddress?.city || "",
        selectedAddress?.state || "",
        boxCount
      ),
    [selectedAddress, boxCount]
  );
  const activeMethod = activeShippingMethod(deliveryMethod, shippingOffer);

  useEffect(() => {
    if (deliveryMethod !== activeMethod) {
      setDeliveryMethod(activeMethod);
    }
  }, [activeMethod, deliveryMethod, setDeliveryMethod]);

  const shippingCost = estimateShippingCost(activeMethod, totalWeight, boxCount);

  const submitExemption = async () => {
    const formData = new FormData();
    formData.set("companyName", companyName);
    formData.set("taxId", taxId);
    formData.set("registrationState", registrationState);
    formData.set("note", note);
    formData.set("customerEmail", checkoutEmail);
    formData.set("customerName", selectedAddress?.fullName || "");
    formData.set(
      "shippingSummary",
      selectedAddress
        ? [
            selectedAddress.fullName,
            selectedAddress.streetAddress,
            `${selectedAddress.city}, ${selectedAddress.state} ${selectedAddress.postalCode}`,
          ].join(", ")
        : ""
    );
    if (certificate) formData.set("certificate", certificate);

    setSaving(true);
    const result = await submitTaxExemptionRequest(formData);
    setSaving(false);

    if (!result.success) {
      toast.error(result.error || "Could not send the tax exemption request.");
      return;
    }

    setTaxExemptRequested(true);
    setModalOpen(false);
    toast.success("Tax exemption request sent for verification.");
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-sky-700">
          Step 3
        </p>
        <h2 className="mt-1 text-lg font-black text-slate-900">Shipping Method</h2>
        <p className="mt-1 text-sm text-slate-500">
          Confirm the shipment, choose a delivery method, and review estimated dates.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Shipment preview
        </p>
        <p className="text-sm font-semibold text-slate-900">
          {itemCount} {itemCount === 1 ? "item" : "items"} in this shipment
        </p>
        {selectedAddress ? (
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
            <div>
              <p className="font-bold text-slate-900">{selectedAddress.fullName}</p>
              {selectedAddress.companyName && <p>{selectedAddress.companyName}</p>}
              <p>{selectedAddress.streetAddress}</p>
              <p>
                {selectedAddress.city}, {selectedAddress.state}{" "}
                {selectedAddress.postalCode}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No shipping address selected.</p>
        )}
        <div className="flex items-start gap-2 text-sm text-slate-700">
          <Warehouse className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
          <p>
            Ship From:{" "}
            <span className="font-semibold">{WAREHOUSE_ORIGIN}</span>
          </p>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sky-800">
            <Calendar className="h-4 w-4" />
            <p className="text-[11px] font-bold uppercase tracking-wider">
              Estimated Ship Date
            </p>
          </div>
          <p className="mt-2 text-sm font-black text-slate-900">
            {schedule?.shippingLabel || "Next business day"}
          </p>
          {schedule && (
            <p className="mt-1 text-xs text-slate-500">{schedule.shippingDate}</p>
          )}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sky-800">
            <Calendar className="h-4 w-4" />
            <p className="text-[11px] font-bold uppercase tracking-wider">
              Estimated Delivery Date
            </p>
          </div>
          <p className="mt-2 text-sm font-black text-slate-900">
            {schedule?.deliveryLabel || "2–3 business days"}
          </p>
          {schedule && (
            <p className="mt-1 text-xs text-slate-500">{schedule.deliveryRange}</p>
          )}
        </div>
      </section>

      <ShippingEligibilityAlert eligibility={shippingEligibility} />

      <section className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Delivery method
        </p>
        <ul className="space-y-3">
          {shippingOffer.options.map((method) => {
            const selected = activeMethod === method.id;
            const cost = estimateShippingCost(method.id, totalWeight, boxCount);
            return (
              <li key={method.id}>
                <label
                  className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-2xl border p-4 ${
                    selected
                      ? "border-sky-500 bg-sky-50 ring-2 ring-sky-200"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="delivery-method"
                    checked={selected}
                    onChange={() => setDeliveryMethod(method.id as DeliveryMethodId)}
                    className="mt-1 h-4 w-4 text-sky-600 focus:ring-sky-500"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-3">
                      <span className="text-sm font-black text-slate-900">
                        {method.label}
                      </span>
                      <span className="text-sm font-black text-slate-900">
                        {formatCurrency(cost)}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {method.description}
                    </span>
                    {selected && method.scheduleNote && (
                      <span className="mt-2 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-800">
                        {method.scheduleNote}
                      </span>
                    )}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm">
        <span className="font-semibold text-slate-600">Estimated shipping</span>
        <span className="font-black text-slate-900">
          {formatCurrency(shippingCost)}
        </span>
      </div>

      {taxExemptRequested ? (
        <div className="flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Tax exemption request sent. Sales tax stays on this order until the
            team verifies the certificate.
          </p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="w-full rounded-2xl border border-sky-300 bg-sky-50 px-4 py-3 text-left text-sm font-black text-sky-800 hover:bg-sky-100"
        >
          Tax Exempt Customer?
        </button>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button type="button" variant="outline" className="h-12 md:h-10" onClick={onBack}>
          Back to Address
        </Button>
        <Button
          type="button"
          variant="gradient"
          className="hidden h-12 md:inline-flex md:h-10"
          onClick={onProceed}
          disabled={!selectedAddress}
        >
          Proceed to Payment
        </Button>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50"
            aria-label="Close tax exemption form"
            onClick={() => setModalOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tax-exempt-title"
            className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl sm:p-6"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 id="tax-exempt-title" className="text-lg font-black text-slate-900">
                  Tax exemption
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Send your resale certificate to the Plastipac team for verification.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Company name *
                </span>
                <input
                  className={fieldClass}
                  value={companyName}
                  onChange={(event) => setCompanyName(event.target.value)}
                  autoComplete="organization"
                  inputMode="text"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Tax ID / resale certificate number *
                </span>
                <input
                  className={fieldClass}
                  value={taxId}
                  onChange={(event) => setTaxId(event.target.value)}
                  autoComplete="off"
                  inputMode="text"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  State of registration *
                </span>
                <select
                  className={fieldClass}
                  value={registrationState}
                  onChange={(event) => setRegistrationState(event.target.value)}
                >
                  <option value="">Select a state</option>
                  {US_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Certificate upload
                </span>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.webp,application/pdf,image/png,image/jpeg,image/webp"
                  className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-sky-50 file:px-3 file:py-2 file:text-xs file:font-bold file:text-sky-800"
                  onChange={(event) => setCertificate(event.target.files?.[0] || null)}
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Note
                </span>
                <textarea
                  className={`${fieldClass} min-h-24`}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Optional details for the verification team"
                />
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="gradient"
                disabled={saving}
                onClick={() => void submitExemption()}
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending…
                  </>
                ) : (
                  "Submit for verification"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
