"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Warehouse } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useCheckoutState } from "@/components/checkout/CheckoutStateContext";
import { quotePackageWeightLbs } from "@/lib/package-weight";
import { useCartStore } from "@/lib/store/useCartStore";
import { submitInquiry } from "@/actions/inquiries";
import { formatCurrency } from "@/lib/utils";
import { ShippingEligibilityAlert } from "@/components/checkout/ShippingEligibilityAlert";
import { WAREHOUSE_ORIGIN } from "@/lib/shipping-method";
import { CarrierLogo } from "@/components/checkout/CarrierLogo";
import { featuredCarrierOptions } from "@/lib/shipping/featured-options";
import {
  AUTO_REQUOTE_CAP,
  blocksCardStep,
  decideRequote,
  shouldAutoRequote,
} from "@/lib/shipping/quote-window";
import type { ShippingOption } from "@/lib/shipping/types";
import { evalShippingEligibility } from "@/lib/shippingRules";
import {
  formatFridayDeliveryDate,
  FRIDAY_FREE_DELIVERY_LABEL,
  nextFridayDeliveryIso,
} from "@/lib/shipping/friday-delivery";

function shippingQuoteLines(
  items: Array<{
    sku: string;
    productSlug: string;
    quantity: number;
    totalBoxes?: number;
    totalRolls?: number;
    application: string;
    weightLbs: string;
    widthInches: string;
    gauge: number;
    lengthFeet: number;
  }>
) {
  const lines = items.map((item) => {
    const weightLbs = quotePackageWeightLbs({
      application: item.application,
      boxes: item.totalBoxes,
      rolls: item.totalRolls,
      weightLbs: item.weightLbs,
      widthInches: item.widthInches,
      gauge: item.gauge,
      lengthFeet: item.lengthFeet,
    });
    return {
      sku: item.sku,
      productSlug: item.productSlug,
      quantity: item.quantity,
      totalBoxes: item.totalBoxes,
      totalRolls: item.totalRolls,
      application: item.application,
      weightLbs: weightLbs ?? 0,
    };
  });
  console.info("[shipping-quote] request", lines);
  return lines;
}

interface CheckoutShippingMethodStepProps {
  checkoutEmail: string;
  onBack: () => void;
  onProceed: () => void;
  active?: boolean;
}

const PLAIN_FAILURE = "We couldn't calculate shipping automatically.";
function serviceCopy(level: string | undefined): { title: string; detail: string } | null {
  if (!level) return null;
  const key = level.toUpperCase();
  if (key === "STANDARD" || key === "STD" || key === "STND") {
    return { title: "Standard", detail: "Standard service from this carrier." };
  }
  if (key === "ECONOMY") {
    return { title: "Economy", detail: "Economy service from this carrier." };
  }
  if (key === "PRIORITY") {
    return { title: "Priority", detail: "Priority service from this carrier." };
  }
  if (key === "GUARANTEED") {
    return { title: "Guaranteed", detail: "Guaranteed service from this carrier." };
  }
  return {
    title: level,
    detail: "Warp returns this service level without a published description.",
  };
}
const EXPIRED_QUOTE = "This shipping quote expired. Review the updated price before paying.";
const REQUOTE_FAILED = "We couldn't refresh this shipping price.";

interface QuotePayload {
  ok?: boolean;
  fallback?: string;
  message?: string | null;
  freeLocal?: ShippingOption | null;
  options?: ShippingOption[];
  weightLbs?: number;
  dimensions?: string[];
  weightDetail?: string[];
  note?: string | null;
  requestId?: string | null;
  error?: { code?: string; message?: string; providerMessage?: string; requestId?: string } | null;
}

function fullZip(postalCode: string | undefined): string | null {
  const digits = String(postalCode || "").replace(/\D/g, "");
  if (digits.length < 5) return null;
  return digits.slice(0, 5);
}

function deliveryMethodForOption(option: { id: string; mode?: string }) {
  if (option.id === "rgv-local") return "rgv-express" as const;
  if (option.id === "houston-friday") return "houston-friday" as const;
  if (option.mode === "parcel") return "ground" as const;
  return "freight" as const;
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

function countdownLabel(expiresAt: string | null, now: number): string | null {
  if (!expiresAt) return null;
  const expires = Date.parse(expiresAt);
  if (!Number.isFinite(expires)) return null;
  const totalSeconds = Math.max(0, Math.floor((expires - now) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function CheckoutShippingMethodStep({
  checkoutEmail,
  onBack,
  onProceed,
  active = true,
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
  const [quoteNote, setQuoteNote] = useState<string | null>(null);
  const [quoteErrorCode, setQuoteErrorCode] = useState<string | null>(null);
  const [quoteRequestId, setQuoteRequestId] = useState<string | null>(null);
  const [showErrorCode, setShowErrorCode] = useState(false);
  const [manualQuote, setManualQuote] = useState(false);
  const [priceUpdated, setPriceUpdated] = useState<number | null>(null);
  const [showAllOptions, setShowAllOptions] = useState(false);
  const [requoteFailed, setRequoteFailed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const requestRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const selectedRef = useRef(selectedShippingOption);
  const autoCountRef = useRef(0);
  const requoteLockRef = useRef<string | null>(null);
  const quotedKeyRef = useRef<string | null>(null);
  selectedRef.current = selectedShippingOption;

  const boxCount = useMemo(
    () =>
      items.reduce((total, item) => {
        const boxes = item.totalBoxes && item.totalBoxes > 0 ? item.totalBoxes : 0;
        return total + boxes * item.quantity;
      }, 0),
    [items]
  );
  const cartRolls = useMemo(
    () => items.reduce((total, item) => total + (Number(item.totalRolls) || 0), 0),
    [items]
  );
  const shippingEligibility = useMemo(
    () =>
      evalShippingEligibility(
        selectedAddress?.postalCode || "",
        selectedAddress?.city || "",
        selectedAddress?.state || "",
        boxCount,
        cartRolls
      ),
    [selectedAddress, boxCount, cartRolls]
  );

  const quoteKey = [
    selectedAddress?.postalCode,
    selectedAddress?.city,
    selectedAddress?.state,
    items.map((item) => `${item.sku}:${item.quantity}:${item.totalBoxes}:${item.totalRolls}`).join(","),
  ].join("|");

  const selectionKey = selectedShippingOption
    ? [
        selectedShippingOption.carrierKey ?? "",
        selectedShippingOption.serviceLevel ?? "",
        selectedShippingOption.transitDays,
      ].join("|")
    : null;

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active]);

  useEffect(() => {
    if (!active) return;
    const requestKey = `${quoteKey}#${reloadKey}`;
    if (quotedKeyRef.current === requestKey) return;
    const zip = fullZip(selectedAddress?.postalCode);
    if (!selectedAddress || !zip) {
      abortRef.current?.abort();
      requestRef.current += 1;
      setLoading(false);
      setOptions([]);
      setFreeLocal(null);
      setManualQuote(false);
      autoCountRef.current = 0;
      requoteLockRef.current = null;
      setSelectedShippingOption(null);
      return;
    }

    const requestId = ++requestRef.current;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const lines = shippingQuoteLines(items);
    const address = selectedAddress;

    const load = async () => {
      setLoading(true);
      setMessage(null);
      setManualQuote(false);
      setPriceUpdated(null);
      setRequoteFailed(false);
      autoCountRef.current = 0;
      requoteLockRef.current = null;
      setSelectedShippingOption(null);
      try {
        const response = await fetch("/api/shipping/quote", {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            postalCode: zip,
            street: address.streetAddress,
            city: address.city,
            state: address.state,
            lines,
          }),
        });
        const payload = (await response.json()) as QuotePayload;
        if (requestId !== requestRef.current) return;
        quotedKeyRef.current = requestKey;
        if (typeof payload.weightLbs === "number") setShipmentWeightLbs(payload.weightLbs);
        setShipmentDimensions(payload.dimensions || []);
        setShipmentWeightDetail(payload.weightDetail || []);
        if (payload.ok === false && payload.fallback === "manual_quote") {
          setFreeLocal(payload.freeLocal || null);
          setOptions([]);
          setManualQuote(true);
          setMessage(payload.message || PLAIN_FAILURE);
          setQuoteNote(payload.note || payload.error?.message || payload.error?.providerMessage || null);
          setQuoteErrorCode(payload.error?.code || "UNKNOWN");
          setQuoteRequestId(payload.error?.requestId || payload.requestId || null);
          setShowErrorCode(false);
          return;
        }
        if (!response.ok || payload.ok === false) {
          setFreeLocal(payload.freeLocal || null);
          setOptions([]);
          setManualQuote(true);
          setMessage(payload.message || PLAIN_FAILURE);
          setQuoteNote(payload.note || payload.error?.message || payload.error?.providerMessage || null);
          setQuoteErrorCode(payload.error?.code || "UNKNOWN");
          setQuoteRequestId(payload.error?.requestId || payload.requestId || null);
          setShowErrorCode(false);
          return;
        }
        const local = payload.freeLocal || null;
        const quoted = payload.options || [];
        if (!local && quoted.length === 0) {
          setFreeLocal(null);
          setOptions([]);
          setManualQuote(true);
          setMessage(PLAIN_FAILURE);
          setQuoteNote(payload.note || null);
          setQuoteErrorCode(payload.error?.code || "NO_OPTIONS");
          setQuoteRequestId(payload.error?.requestId || payload.requestId || null);
          setShowErrorCode(false);
          setSelectedShippingOption(null);
          return;
        }
        setFreeLocal(local);
        setOptions(quoted);
        setShowAllOptions(false);
        setQuoteNote(null);
        setQuoteErrorCode(null);
        setQuoteRequestId(null);
        setShowErrorCode(false);
        setMessage(payload.message || null);
        const cheapest = [...quoted].sort((a, b) => a.price - b.price)[0] || null;
        const selected = local || cheapest;
        setSelectedShippingOption(selected);
        setDeliveryMethod(selected ? deliveryMethodForOption(selected) : "ground");
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") return;
        if (requestId !== requestRef.current) return;
        quotedKeyRef.current = requestKey;
        setFreeLocal(null);
        setOptions([]);
        setManualQuote(true);
        setMessage(PLAIN_FAILURE);
        setQuoteErrorCode("UNKNOWN");
        setQuoteRequestId(null);
        setQuoteNote(null);
        setShowErrorCode(false);
      } finally {
        if (requestId === requestRef.current) setLoading(false);
      }
    };

    void load();
    return () => {
      controller.abort();
    };
  }, [active, quoteKey, reloadKey]);

  const refreshSelectedQuote = async (manual = false) => {
    const selected = selectedRef.current;
    const address = selectedAddress;
    const zip = fullZip(address?.postalCode);
    if (!selected || !address || !zip || !selected.expiresAt) return;
    const requestId = ++requestRef.current;
    const countAtStart = autoCountRef.current;
    const selectedId = selected.id;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setRefreshing(true);
    try {
      const response = await fetch("/api/shipping/quote", {
        method: "POST",
        headers: { "content-type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          postalCode: zip,
          street: address.streetAddress,
          city: address.city,
          state: address.state,
          lines: shippingQuoteLines(items),
        }),
      });
      const payload = (await response.json()) as QuotePayload;
      const failed = !response.ok || payload.ok === false;
      const selectionMoved = selectedRef.current?.id !== selectedId;
      const decision = decideRequote({
        requestId: selectionMoved ? requestId + 1 : requestRef.current,
        responseRequestId: requestId,
        autoRequotes: countAtStart,
        manual,
        failed,
        selected,
        options: payload.options || [],
      });
      if (decision.type === "stale" || decision.type === "cap") return;
      if (decision.type === "keep") {
        setRequoteFailed(true);
        return;
      }
      setRequoteFailed(false);
      setFreeLocal(payload.freeLocal || null);
      setOptions(payload.options || []);
      if (decision.type === "clear") {
        setSelectedShippingOption(null);
        setPriceUpdated(null);
        return;
      }
      const next = (payload.options || []).find((option) => option.id === decision.quoteId) || null;
      if (!next) {
        setSelectedShippingOption(null);
        setPriceUpdated(null);
        return;
      }
      autoCountRef.current = manual ? 0 : autoCountRef.current + 1;
      if (manual) requoteLockRef.current = null;
      setSelectedShippingOption(next);
      setDeliveryMethod(deliveryMethodForOption(next));
      setPriceUpdated(decision.priceUpdated ? next.price : null);
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      if (requestId !== requestRef.current) return;
      const decision = decideRequote({
        requestId,
        responseRequestId: requestId,
        autoRequotes: countAtStart,
        manual,
        failed: true,
        selected,
        options: [],
      });
      if (decision.type === "keep") setRequoteFailed(true);
    } finally {
      if (requestId === requestRef.current) setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!active) return;
    const selected = selectedShippingOption;
    if (!selected?.expiresAt) return;
    const windowDue = shouldAutoRequote({
      expiresAt: selected.expiresAt,
      now,
      autoRequotes: autoCountRef.current,
      stepVisible: active,
    });
    const expiredDue =
      blocksCardStep(selected.expiresAt, now) && autoCountRef.current < AUTO_REQUOTE_CAP;
    if (!windowDue && !expiredDue) return;
    const lock = `${selectionKey}:${selected.expiresAt}`;
    if (requoteLockRef.current === lock) return;
    requoteLockRef.current = lock;
    void refreshSelectedQuote();
  }, [now, selectedShippingOption, selectionKey, active]);

  const wasActiveRef = useRef(active);
  useEffect(() => {
    const returned = active && !wasActiveRef.current;
    wasActiveRef.current = active;
    if (!returned || !selectedRef.current) return;
    if (blocksCardStep(selectedRef.current.expiresAt)) {
      setReloadKey((value) => value + 1);
    }
  }, [active]);

  const cards = useMemo(() => {
    const tagged = tagOptions(options);
    const featured = featuredCarrierOptions(tagged);
    const shown = showAllOptions ? [...featured.shown, ...featured.hidden] : featured.shown;
    const combined = freeLocal ? [{ ...freeLocal, cheapest: false, fastest: false }, ...shown] : shown;
    const free = combined.filter((option) => option.price === 0);
    const carriers = combined.filter((option) => option.price !== 0);
    return {
      visible: [...free, ...carriers],
      hiddenCount: featured.hidden.length,
    };
  }, [freeLocal, options, showAllOptions]);

  const expired = selectedShippingOption
    ? blocksCardStep(selectedShippingOption.expiresAt, now)
    : false;
  const canProceed = Boolean(selectedShippingOption) && !loading && !expired;
  const countdown = selectedShippingOption
    ? countdownLabel(selectedShippingOption.expiresAt, now)
    : null;

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
    if (!selectedShippingOption || expired) {
      if (expired) toast.error(EXPIRED_QUOTE);
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
          Confirm the shipment and choose a delivery method.
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
      </section>

      <ShippingEligibilityAlert eligibility={shippingEligibility} />

      {priceUpdated != null && (
        <p className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-950" role="status">
          Shipping price updated to {formatCurrency(priceUpdated)}. Review it before you continue.
        </p>
      )}
      {expired && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="alert">
          <p className="font-semibold">{EXPIRED_QUOTE}</p>
          <Button
            type="button"
            variant="outline"
            className="mt-3 h-10"
            disabled={refreshing}
            onClick={() => void refreshSelectedQuote(true)}
          >
            {refreshing ? "Refreshing shipping price…" : "Refresh shipping price"}
          </Button>
        </div>
      )}
      {requoteFailed && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950" role="status">
          <p>{REQUOTE_FAILED}</p>
          {!expired && (
            <Button
              type="button"
              variant="outline"
              className="mt-3 h-10"
              disabled={refreshing}
              onClick={() => void refreshSelectedQuote(false)}
            >
              {refreshing ? "Refreshing shipping price…" : "Retry"}
            </Button>
          )}
        </div>
      )}

      <section className="space-y-3">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Delivery method
        </p>
        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-4" role="status">
            <p className="text-sm font-semibold text-slate-800">Quoting your shipment</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
              <div className="animate-splash-bar h-full w-1/3 rounded-full bg-sky-600" />
            </div>
          </div>
        ) : (
          <div role="radiogroup" aria-label="Delivery method" className="space-y-3">
            {cards.visible.map((method) => {
              const selected = selectedShippingOption?.id === method.id;
              const scheduledFriday =
                method.id === "rgv-local" || method.id === "houston-friday"
                  ? nextFridayDeliveryIso()
                  : null;
              const methodForSelection = scheduledFriday
                ? {
                    ...method,
                    serviceName: FRIDAY_FREE_DELIVERY_LABEL,
                    deliveryDate: scheduledFriday,
                    description: `Plastipac fleet delivery on ${formatFridayDeliveryDate(scheduledFriday)}.`,
                  }
                : method;
              const title = methodForSelection.carrierName || methodForSelection.serviceName;
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
                      autoCountRef.current = 0;
                      requoteLockRef.current = null;
                      setPriceUpdated(null);
                      setRequoteFailed(false);
                      setSelectedShippingOption(methodForSelection);
                      setDeliveryMethod(deliveryMethodForOption(methodForSelection));
                    }}
                    className="mt-1 h-4 w-4 text-sky-600 focus:ring-sky-500"
                  />
                  <CarrierLogo carrierKey={method.carrierKey} name={title} serviceLevel={method.serviceLevel} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-3">
                      <span>
                        <span className="block text-sm font-black text-slate-900">{title}</span>
                        <span className="mt-1 flex flex-wrap gap-1.5">
                          {serviceCopy(method.serviceLevel) && (
                            <span className="group relative">
                              <span
                                tabIndex={0}
                                title={serviceCopy(method.serviceLevel)?.detail}
                                className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600 outline-none focus:ring-2 focus:ring-sky-500"
                              >
                                {serviceCopy(method.serviceLevel)?.title}
                              </span>
                              <span className="absolute left-0 top-full z-10 mt-1 hidden w-52 rounded-lg bg-slate-900 px-2 py-1.5 text-[11px] font-medium normal-case tracking-normal text-white group-hover:block group-focus-within:block">
                                {serviceCopy(method.serviceLevel)?.detail}
                              </span>
                            </span>
                          )}
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                            {method.mode === "local" ? "Local" : method.mode === "parcel" ? "Ground" : method.mode}
                          </span>
                          {"cheapest" in method && method.cheapest && (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                              Lowest price
                            </span>
                          )}
                          {"fastest" in method && method.fastest && (
                            <span className="rounded-full bg-sky-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-800">
                              Fastest
                            </span>
                          )}
                          {(method.id === "rgv-local" || method.id === "houston-friday") && (
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-700">
                              Free shipping
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="text-sm font-black text-slate-900">
                        {method.price > 0 ? formatCurrency(method.price) : "$0.00"}
                      </span>
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">{methodForSelection.description}</span>
                    {scheduledFriday ? (
                      <label className="mt-2 block" onClick={(event) => event.stopPropagation()}>
                        <span className="block text-[10px] font-bold uppercase tracking-wide text-emerald-800">
                          Delivery date
                        </span>
                        <select
                          aria-label="Friday delivery date"
                          value={scheduledFriday}
                          onChange={() => undefined}
                          className="mt-1 h-10 w-full rounded-xl border border-emerald-200 bg-white px-3 text-sm font-semibold text-slate-900"
                        >
                          <option value={scheduledFriday}>
                            {formatFridayDeliveryDate(scheduledFriday)}
                          </option>
                        </select>
                      </label>
                    ) : null}
                    <span className="mt-1 block text-xs font-semibold text-slate-600">
                      {method.transitDays === 1
                        ? "1 business day"
                        : `${method.transitDays} business days`}
                    </span>
                  </span>
                </label>
              );
            })}
            <p className="text-xs leading-relaxed text-slate-500">
              Rates assume a commercial address with a loading dock. Liftgate, residential delivery or appointment may add charges.
            </p>
            {cards.hiddenCount > 0 && (
              <button
                type="button"
                className="text-sm font-bold text-sky-700 underline-offset-2 hover:underline"
                onClick={() => setShowAllOptions((value) => !value)}
              >
                {showAllOptions ? "Show fewer options" : `Show all options (${cards.hiddenCount} more)`}
              </button>
            )}
          </div>
        )}
        {!loading && manualQuote && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p>{message || PLAIN_FAILURE}</p>
            <p className="mt-2 whitespace-pre-wrap font-mono text-xs leading-relaxed">
              {quoteErrorCode || "UNKNOWN"}
              {"\n"}
              {quoteRequestId || "request id not returned"}
            </p>
            {quoteNote ? (
              <button
                type="button"
                className="mt-3 text-xs font-bold text-amber-950 underline-offset-2 hover:underline"
                onClick={() => setShowErrorCode((value) => !value)}
              >
                {showErrorCode ? "Hide details" : "Show details"}
              </button>
            ) : null}
            {showErrorCode && quoteNote ? (
              <p className="mt-2 whitespace-pre-wrap font-mono text-xs leading-relaxed">{quoteNote}</p>
            ) : null}
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
        {!loading && !manualQuote && cards.visible.length === 0 && message && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
            <p>{PLAIN_FAILURE}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-3 h-10"
              onClick={() => setReloadKey((value) => value + 1)}
            >
              Retry
            </Button>
          </div>
        )}
        {!loading && !manualQuote && message && cards.visible.length > 0 && (
          <p className="text-sm text-slate-600">{message}</p>
        )}
      </section>

      <div
        className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
        aria-live="polite"
      >
        <span className="font-semibold text-slate-600">Estimated shipping</span>
        <span className="text-right">
          <span className="block font-black text-slate-900">
            {selectedShippingOption
              ? selectedShippingOption.price > 0
                ? formatCurrency(selectedShippingOption.price)
                : "$0.00"
              : "—"}
          </span>
          {countdown && (
            <span className="mt-1 block text-xs font-semibold text-slate-500">
              Quote time left {countdown}
            </span>
          )}
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
