import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { openai } from "@ai-sdk/openai";
import { resolveOwnedConversation, saveChatTurn } from "@/lib/assistant/persist";
import { missingProfileFields, type CustomerProfile } from "@/lib/assistant/customer-profile";
import { readCustomerProfile } from "@/lib/assistant/profile-store";
import { createAssistantTools } from "@/lib/assistant/tools";
import { createServerClient } from "@/lib/supabase/server";
import {
  convertToModelMessages,
  createUIMessageStreamResponse,
  stepCountIs,
  streamText,
  toUIMessageStream,
  validateUIMessages,
  type UIMessage,
} from "ai";
import { z } from "zod";

export const runtime = "nodejs";
export const maxDuration = 30;

const HISTORY_LIMIT = 20;
const MAX_PARTS_PER_MESSAGE = 8;
const MAX_TEXT_CHARS = 2000;
const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const PROVIDER_ERROR = "Assist AI could not finish that reply. Please try again.";

function describeError(error: unknown): string {
  const parts: string[] = [];
  if (error instanceof Error) {
    if (error.message.trim()) parts.push(error.message.trim());
    const extra = error as Error & { statusCode?: number; responseBody?: string };
    if (typeof extra.statusCode === "number") parts.push(`HTTP ${extra.statusCode}`);
    if (typeof extra.responseBody === "string" && extra.responseBody.trim()) {
      parts.push(extra.responseBody.trim());
    }
  } else if (typeof error === "string" && error.trim()) {
    parts.push(error.trim());
  } else {
    try {
      parts.push(JSON.stringify(error));
    } catch {
      parts.push(PROVIDER_ERROR);
    }
  }

  const message = parts.join("\n")
    .replace(/sk-[A-Za-z0-9_-]{8,}/g, "[redacted]")
    .replace(/AIza[0-9A-Za-z_-]{8,}/g, "[redacted]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/(api[_-]?key|authorization)(["']?\s*[:=]\s*["']?)[^\s"',}]+/gi, "$1$2[redacted]");

  return (message || PROVIDER_ERROR).slice(0, 800);
}

// TODO: El rate limit en memoria debe migrarse a Redis o Supabase si se despliega en serverless.
const hits = new Map<string, number[]>();

function systemInstructions(profile: CustomerProfile): string {
  const missing = missingProfileFields(profile);
  return `You are Assist AI for Plastipac USA. Answer in one or two short English sentences.

Saved customer profile:
${JSON.stringify(profile)}
Missing profile fields: ${missing.length > 0 ? missing.join(", ") : "none"}.

Ask only for the next missing profile field. When the buyer states usa_maquina, ancho, pallets_por_dia, dias_al_mes, or calibre, call updateCustomerProfile before any calculation. Never send user_id, price, discount, or role.

Get every number and price from tools only: estimateUsage, recommendProduct, palletCalculator, and freightRateCheck. Never calculate, round, or estimate consumption, prices, totals, or freight yourself.

If a tool returns ok: false, a null price, or price_unavailable, say that and offer to contact sales. If freight is an estimate, label it as an estimate. Machine film is only half or full pallets. Hand film is at most 15 boxes, 1 layer, and 1 half pallet. Do not override a tool error.`;
}

const chatBodySchema = z
  .object({
    id: z.string().max(128).optional(),
    conversationId: z.string().uuid().optional(),
    messages: z
      .array(
        z
          .object({
            id: z.string().min(1).max(128),
            role: z.enum(["user", "assistant"]),
            parts: z
              .array(
                z
                  .object({
                    type: z.string().max(64),
                    text: z.string().max(MAX_TEXT_CHARS).optional(),
                  })
                  .passthrough()
              )
              .max(MAX_PARTS_PER_MESSAGE),
          })
          .passthrough()
      )
      .min(1)
      .max(100),
  });

type IncomingMessage = z.infer<typeof chatBodySchema>["messages"][number];

function isClientToolPart(type: string): boolean {
  return type === "dynamic-tool" || type.startsWith("tool-");
}

function withoutClientToolParts(messages: IncomingMessage[]): UIMessage[] {
  return messages.flatMap((message) => {
    const parts = message.parts.filter((part) => !isClientToolPart(part.type));
    if (parts.length === 0) return [];
    return [
      {
        id: message.id,
        role: message.role,
        parts,
      } as UIMessage,
    ];
  });
}

function withinRateLimit(userId: string): { ok: true } | { ok: false; retryAfterSec: number } {
  const now = Date.now();
  for (const [id, stamps] of hits) {
    const recent = stamps.filter((at) => now - at < RATE_LIMIT_WINDOW_MS);
    if (recent.length === 0) hits.delete(id);
    else if (recent.length !== stamps.length) hits.set(id, recent);
  }

  const recent = hits.get(userId) ?? [];
  if (recent.length >= RATE_LIMIT_MAX) {
    const retryAfterSec = Math.ceil((RATE_LIMIT_WINDOW_MS - (now - recent[0])) / 1000);
    return { ok: false, retryAfterSec };
  }
  recent.push(now);
  hits.set(userId, recent);
  return { ok: true };
}

const DEFAULT_GEMINI_MODEL = "gemini-3.8-flash";

function activeProvider() {
  return (process.env.AI_PROVIDER || "openai").toLowerCase();
}

function usesGemini(provider = activeProvider()) {
  return provider === "gemini" || provider === "google";
}

function geminiApiKey() {
  const key = process.env.GEMINI_API_KEY?.trim() || process.env.GOOGLE_GENERATIVE_AI_API_KEY?.trim();
  return key || undefined;
}

function resolveModel() {
  if (usesGemini()) {
    const google = createGoogleGenerativeAI({ apiKey: geminiApiKey() });
    return google(process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL);
  }
  return openai(process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini");
}

export async function GET() {
  return Response.json({
    poweredBy: usesGemini() ? "Google Gemini" : "OpenAI",
  });
}

export async function POST(req: Request) {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return Response.json({ error: "Sign in to use Assist AI." }, { status: 401 });
  }

  const limit = withinRateLimit(user.id);
  if (!limit.ok) {
    return Response.json(
      { error: "Too many Assist AI requests. Please wait and try again." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  const provider = activeProvider();
  const hasKey = usesGemini(provider) ? Boolean(geminiApiKey()) : Boolean(process.env.OPENAI_API_KEY?.trim());
  if (!hasKey) {
    const missing = usesGemini(provider)
      ? "GEMINI_API_KEY (GOOGLE_GENERATIVE_AI_API_KEY is also unset)"
      : "OPENAI_API_KEY";
    const detail = `Assist AI provider "${provider}" is missing ${missing}.`;
    console.error(detail);
    return Response.json({ error: detail }, { status: 503 });
  }

  let messages: UIMessage[];
  let conversationId: string | null = null;
  try {
    const parsed = chatBodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return Response.json({ error: "Send a message to start." }, { status: 400 });
    }
    const conversation = await resolveOwnedConversation(
      supabase,
      user.id,
      parsed.data.conversationId
    );
    if ("forbidden" in conversation) {
      return Response.json({ error: "That conversation is not available." }, { status: 403 });
    }
    if ("id" in conversation) conversationId = conversation.id;
    const recent = withoutClientToolParts(parsed.data.messages.slice(-HISTORY_LIMIT));
    if (recent.length === 0) {
      return Response.json({ error: "Send a message to start." }, { status: 400 });
    }
    messages = await validateUIMessages({ messages: recent });
  } catch (error) {
    const detail = describeError(error);
    console.error("Assist AI rejected the chat body", detail);
    return Response.json({ error: detail }, { status: 400 });
  }

  try {
    const assistantTools = createAssistantTools(user.id);
    const result = streamText({
      model: resolveModel(),
      instructions: systemInstructions(readCustomerProfile(user.id)),
      messages: await convertToModelMessages(messages),
      tools: assistantTools,
      stopWhen: stepCountIs(5),
      onError: ({ error }) => {
        console.error("Assist AI provider error", error);
      },
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({
        stream: result.stream,
        tools: assistantTools,
        originalMessages: messages,
        onError: (error) => describeError(error),
        onFinish: async (event) => {
          if (!conversationId || event.isCancelled) return;
          const userMessage = [...event.messages].reverse().find((message) => message.role === "user");
          try {
            await saveChatTurn(
              supabase,
              conversationId,
              userMessage?.parts ?? [],
              event.isAborted ? [] : (event.responseMessage?.parts ?? [])
            );
          } catch (error) {
            console.error("Assist AI could not save the conversation", error);
          }
        },
      }),
    });
  } catch (error) {
    const detail = describeError(error);
    console.error("Assist AI provider error", detail);
    return Response.json({ error: detail }, { status: 502 });
  }
}
