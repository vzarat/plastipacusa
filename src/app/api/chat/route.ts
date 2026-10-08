import { createOpenAI, openai } from "@ai-sdk/openai";
import { resolveOwnedConversation, saveChatTurn } from "@/lib/assistant/persist";
import { assistantTools } from "@/lib/assistant/tools";
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

// TODO: El rate limit en memoria debe migrarse a Redis o Supabase si se despliega en serverless.
const hits = new Map<string, number[]>();

const SYSTEM_INSTRUCTIONS = `You are Assist AI for Plastipac USA, an industrial stretch-film supplier. Guide buyers in short, warm English, one question at a time.

Discovery flow:
1. Ask if they already have a stretch wrapper or wrap by hand. The panel opens with "Do you already have a stretch wrapper?".
2. Machine: ask which film width they use, how many pallets they wrap per day, and how many days they operate per month. Ask one of those at a time.
   Hand: ask how much film they use per month, in boxes or rolls.
3. Call estimateUsage for daily and monthly consumption. Never estimate consumption, prices, or freight rates yourself. If estimateUsage returns missing fields, ask for those fields. If it returns usage_unavailable, say the catalog has no film-per-pallet rate and do not invent rolls or pounds.
4. Recommend gauge, width, and package using gaugeAdvice and palletCalculator, with prices from products and product_variants. Machine film is only half or full pallets. Hand film is at most 15 boxes, 1 layer, and 1 half pallet. If a tool returns ok: false, explain that error and which tier to switch to. Do not override the tool.
5. Close by offering the next step: view the product, quote freight with freightRateCheck, or contact sales.

If the buyer does not know a figure, ask once. If they still do not know, offer a clearly labeled range estimate or contact with sales. Never present that range as a Plastipac quote. If a tool returns a null price or price_unavailable, say so clearly and offer to contact sales. Never estimate, round, or invent a price, a total, or a freight rate. If freight is an estimate, label it as an estimate.`;

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

function resolveModel() {
  const provider = (process.env.AI_PROVIDER || "openai").toLowerCase();
  if (provider === "gemini" || provider === "google") {
    const gemini = createOpenAI({
      apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    });
    return gemini.chat(process.env.GEMINI_MODEL || "gemini-2.5-flash");
  }
  return openai(process.env.OPENAI_MODEL || "gpt-4o-mini");
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

  const provider = (process.env.AI_PROVIDER || "openai").toLowerCase();
  const hasKey =
    provider === "gemini" || provider === "google"
      ? Boolean(process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY)
      : Boolean(process.env.OPENAI_API_KEY);
  if (!hasKey) {
    const missing =
      provider === "gemini" || provider === "google"
        ? "GEMINI_API_KEY or GOOGLE_GENERATIVE_AI_API_KEY"
        : "OPENAI_API_KEY";
    console.error(`Assist AI provider "${provider}" is missing ${missing}.`);
    return Response.json({ error: "Assist AI is unavailable right now." }, { status: 503 });
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
    console.error("Assist AI rejected the chat body", error);
    return Response.json({ error: "Send a message to start." }, { status: 400 });
  }

  try {
    const result = streamText({
      model: resolveModel(),
      instructions: SYSTEM_INSTRUCTIONS,
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
        onError: () => PROVIDER_ERROR,
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
    console.error("Assist AI provider error", error);
    return Response.json({ error: PROVIDER_ERROR }, { status: 502 });
  }
}
