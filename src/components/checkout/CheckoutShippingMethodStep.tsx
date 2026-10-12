"use client";

import { useEffect, useMemo, useState } from "react";
import { Calendar, MapPin, Warehouse } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCheckoutState } from "@/components/checkout/CheckoutStateContext";
import { useCartStore } from "@/lib/store/useCartStore";
import { submitInquiry } from "@/actions/inquiries";
import { formatCurrency } from "@/lib/utils";
import { ShippingEligibilityAlert } from "@/components/checkout/ShippingEligibilityAlert";
import { WAREHOUSE_ORIGIN } from "@/lib/shipping-method";
import { scheduleFromTransitDays } from "@/lib/shipping/dates";
import type { ShippingOption } from "@/lib/shipping/types";
import { evalShippingEligibility } from "@/lib/shippingRules";

interface CheckoutShippingMethodStepProps {
  checkoutEmail: string;
  onBack: () => void;
  onProceed: () => void;
}

function tagOptions(options: ShippingOption[]) {
  if (options.length === 0) return [];
  const cheapest = [...options].sort((a, b) => a.price - b.price)[0];
  const fastest = [...options].sort((a, b) => a.transitDays - b.transitDays)[0];
  return [...options]
    .sort((a, b) => a.price - b.price)
    .map((option) => ({
      ...option,
      cheapest: option.id === cheapest?.id,
      fastest: option.id === fastest?.id && option.id !== cheapest?.id,
    }));
}

export function CheckoutShippingMethodStep({
  checkoutEmail,
  onBack,
  onProceed,
}: CheckoutShippingMethodStepProps) {
  const items = useCartStore((state) => state.items);
  const {
    selectedAddress,
    selectedShippingOption,
    setSelectedShippingOption,
    setShipmentWeightLbs,
    setShipmentDimensions,
    setShipmentWeightDetail,
    setDeliveryMethod,
  } = useCheckoutState();
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<ShippingOption[]>([]);
  const [freeLocal, setFreeLocal] = useState<ShippingOption | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const boxCount = useMemo(
    () =>
      items.reduce((total, item) => {
        const boxes = item.totalBoxes && item.totalBoxes > 0 ? item.totalBoxes : 0;
        return total + boxes * item.quantity;
      }, 0),
    [items]
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

  const quoteKey = [
    selectedAddress?.postalCode,
    selectedAddress?.city,
    selectedAddress?.state,
    items.map((item) => `${item.sku}:${item.quantity}:${item.totalBoxes}:${item.totalRolls}`).join(","),
  ].join("|");

  useEffect(() => {
    if (!selectedAddress?.postalCode) return;
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setMessage(null);
      try {
        const response = await fetch("/api/shipping/quote", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            postalCode: selectedAddress.postalCode,
            city: selectedAddress.city,
            state: selectedAddress.state,
            lines: items.map((item) => ({
              sku: item.sku,
              productSlug: item.productSlug,
              quantity: item.quantity,
              totalBoxes: item.totalBoxes,
              totalRolls: item.totalRolls,
              application: item.application,
            })),
          }),
        });
        const payload = (await response.json()) as {
          ok?: boolean;
          weightLbs?: number;
          freeLocal?: ShippingOption | null;
          options?: ShippingOption[];
          dimensions?: string[];
          weightDetail?: string[];
          message?: string | null;
        };
        if (cancelled) return;
        if (typeof payload.weightLbs === "number") setShipmentWeightLbs(payload.weightLbs);
        setShipmentDimensions(payload.dimensions || []);
        setShipmentWeightDetail(payload.weightDetail || []);
        const local = payload.freeLocal || null;
        const warpOptions = payload.options || [];
        setFreeLocal(local);
        setOptions(warpOptions);
        setMessage(payload.message || null);
        const next = local || warpOptions.slice().sort((a, b) => a.price - b.price)[0] || null;
        setSelectedShippingOption(next);
        setDeliveryMethod(next?.id === "rgv-local" ? "rgv-express" : "freight");
      } catch {
        if (!cancelled) {
          setMessage("We couldn't calculate shipping automatically.");
          setOptions([]);
          setFreeLocal(null);
          setSelectedShippingOption(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [
    quoteKey,
    reloadKey,
    items,
    selectedAddress,
    setDeliveryMethod,
    setSelectedShippingOption,
    setShipmentWeightLbs,
    setShipmentDimensions,
    setShipmentWeightDetail,
  ]);

  const cards = useMemo(() => {
    const tagged = tagOptions(options);
    return freeLocal ? [{ ...freeLocal, cheapest: false, fastest: false }, ...tagged] : tagged;
  }, [freeLocal, options]);

  const schedule = selectedShippingOption
    ? scheduleFromTransitDays(selectedShippingOption.transitDays)
    : null;
  const canProceed = Boolean(selectedShippingOption) && !loading;

  const requestManualQuote = async () => {
    if (!selectedAddress) return;
    setRequesting(true);
    const result = await submitInquiry({
      companyName: selectedAddress.companyName || selectedAddress.fullName,
      contactName: selectedAddress.fullName,
      email: checkoutEmail,
      phone: selectedAddress.phone || "",
      monthlyPalletVolume: "1-5 Pallets/Mo",
      productInterest: "Shipping quote",
      shippingZip: selectedAddress.postalCode,
      message: `Manual shipping quote requested for ${selectedAddress.city}, ${selectedAddress.state} ${selectedAddress.postalCode}.`,
    });
    setRequesting(false);
    if (result.success) toast.success("Shipping quote request sent.");
    else toast.error(result.error || "Couldn't send the shipping quote request.");
  };

  const proceed = () => {
    if (!selectedShippingOption) return;
    if (
      selectedShippingOption.expiresAt &&
      Date.parse(selectedShippingOption.expiresAt) <= Date.now()
    ) {
      toast.error("This quote expired. Review the updated price before continuing.");
      setReloadKey((value) => value + 1);
      return;
    }
    onProceed();
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-sky-700">Step 3</p>
        <h2 className="mt-1 text-lg font-black text-slate-900">Shipping Method</h2>
        <p className="mt-1 text-sm text-slate-500">
          Confirm the shipment, choose a delivery method, and review estimated dates.
        </p>
      </div>

      <section className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Shipment preview
        </p>
        <p className="text-sm font-semibold text-slate-900">
          {items.reduce((total, item) => total + item.quantity, 0)} items in this shipment
        </p>
        {selectedAddress ? (
          <div className="flex items-start gap-2 text-sm text-slate-600">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
            <div>
              <p className="font-bold text-slate-900">{selectedAddress.fullName}</p>
              {selectedAddress.companyName && <p>{selectedAddress.companyName}</p>}
              <p>{selectedAddress.streetAddress}</p>
              <p>
                {selectedAddress.city}, {selectedAddress.state} {selectedAddress.postalCode}
              </p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No shipping address selected.</p>
        )}
        <div className="flex items-start gap-2 text-sm text-slate-700">
          <Warehouse className="mt-0.5 h-4 w-4 shrink-0 text-sky-700" />
          <p>
            Ship From: <span className="font-semibold">{WAREHOUSE_ORIGIN}</span>
          </p>
        </div>
        {schedule && (
          <p className="text-sm text-slate-700">
            Estimated Delivery:{" "}
            <span className="font-semibold">{schedule.deliveryLabel}</span>
          </p>
        )}
      </section>

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sky-800">
            <Calendar className="h-4 w-4" />
            <p className="text-[11px] font-bold uppercase tracking-wider">Estimated Ship Date</p>
          </div>
          <p className="mt-2 text-sm font-black text-slate-900">
            {schedule?.shippingLabel || "Next business day"}
          </p>
          {schedule && <p className="mt-1 text-xs text-slate-500">{schedule.shippingDate}</p>}
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sky-800">
            <Calendar className="h-4 w-4" />
            <p className="text-[11px] font-bold uppercase tracking-wider">
              Estimated Delivery Date
            </p>
          </div>
          <p className="mt-2 text-sm font-black text-slate-900">
            {schedule?.deliveryLabel || "Select a delivery method"}
          </p>
          {schedule && <p className="mt-1 text-xs text-slate-500">{schedule.deliveryDate}</p>}
        </div>
      </section>

      <ShippingEligibilityAlert eligibility={shippingEligibility} />

      <section className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Delivery method
        </p>
        {loading ? (
          <div className="space-y-3" aria-hidden>
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-24 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
            ))}
          </div>
        ) : (
          <div role="radiogroup" aria-label="Delivery method" className="space-y-3">
            {cards.map((method) => {
              const selected = selectedShippingOption?.id === method.id;
              return (
                <label
                  key={method.id}
                  className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-2xl border p-4 focus-within:ring-2 focus-within:ring-sky-500 ${
                    selected
                      ? "border-sky-500 bg-sky-50 ring-2 ring-sky-200 shadow-[0_0_0_4px_rgba(14,165,233,0.12)]"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="delivery-method"
                    value={method.id}
                    checked={selected}
                    onChange={() => {
                      setSelectedShippingOption(method);
                      setDeliveryMethod(method.id === "rgv-local" ? "rgv-express" : "freight");
                    }}
                    className="mt-1 h-4 w-4 text-sky-600 focus:ring-sky-500"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-3">
                      <span>
                        <span className="block text-sm font-black text-slate-900">
                          {method.serviceName}
                        </span>
                        <span className="mt-1 flex flex-wrap gap-1.5">
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                            {method.mode === "local" ? "Local" : method.mode}
                          </span>
                          {"cheapest" in method && method.cheapest && (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                              Cheapest
                            </span>
                          )}
                          {"fastest" in method && method.fastest && (
                            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-800">
                              Fastest
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="text-sm font-black text-slate-900">
                        {method.price > 0 ? formatCurrency(method.price) : "$0.00"}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">{method.description}</span>
                    <span className="mt-1 block text-xs font-semibold text-slate-600">
                      {method.transitDays === 1
                        ? "1 business day"
                        : `${method.transitDays} business days`}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        )}
        {!loading && freeLocal && options.length === 0 && (
          <p className="text-xs text-slate-500">
            Other carrier options are unavailable right now.{" "}
            <button
              type="button"
              className="font-semibold text-sky-700 underline underline-offset-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              onClick={() => setReloadKey((value) => value + 1)}
            >
              Retry
            </button>
          </p>
        )}
        {!loading && !freeLocal && cards.length === 0 && message && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p>{message}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="h-10" onClick={() => setReloadKey((value) => value + 1)}>
                Retry
              </Button>
              <Button
                type="button"
                variant="gradient"
                className="h-10"
                disabled={requesting || !checkoutEmail}
                onClick={() => void requestManualQuote()}
              >
                Request a manual shipping quote
              </Button>
            </div>
          </div>
        )}
      </section>

      <div
        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
        aria-live="polite"
      >
        <span className="font-semibold text-slate-600">Estimated shipping</span>
        <span className="font-black text-slate-900">
          {selectedShippingOption
            ? selectedShippingOption.price > 0
              ? formatCurrency(selectedShippingOption.price)
              : "$0.00"
            : "—"}
        </span>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button type="button" variant="outline" className="h-12 md:h-10" onClick={onBack}>
          Back to Address
        </Button>
        <Button
          type="button"
          variant="gradient"
          className="hidden h-12 md:inline-flex md:h-10"
          onClick={proceed}
          disabled={!canProceed}
        >
          Proceed to Payment
        </Button>
      </div>
    </div>
  );
}
