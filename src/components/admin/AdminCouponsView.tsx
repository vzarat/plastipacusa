"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Calendar,
  Loader2,
  Percent,
  Plus,
  RefreshCw,
  Tag,
  Trash2,
  ToggleLeft,
  ToggleRight,
  Mail,
  Hash,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Coupon, CouponFormValues, CouponTargetType } from "@/types/coupon";

const WIDTH_OPTIONS = ["15", "18", "20", "30"];
const GAUGE_OPTIONS = ["60", "70", "80"];
const CATEGORY_OPTIONS = [
  { value: "hand", label: "Hand" },
  { value: "machine", label: "Machine" },
];

const EMPTY_FORM: CouponFormValues = {
  code: "",
  discount_percent: 10,
  target_type: "global",
  target_value: "",
  bound_email: "",
  max_uses: "",
  expires_at: "",
  is_active: true,
};

const PRIMARY_BTN =
  "bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold shadow-md shadow-blue-500/25 hover:opacity-95 transition-all duration-200";

function formatTarget(coupon: Coupon): string {
  if (coupon.target_type === "global") return "Global (All Products)";
  if (coupon.target_type === "width") return `Width · ${coupon.target_value}"`;
  if (coupon.target_type === "gauge") return `Gauge · ${coupon.target_value} Ga`;
  if (coupon.target_type === "category") {
    const label =
      CATEGORY_OPTIONS.find((o) => o.value === coupon.target_value)?.label ||
      coupon.target_value;
    return `Category · ${label}`;
  }
  return coupon.target_type;
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

export function AdminCouponsView() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [form, setForm] = useState<CouponFormValues>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const loadCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("coupons")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        toast.error(error.message || "Failed to load coupons.");
        setCoupons([]);
        return;
      }

      setCoupons((data || []) as Coupon[]);
    } catch (err: any) {
      toast.error(err?.message || "Failed to load coupons.");
      setCoupons([]);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadCoupons();
  }, [loadCoupons]);

  const updateForm = <K extends keyof CouponFormValues>(
    key: K,
    value: CouponFormValues[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleTargetTypeChange = (next: CouponTargetType) => {
    setForm((prev) => ({
      ...prev,
      target_type: next,
      target_value:
        next === "global"
          ? ""
          : next === "width"
            ? WIDTH_OPTIONS[0]
            : next === "gauge"
              ? GAUGE_OPTIONS[0]
              : CATEGORY_OPTIONS[0].value,
    }));
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const code = form.code.trim().toUpperCase();
    const discount = Number(form.discount_percent);

    if (!code) {
      toast.error("Coupon code is required.");
      return;
    }
    if (!Number.isFinite(discount) || discount < 1 || discount > 100) {
      toast.error("Discount must be between 1 and 100%.");
      return;
    }
    if (form.target_type !== "global" && !form.target_value) {
      toast.error("Please select a target value.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code,
        discount_percent: discount,
        target_type: form.target_type,
        target_value: form.target_type === "global" ? null : form.target_value,
        bound_email: form.bound_email.trim()
          ? form.bound_email.trim().toLowerCase()
          : null,
        max_uses: form.max_uses.trim() ? Number(form.max_uses) : null,
        expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null,
        is_active: form.is_active,
        used_count: 0,
      };

      const { error } = await supabase.from("coupons").insert(payload);
      if (error) {
        toast.error(error.message || "Could not create coupon.");
        return;
      }

      toast.success(`Coupon ${code} created.`);
      setForm(EMPTY_FORM);
      await loadCoupons();
    } catch (err: any) {
      toast.error(err?.message || "Could not create coupon.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (coupon: Coupon) => {
    setBusyId(coupon.id);
    try {
      const { error } = await supabase
        .from("coupons")
        .update({ is_active: !coupon.is_active, updated_at: new Date().toISOString() })
        .eq("id", coupon.id);

      if (error) {
        toast.error(error.message || "Could not update coupon.");
        return;
      }

      setCoupons((prev) =>
        prev.map((c) =>
          c.id === coupon.id ? { ...c, is_active: !c.is_active } : c
        )
      );
      toast.success(
        `${coupon.code} ${coupon.is_active ? "disabled" : "enabled"}.`
      );
    } catch (err: any) {
      toast.error(err?.message || "Could not update coupon.");
    } finally {
      setBusyId(null);
    }
  };

  const deleteCoupon = async (coupon: Coupon) => {
    if (!window.confirm(`Delete coupon ${coupon.code}? This cannot be undone.`)) {
      return;
    }

    setBusyId(coupon.id);
    try {
      const { error } = await supabase.from("coupons").delete().eq("id", coupon.id);
      if (error) {
        toast.error(error.message || "Could not delete coupon.");
        return;
      }
      setCoupons((prev) => prev.filter((c) => c.id !== coupon.id));
      toast.success(`${coupon.code} deleted.`);
    } catch (err: any) {
      toast.error(err?.message || "Could not delete coupon.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-700">
            Promotions
          </p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black text-slate-900">
            Coupon Management
          </h1>
          <p className="mt-1 text-sm text-slate-500 max-w-xl">
            Create percentage discounts by product scope, optionally lock codes to a
            customer email, and control max uses / expiration.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadCoupons()}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Create form */}
      <form
        onSubmit={handleCreate}
        className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-5"
      >
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <Plus className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
            Create Coupon
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" /> Coupon Code
            </span>
            <input
              type="text"
              value={form.code}
              onChange={(e) => updateForm("code", e.target.value.toUpperCase())}
              placeholder="PLASTI10"
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm font-bold tracking-wide uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5" /> Discount %
            </span>
            <input
              type="number"
              min={1}
              max={100}
              step={1}
              value={form.discount_percent}
              onChange={(e) =>
                updateForm("discount_percent", Number(e.target.value) || 0)
              }
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </label>

          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Target Scope
            </span>
            <select
              value={form.target_type}
              onChange={(e) =>
                handleTargetTypeChange(e.target.value as CouponTargetType)
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            >
              <option value="global">Global (All Products)</option>
              <option value="width">By Film Width</option>
              <option value="gauge">By Target Gauge</option>
              <option value="category">By Application Category</option>
            </select>
          </label>

          {form.target_type === "width" && (
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Film Width
              </span>
              <select
                value={form.target_value}
                onChange={(e) => updateForm("target_value", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              >
                {WIDTH_OPTIONS.map((w) => (
                  <option key={w} value={w}>
                    {w}&quot;
                  </option>
                ))}
              </select>
            </label>
          )}

          {form.target_type === "gauge" && (
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Target Gauge
              </span>
              <select
                value={form.target_value}
                onChange={(e) => updateForm("target_value", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              >
                {GAUGE_OPTIONS.map((g) => (
                  <option key={g} value={g}>
                    {g} Ga
                  </option>
                ))}
              </select>
            </label>
          )}

          {form.target_type === "category" && (
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Application Category
              </span>
              <select
                value={form.target_value}
                onChange={(e) => updateForm("target_value", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              >
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> User Binding (optional)
            </span>
            <input
              type="email"
              value={form.bound_email}
              onChange={(e) => updateForm("bound_email", e.target.value)}
              placeholder="customer@company.com"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Hash className="w-3.5 h-3.5" /> Max Uses
            </span>
            <input
              type="number"
              min={1}
              value={form.max_uses}
              onChange={(e) => updateForm("max_uses", e.target.value)}
              placeholder="Unlimited"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </label>

          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Expiration Date
            </span>
            <input
              type="datetime-local"
              value={form.expires_at}
              onChange={(e) => updateForm("expires_at", e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </label>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={form.is_active}
              onChange={(e) => updateForm("is_active", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Active immediately
          </label>

          <button
            type="submit"
            disabled={saving}
            className={`${PRIMARY_BTN} inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm disabled:opacity-60 cursor-pointer`}
          >
            {saving ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Create Coupon
          </button>
        </div>
      </form>

      {/* Coupons list */}
      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
            Active Coupons
          </h2>
          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {coupons.length} total
          </span>
        </div>

        {loading ? (
          <div className="p-10 flex items-center justify-center text-slate-500 text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading coupons…
          </div>
        ) : coupons.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No coupons yet. Create your first promo code above.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {coupons.map((coupon) => {
              const expired = isExpired(coupon.expires_at);
              const atLimit =
                coupon.max_uses !== null &&
                coupon.max_uses !== undefined &&
                Number(coupon.used_count || 0) >= Number(coupon.max_uses);

              return (
                <li
                  key={coupon.id}
                  className="px-5 sm:px-6 py-4 flex flex-col lg:flex-row lg:items-center gap-4 justify-between"
                >
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-slate-900 tracking-wide">
                        {coupon.code}
                      </span>
                      <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                        {coupon.discount_percent}% OFF
                      </span>
                      {!coupon.is_active && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          Disabled
                        </span>
                      )}
                      {expired && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                          Expired
                        </span>
                      )}
                      {atLimit && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2 py-0.5 rounded-full">
                          Max uses reached
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600">{formatTarget(coupon)}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                      {coupon.bound_email ? (
                        <span>Locked to {coupon.bound_email}</span>
                      ) : (
                        <span>Open to all customers</span>
                      )}
                      <span>
                        Uses {coupon.used_count}
                        {coupon.max_uses != null ? ` / ${coupon.max_uses}` : ""}
                      </span>
                      {coupon.expires_at ? (
                        <span>
                          Expires{" "}
                          {new Date(coupon.expires_at).toLocaleString(undefined, {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                      ) : (
                        <span>No expiration</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      disabled={busyId === coupon.id}
                      onClick={() => void toggleActive(coupon)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                      title={coupon.is_active ? "Disable" : "Enable"}
                    >
                      {coupon.is_active ? (
                        <ToggleRight className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="w-4 h-4 text-slate-400" />
                      )}
                      {coupon.is_active ? "Enabled" : "Disabled"}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === coupon.id}
                      onClick={() => void deleteCoupon(coupon)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 text-xs font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-50 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
