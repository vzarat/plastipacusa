import { NextResponse } from "next/server";
import { verifyAdmin } from "@/actions/admin";
import { getWarpConfig } from "@/lib/shipping/config";
import { probeWarpConnection } from "@/lib/shipping/warp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 15;

const TIMEOUT_MS = 10_000;
const KEY_NAMES = ["WARP_API_KEY_STAGING", "WARP_API_KEY_PRODUCTION"] as const;

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

interface WarpQuoteBody {
  quote_id?: unknown;
  price?: { amount?: unknown };
  status?: unknown;
}

function maskSecrets(text: string): string {
  let masked = text;
  for (const name of KEY_NAMES) {
    const secret = process.env[name]?.trim();
    if (secret) masked = masked.split(secret).join("***");
  }
  return masked.replace(/apikey["']?\s*[:=]\s*\S+/gi, "apikey=***");
}

function reply(body: WarpTestResponse, status = 200): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function failure(input: {
  started: number;
  env: WarpEnvName | null;
  step: WarpTestStep;
  message: string;
  httpStatus?: number;
  status?: number;
  details?: string;
}): NextResponse {
  const body: WarpTestResponse = {
    ok: false,
    env: input.env,
    step: input.step,
    message: input.message,
    durationMs: Date.now() - input.started,
    checkedAt: new Date().toISOString(),
  };
  if (input.status !== undefined) body.status = input.status;
  if (input.details) body.details = maskSecrets(input.details).slice(0, 1000);
  return reply(body, input.httpStatus ?? 200);
}

function configStep(message: string): "env" | "apiKey" {
  return /WARP_API_KEY/.test(message) ? "apiKey" : "env";
}

function requestMessage(httpStatus: number): string {
  if (httpStatus === 401 || httpStatus === 403) return "Credenciales inválidas o sin permiso.";
  if (httpStatus >= 500) return "Error del servicio de WARP.";
  if (httpStatus >= 400) return "Petición inválida.";
  return "Conexión con WARP correcta.";
}

function quoteBodyProblem(raw: string): string | null {
  let parsed: WarpQuoteBody;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== "object") return "WARP respondió sin una cotización válida.";
    parsed = value as WarpQuoteBody;
  } catch {
    return "WARP respondió sin una cotización válida.";
  }
  if (parsed.status && parsed.status !== "ACCEPT") {
    return "WARP respondió sin una cotización válida.";
  }
  const amount = Number(parsed.price?.amount);
  const quoteId = String(parsed.quote_id || "");
  if (!quoteId || !Number.isFinite(amount) || amount <= 0) {
    return "WARP respondió sin una cotización válida.";
  }
  return null;
}

export async function POST(): Promise<NextResponse> {
  const started = Date.now();
  const session = await verifyAdmin();
  if (!session.user || !session.isAdmin) {
    return failure({
      started,
      env: null,
      step: "auth",
      httpStatus: session.user ? 403 : 401,
      message: "No autorizado. Inicia sesión como administrador.",
    });
  }

  try {
    const received = process.env.WARP_ENV;
    if (received !== "staging" && received !== "production") {
      return failure({
        started,
        env: null,
        step: "env",
        message: `WARP_ENV no está definida o tiene un valor inválido. Valores permitidos: staging, production. Valor recibido: ${JSON.stringify(received ?? null)}`,
      });
    }
    const env: WarpEnvName = received;

    const keyName = env === "staging" ? "WARP_API_KEY_STAGING" : "WARP_API_KEY_PRODUCTION";
    if (!process.env[keyName]?.trim()) {
      return failure({
        started,
        env,
        step: "apiKey",
        message: `Falta la variable de entorno ${keyName}.`,
      });
    }

    let warpConfig: ReturnType<typeof getWarpConfig>;
    try {
      warpConfig = getWarpConfig();
    } catch (error) {
      const message = maskSecrets(error instanceof Error ? error.message : "Missing or invalid: WARP_ENV");
      return failure({
        started,
        env,
        step: configStep(message),
        message,
      });
    }

    let httpStatus = 0;
    let bodyText = "";
    try {
      const result = await probeWarpConnection(TIMEOUT_MS, {
        baseUrl: warpConfig.baseUrl,
        apiKey: warpConfig.apiKey,
      });
      httpStatus = result.httpStatus;
      bodyText = result.bodyText;
    } catch (error) {
      const aborted = error instanceof Error && error.name === "AbortError";
      return failure({
        started,
        env,
        step: "request",
        message: aborted
          ? "Tiempo de espera agotado al contactar a WARP (10 s)."
          : "Error de red al contactar a WARP.",
        details: error instanceof Error ? error.message : "request failed",
      });
    }

    const details = `HTTP ${httpStatus}\n${bodyText}`;
    if (httpStatus < 200 || httpStatus >= 300) {
      return failure({
        started,
        env,
        step: "request",
        status: httpStatus,
        message: requestMessage(httpStatus),
        details,
      });
    }

    const quoteProblem = quoteBodyProblem(bodyText);
    if (quoteProblem) {
      return failure({
        started,
        env,
        step: "request",
        status: httpStatus,
        message: quoteProblem,
        details,
      });
    }

    return reply({
      ok: true,
      env,
      step: "request",
      status: httpStatus,
      message: "Conexión con WARP correcta.",
      details: maskSecrets(details).slice(0, 1000),
      durationMs: Date.now() - started,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = maskSecrets(error instanceof Error ? error.message : "request failed");
    return failure({
      started,
      env: null,
      step: configStep(message),
      message,
    });
  }
}
