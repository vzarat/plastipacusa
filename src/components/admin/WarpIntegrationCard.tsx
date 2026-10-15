"use client";

import React, { useState } from "react";
import { CheckCircle2, Copy, Loader2, Plug } from "lucide-react";
import { Button } from "@/components/ui/button";

type WarpEnvName = "staging" | "production";
type WarpTestStep = "auth" | "env" | "apiKey" | "request";

interface WarpTestResponse {
  ok: boolean;
  env: WarpEnvName | null;
  step: WarpTestStep;
  status?: number;
  message: string;
  details?: string;
  durationMs: number;
  checkedAt: string;
}

const SUGGESTIONS: Record<Exclude<WarpTestStep, "auth">, string> = {
  env: "Revisa WARP_ENV en Vercel y haz Redeploy.",
  apiKey: "Revisa el nombre de la variable y que esté marcada en el ambiente correcto (Production/Preview).",
  request: "Revisa que la llave corresponda al ambiente.",
};

function isWarpTestResponse(value: unknown): value is WarpTestResponse {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return typeof record.ok === "boolean" && typeof record.message === "string" && typeof record.step === "string";
}

export function WarpIntegrationCard() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WarpTestResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const checkConnection = async () => {
    setLoading(true);
    setCopied(false);
    try {
      const response = await fetch("/api/admin/integrations/warp/test", {
        method: "POST",
        cache: "no-store",
      });
      const payload: unknown = await response.json();
      if (isWarpTestResponse(payload)) {
        setResult(payload);
        return;
      }
      setResult({
        ok: false,
        env: null,
        step: "request",
        message: "La comprobación no devolvió un resultado válido.",
        durationMs: 0,
        checkedAt: new Date().toISOString(),
      });
    } catch {
      setResult({
        ok: false,
        env: null,
        step: "request",
        message: "Error de red al contactar a WARP.",
        durationMs: 0,
        checkedAt: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  };

  const copyError = async () => {
    if (!result) return;
    const text = result.details || result.message;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  const checkedLabel = result ? new Date(result.checkedAt).toLocaleString() : null;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Plug className="h-4 w-4 text-blue-600" />
          <div>
            <h2 className="text-sm font-black text-slate-900">WARP Shipping</h2>
            <p className="text-[11px] text-slate-500">
              Ambiente: {result?.env ?? "sin comprobar"}
            </p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={checkConnection}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          Comprobar conexión
        </Button>
      </div>

      {result?.ok ? (
        <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800">
          <span className="inline-flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5" />
            {result.message} Ambiente {result.env}. Tiempo {result.durationMs} ms.
          </span>
        </div>
      ) : null}

      {result && !result.ok && result.step === "auth" ? (
        <div className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-800">
          No autorizado. Inicia sesión como administrador.
        </div>
      ) : null}

      {result && !result.ok && result.step !== "auth" ? (
        <div className="space-y-2 rounded-xl bg-rose-50 px-3 py-2 text-xs text-rose-800">
          <p className="font-semibold">{result.message}</p>
          <p>
            Paso: {result.step}
            {result.status !== undefined ? ` · HTTP ${result.status}` : ""}
          </p>
          <p>{SUGGESTIONS[result.step]}</p>
          {result.details ? (
            <details className="rounded-lg border border-rose-200 bg-white px-2 py-1.5">
              <summary className="cursor-pointer font-bold text-rose-900">Ver detalle técnico</summary>
              <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all text-[11px] text-slate-700">
                {result.details}
              </pre>
              <button
                type="button"
                onClick={copyError}
                className="mt-2 inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-700"
              >
                <Copy className="h-3 w-3" />
                {copied ? "Copiado" : "Copiar error"}
              </button>
            </details>
          ) : (
            <button
              type="button"
              onClick={copyError}
              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2 py-1 text-[11px] font-bold text-rose-900"
            >
              <Copy className="h-3 w-3" />
              {copied ? "Copiado" : "Copiar error"}
            </button>
          )}
        </div>
      ) : null}

      <p className="text-[11px] text-slate-500">
        {checkedLabel ? `Última comprobación: ${checkedLabel}` : "Sin comprobaciones todavía."}
      </p>
    </div>
  );
}
