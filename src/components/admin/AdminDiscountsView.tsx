"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Calendar,
  DollarSign,
  Loader2,
  Percent,
  Plus,
  RefreshCw,
  Tag,
  Trash2,
  ToggleLeft,
  ToggleRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type {
  DiscountCode,
  DiscountCodeDbPayload,
  DiscountFormValues,
  DiscountType,
} from "@/types/discount";
import {
  buildDiscountWritePayload,
  formatDiscountSchemaError,
  isMissingNameColumnError,
  isMissingUpdatedAtColumnError,
  isPostgrestSchemaCacheError,
  mapDiscountCodeRow,
  normalizeDiscountType,
  sanitizeDiscountWritePayload,
  stripOptionalDiscountColumns,
} from "@/lib/discounts";

const EMPTY_FORM: DiscountFormValues = {
  code: "",
  name: "",
  discount_type: "percentage",
  discount_value: 10,
  expires_at: "",
  is_active: true,
};

const PRIMARY_BTN =
  "bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold shadow-md shadow-blue-500/25 hover:opacity-95 transition-all duration-200";

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() < Date.now();
}

async function persistDiscountPayload(
  supabase: ReturnType<typeof createClient>,
  payload: DiscountCodeDbPayload,
  editingId: string | null
) {
  const write = async (body: DiscountCodeDbPayload) => {
    const sanitized = sanitizeDiscountWritePayload(body);
    if (editingId) {
      return supabase.from("discount_codes").update(sanitized).eq("id", editingId);
    }
    return supabase.from("discount_codes").insert(sanitized);
  };

  // Timestamps are already stripped by sanitize; try with `name` first.
  let result = await write(payload);

  if (result.error && isMissingNameColumnError(result.error.message)) {
    result = await write(stripOptionalDiscountColumns(payload, ["name"]));
  }

  if (result.error && isMissingUpdatedAtColumnError(result.error.message)) {
    result = await write(
      stripOptionalDiscountColumns(payload, ["updated_at", "created_at"])
    );
  }

  // Final fallback: drop all optional columns that may be absent from schema cache.
  if (result.error && isPostgrestSchemaCacheError(result.error.message)) {
    result = await write(
      stripOptionalDiscountColumns(payload, ["name", "updated_at", "created_at"])
    );
  }

  return result;
}

export function AdminDiscountsView() {
  const [codes, setCodes] = useState<DiscountCode[]>([]);
  const [form, setForm] = useState<DiscountFormValues>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  const loadCodes = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("discount_codes")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setCodes([]);
        // created_at may also be missing — retry unordered select
        if (isPostgrestSchemaCacheError(error.message)) {
          const fallback = await supabase.from("discount_codes").select("*");
          if (!fallback.error) {
            setCodes(
              (fallback.data || []).map((row) =>
                mapDiscountCodeRow(row as Record<string, unknown>)
              )
            );
            toast.message(formatDiscountSchemaError(error.message));
            return;
          }
          toast.error(formatDiscountSchemaError(fallback.error.message));
          return;
        }
        toast.error(formatDiscountSchemaError(error.message));
        return;
      }

      setCodes(
        (data || []).map((row) =>
          mapDiscountCodeRow(row as Record<string, unknown>)
        )
      );
    } catch (err: unknown) {
      setCodes([]);
      const message =
        err instanceof Error ? err.message : "Could not load discount codes.";
      toast.error(formatDiscountSchemaError(message));
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    void loadCodes();
  }, [loadCodes]);

  const updateForm = <K extends keyof DiscountFormValues>(
    key: K,
    value: DiscountFormValues[K]
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const code = form.code.trim().toUpperCase();
    const value = Number(form.discount_value);

    if (!code) {
      toast.error("Discount code is required.");
      return;
    }
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter a valid discount value.");
      return;
    }
    if (form.discount_type === "percentage" && (value < 1 || value > 100)) {
      toast.error("Percent discount must be between 1 and 100.");
      return;
    }

    setSaving(true);

    const payload = buildDiscountWritePayload({
      ...form,
      code,
      name: form.name.trim() || code,
    });

    try {
      const { error } = await persistDiscountPayload(supabase, payload, editingId);
      if (error) {
        toast.error(formatDiscountSchemaError(error.message));
        return;
      }

      toast.success(
        editingId ? `Discount ${code} updated.` : `Discount ${code} created.`
      );
      resetForm();
      await loadCodes();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Could not save discount.";
      toast.error(formatDiscountSchemaError(message));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (row: DiscountCode) => {
    setEditingId(row.id);
    setForm({
      code: row.code,
      name: row.name || row.code,
      discount_type: normalizeDiscountType(row.discount_type),
      discount_value: Number(row.discount_value),
      expires_at: row.expires_at
        ? new Date(row.expires_at).toISOString().slice(0, 16)
        : "",
      is_active: row.is_active,
    });
  };

  const toggleActive = async (row: DiscountCode) => {
    setBusyId(row.id);
    try {
      // Do not send updated_at — column may be absent from schema cache.
      const { error } = await supabase
        .from("discount_codes")
        .update({ is_active: !row.is_active })
        .eq("id", row.id);

      if (error) {
        toast.error(formatDiscountSchemaError(error.message));
        return;
      }
      setCodes((prev) =>
        prev.map((c) =>
          c.id === row.id ? { ...c, is_active: !c.is_active } : c
        )
      );
      toast.success(`${row.code} ${row.is_active ? "disabled" : "enabled"}.`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Could not update discount.";
      toast.error(formatDiscountSchemaError(message));
    } finally {
      setBusyId(null);
    }
  };

  const deleteCode = async (row: DiscountCode) => {
    if (!window.confirm(`Delete discount ${row.code}?`)) return;
    setBusyId(row.id);
    try {
      const { error } = await supabase
        .from("discount_codes")
        .delete()
        .eq("id", row.id);
      if (error) {
        toast.error(formatDiscountSchemaError(error.message));
        return;
      }
      setCodes((prev) => prev.filter((c) => c.id !== row.id));
      if (editingId === row.id) resetForm();
      toast.success(`${row.code} deleted.`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Could not delete discount.";
      toast.error(formatDiscountSchemaError(message));
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
            Discount Codes
          </h1>
          <p className="mt-1 text-sm text-slate-500 max-w-xl">
            Create percent or fixed-amount promo codes synced to Supabase{" "}
            <code className="text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
              public.discount_codes
            </code>
            .
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadCodes()}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-5"
      >
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
            <Plus className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
            {editingId ? "Edit Discount" : "Create Discount"}
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <label className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" /> Code Name
            </span>
            <input
              type="text"
              value={form.code}
              onChange={(e) => {
                const next = e.target.value.toUpperCase();
                setForm((prev) => ({
                  ...prev,
                  code: next,
                  // Keep `name` aliased to the coupon identifier
                  name: next,
                }));
              }}
              placeholder="PLASTI10"
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm font-bold tracking-wide uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Display Label (aliases to code)
            </span>
            <input
              type="text"
              value={form.name || form.code}
              onChange={(e) => updateForm("name", e.target.value.toUpperCase())}
              placeholder="PLASTI10"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm font-bold tracking-wide uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Discount Type
            </span>
            <select
              value={form.discount_type}
              onChange={(e) =>
                updateForm(
                  "discount_type",
                  (e.target.value === "fixed" ? "fixed" : "percentage") as DiscountType
                )
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            >
              <option value="percentage">Percentage (%)</option>
              <option value="fixed">Fixed Amount ($)</option>
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              {form.discount_type === "percentage" ? (
                <Percent className="w-3.5 h-3.5" />
              ) : (
                <DollarSign className="w-3.5 h-3.5" />
              )}
              {form.discount_type === "percentage" ? "Percent Off" : "Amount Off (USD)"}
            </span>
            <input
              type="number"
              min={form.discount_type === "percentage" ? 1 : 0.01}
              max={form.discount_type === "percentage" ? 100 : undefined}
              step={form.discount_type === "percentage" ? 1 : 0.01}
              value={form.discount_value}
              onChange={(e) =>
                updateForm("discount_value", Number(e.target.value) || 0)
              }
              required
              className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3.5 py-2.5 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
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
            Active
          </label>

          <div className="flex items-center gap-2">
            {editingId && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
            )}
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
              {editingId ? "Save Changes" : "Create Discount"}
            </button>
          </div>
        </div>
      </form>

      <div className="rounded-3xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="px-5 sm:px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-sm font-black text-slate-900 uppercase tracking-wide">
            All Discounts
          </h2>
          <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {codes.length} total
          </span>
        </div>

        {loading ? (
          <div className="p-10 flex items-center justify-center text-slate-500 text-sm gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading discounts…
          </div>
        ) : codes.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No discount codes yet. Create your first code above.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {codes.map((row) => {
              const expired = isExpired(row.expires_at);
              return (
                <li
                  key={row.id}
                  className="px-5 sm:px-6 py-4 flex flex-col lg:flex-row lg:items-center gap-4 justify-between"
                >
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-black text-slate-900 tracking-wide">
                        {row.code}
                      </span>
                      <span className="text-xs font-bold text-blue-700 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-full">
                        {row.discount_type === "percentage" ||
                        String(row.discount_type).includes("percent")
                          ? `${row.discount_value}% OFF`
                          : `$${Number(row.discount_value).toFixed(2)} OFF`}
                      </span>
                      {!row.is_active && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                          Disabled
                        </span>
                      )}
                      {expired && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                          Expired
                        </span>
                      )}
                    </div>
                    {row.name && row.name !== row.code ? (
                      <p className="text-xs text-slate-600">{row.name}</p>
                    ) : null}
                    <p className="text-[11px] text-slate-500">
                      {row.expires_at
                        ? `Expires ${new Date(row.expires_at).toLocaleString()}`
                        : "No expiration"}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <button
                      type="button"
                      onClick={() => startEdit(row)}
                      className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => void toggleActive(row)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                    >
                      {row.is_active ? (
                        <ToggleRight className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <ToggleLeft className="w-4 h-4 text-slate-400" />
                      )}
                      {row.is_active ? "Enabled" : "Disabled"}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() => void deleteCode(row)}
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
