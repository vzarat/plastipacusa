"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, MapPin, Plus, Star, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import {
  createShippingAddress,
  deleteShippingAddress,
  listShippingAddresses,
  setDefaultShippingAddress,
} from "@/actions/shipping-addresses";
import { Button } from "@/components/ui/button";
import { useCheckoutState } from "@/components/checkout/CheckoutStateContext";
import { ShippingEligibilityAlert } from "@/components/checkout/ShippingEligibilityAlert";
import { useCartStore } from "@/lib/store/useCartStore";
import { countCartBoxes } from "@/lib/shipping-method";
import { evalShippingEligibility } from "@/lib/shippingRules";
import {
  validateShippingAddressInput,
  type SavedShippingAddress,
  type ShippingAddressInput,
} from "@/lib/saved-shipping-address";

const fieldClass =
  "h-12 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400 md:h-auto md:py-2.5";

const EMPTY_FORM: ShippingAddressInput = {
  fullName: "",
  companyName: "",
  streetAddress: "",
  city: "",
  state: "",
  postalCode: "",
  phone: "",
  isDefault: false,
};

interface CheckoutAddressStepProps {
  onBack: () => void;
  onProceed: () => void;
}

export function CheckoutAddressStep({
  onBack,
  onProceed,
}: CheckoutAddressStepProps) {
  const { selectedAddress, setSelectedAddress } = useCheckoutState();
  const cartItems = useCartStore((state) => state.items);
  const cartBoxes = useMemo(() => countCartBoxes(cartItems), [cartItems]);
  const selectedEligibility = useMemo(
    () =>
      evalShippingEligibility(
        selectedAddress?.postalCode || "",
        selectedAddress?.city || "",
        selectedAddress?.state || "",
        cartBoxes
      ),
    [selectedAddress, cartBoxes]
  );
  const [addresses, setAddresses] = useState<SavedShippingAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<ShippingAddressInput>(EMPTY_FORM);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const draftEligibility = useMemo(
    () =>
      evalShippingEligibility(form.postalCode, form.city, form.state, cartBoxes),
    [form.postalCode, form.city, form.state, cartBoxes]
  );

  const load = async () => {
    setLoading(true);
    const result = await listShippingAddresses();
    setLoading(false);
    if (!result.success) {
      toast.error(result.error || "Could not load saved addresses.");
      return;
    }
    const next = result.addresses || [];
    setAddresses(next);
    setSelectedAddress((current) => {
      if (current && next.some((address) => address.id === current.id)) {
        return next.find((address) => address.id === current.id) || current;
      }
      return next.find((address) => address.isDefault) || next[0] || null;
    });
  };

  useEffect(() => {
    void load();
    // Initial load only. Later refreshes call load() directly.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setField = (key: keyof ShippingAddressInput, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submitAddress = async () => {
    const error = validateShippingAddressInput(form);
    if (error) {
      toast.error(error);
      return;
    }

    setSaving(true);
    const result = await createShippingAddress(form);
    setSaving(false);

    if (!result.success || !result.address) {
      toast.error(result.error || "Could not save this address.");
      return;
    }

    setAddresses((current) => {
      const withoutDefault = result.address?.isDefault
        ? current.map((address) => ({ ...address, isDefault: false }))
        : current;
      return [result.address!, ...withoutDefault];
    });
    setSelectedAddress(result.address);
    setForm(EMPTY_FORM);
    setModalOpen(false);
    toast.success("Address saved.");
  };

  const removeAddress = async (id: string) => {
    setSaving(true);
    const result = await deleteShippingAddress(id);
    setSaving(false);
    setPendingDeleteId(null);

    if (!result.success) {
      toast.error(result.error || "Could not delete this address.");
      return;
    }

    const next = result.addresses || [];
    setAddresses(next);
    if (selectedAddress?.id === id) {
      setSelectedAddress(next.find((address) => address.isDefault) || next[0] || null);
    } else if (selectedAddress) {
      const refreshed = next.find((address) => address.id === selectedAddress.id);
      if (refreshed) setSelectedAddress(refreshed);
    }
  };

  const makeDefault = async (id: string) => {
    setSaving(true);
    const result = await setDefaultShippingAddress(id);
    setSaving(false);
    if (!result.success) {
      toast.error(result.error || "Could not update the default address.");
      return;
    }
    const next = result.addresses || [];
    setAddresses(next);
    const refreshed = next.find((address) => address.id === id) || result.address || null;
    if (selectedAddress?.id === id && refreshed) setSelectedAddress(refreshed);
  };

  const proceed = () => {
    if (!selectedAddress) {
      toast.error("Select or add a shipping address before continuing.");
      return;
    }
    onProceed();
  };

  return (
    <div className="space-y-6" data-tour="tour-destination">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-sky-700">
            Step 2
          </p>
          <h2 className="mt-1 text-lg font-black text-slate-900">
            Shipping Address
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Choose a saved address or add a new delivery location.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-12 shrink-0 gap-1.5 md:h-10"
          onClick={() => setModalOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Add New Address
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 rounded-2xl border border-slate-200 px-4 py-8 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin text-sky-600" />
          Loading saved addresses…
        </div>
      ) : addresses.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-12 text-center">
          <MapPin className="mx-auto h-5 w-5 text-slate-400" />
          <p className="mt-3 text-sm font-semibold text-slate-700">
            No saved shipping addresses yet.
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Add an address to continue to the shipping method.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {addresses.map((address) => {
            const selected = selectedAddress?.id === address.id;
            return (
              <li key={address.id}>
                <div
                  className={`min-h-12 rounded-2xl border p-4 transition-colors ${
                    selected
                      ? "border-sky-500 bg-sky-50 ring-2 ring-sky-200"
                      : "border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="shipping-address"
                      checked={selected}
                      onChange={() => setSelectedAddress(address)}
                      className="mt-1 h-4 w-4 shrink-0 text-sky-600 focus:ring-sky-500"
                      aria-label={`Ship to ${address.fullName}`}
                    />
                    <button
                      type="button"
                      onClick={() => setSelectedAddress(address)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-black text-slate-900">
                          {address.fullName}
                        </p>
                        {address.isDefault && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-700">
                            <Star className="h-3 w-3" />
                            Default
                          </span>
                        )}
                      </div>
                      {address.companyName && (
                        <p className="mt-0.5 text-xs font-semibold text-slate-600">
                          {address.companyName}
                        </p>
                      )}
                      <p className="mt-1 text-sm text-slate-600">
                        {address.streetAddress}
                      </p>
                      <p className="text-sm text-slate-600">
                        {address.city}, {address.state} {address.postalCode}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">{address.phone}</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingDeleteId(address.id)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      aria-label={`Delete address for ${address.fullName}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {addresses.length > 1 && !address.isDefault && (
                    <div className="mt-3 pl-7">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => void makeDefault(address.id)}
                        className="text-xs font-bold text-sky-700 hover:underline disabled:opacity-50"
                      >
                        Set as default
                      </button>
                    </div>
                  )}

                  {pendingDeleteId === address.id && (
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-red-100 bg-red-50 px-3 py-2">
                      <p className="text-xs font-semibold text-red-700">
                        Delete this address?
                      </p>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setPendingDeleteId(null)}
                          className="rounded-lg px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-white"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => void removeAddress(address.id)}
                          className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-bold text-white disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {selectedAddress && <ShippingEligibilityAlert eligibility={selectedEligibility} />}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
        <Button type="button" variant="outline" className="h-12 md:h-10" onClick={onBack}>
          Back to Cart
        </Button>
        <Button
          type="button"
          variant="gradient"
          className="hidden h-12 md:inline-flex md:h-10"
          onClick={proceed}
          disabled={!selectedAddress}
        >
          Proceed to Shipping Method
        </Button>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-[80] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/50"
            aria-label="Close address form"
            onClick={() => setModalOpen(false)}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="new-address-title"
            className="relative z-10 max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-5 shadow-xl sm:rounded-3xl sm:p-6"
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 id="new-address-title" className="text-lg font-black text-slate-900">
                  Add New Address
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  This address is saved to your account.
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
                  Full name *
                </span>
                <input
                  className={fieldClass}
                  value={form.fullName}
                  onChange={(event) => setField("fullName", event.target.value)}
                  autoComplete="name"
                  inputMode="text"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Company name
                </span>
                <input
                  className={fieldClass}
                  value={form.companyName}
                  onChange={(event) => setField("companyName", event.target.value)}
                  autoComplete="organization"
                  inputMode="text"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  Street address *
                </span>
                <input
                  className={fieldClass}
                  value={form.streetAddress}
                  onChange={(event) => setField("streetAddress", event.target.value)}
                  autoComplete="address-line1"
                  inputMode="text"
                />
              </label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    City *
                  </span>
                  <input
                    className={fieldClass}
                    value={form.city}
                    onChange={(event) => setField("city", event.target.value)}
                    autoComplete="address-level2"
                    inputMode="text"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    State *
                  </span>
                  <input
                    className={fieldClass}
                    value={form.state}
                    onChange={(event) => setField("state", event.target.value)}
                    autoComplete="address-level1"
                    inputMode="text"
                  />
                </label>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Postal code *
                  </span>
                  <input
                    className={fieldClass}
                    value={form.postalCode}
                    onChange={(event) => setField("postalCode", event.target.value)}
                    autoComplete="postal-code"
                    inputMode="numeric"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    Phone *
                  </span>
                  <input
                    type="tel"
                    className={fieldClass}
                    value={form.phone}
                    onChange={(event) => setField("phone", event.target.value)}
                    autoComplete="tel"
                    inputMode="tel"
                  />
                </label>
              </div>
              {(form.city.trim() || form.postalCode.trim()) && (
                <ShippingEligibilityAlert eligibility={draftEligibility} />
              )}
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={Boolean(form.isDefault)}
                  onChange={(event) => setField("isDefault", event.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                />
                Set as default address
              </label>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" className="h-12 md:h-10" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="gradient"
                className="h-12 md:h-10"
                disabled={saving}
                onClick={() => void submitAddress()}
              >
                {saving ? "Saving…" : "Save address"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
