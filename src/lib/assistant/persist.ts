import type { SupabaseClient } from "@supabase/supabase-js";

const MAX_STORED_PARTS = 8;
const MAX_TEXT_CHARS = 2000;
const MAX_TOOL_JSON_CHARS = 4000;
const MAX_PARTS_JSON_CHARS = 12000;
const HISTORY_LIMIT = 20;

export interface StoredChatMessage {
  id: string;
  role: "user" | "assistant";
  parts: Array<{ type: string; text?: string }>;
}

type PartRecord = Record<string, unknown>;

function isRecord(value: unknown): value is PartRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function shrinkJson(value: unknown): unknown {
  const raw = JSON.stringify(value);
  if (!raw) return value;
  if (/stack|postgres|supabase|process\.env|api[_-]?key/i.test(raw)) {
    return { ok: false, error: "That request could not be completed. Please try again." };
  }
  if (raw.length <= MAX_TOOL_JSON_CHARS) return value;
  return { ok: false, error: "That result was too large to keep." };
}

function serverToolPart(part: PartRecord): PartRecord | null {
  const type = typeof part.type === "string" ? part.type : "";
  if (!type.startsWith("tool-") || type === "dynamic-tool") return null;
  const completed =
    part.state === "output-available" || part.state === "output-error" || part.output != null;
  if (!completed) return null;
  return {
    type,
    toolCallId: typeof part.toolCallId === "string" ? part.toolCallId.slice(0, 128) : undefined,
    state: typeof part.state === "string" ? part.state : "output-available",
    input: shrinkJson(part.input),
    output: shrinkJson(part.output),
  };
}

/** Keeps user text, plus assistant text and server tool results. Drops client tool parts. */
export function partsForStorage(role: "user" | "assistant", parts: unknown): unknown[] {
  if (!Array.isArray(parts)) return [];
  const kept: unknown[] = [];
  for (const part of parts) {
    if (!isRecord(part) || typeof part.type !== "string") continue;
    if (part.type === "text") {
      const text = typeof part.text === "string" ? part.text.slice(0, MAX_TEXT_CHARS).trim() : "";
      if (text) kept.push({ type: "text", text });
      continue;
    }
    if (role === "assistant") {
      const toolPart = serverToolPart(part);
      if (toolPart) kept.push(toolPart);
    }
  }

  const limited = kept.slice(0, MAX_STORED_PARTS);
  while (limited.length > 1 && JSON.stringify(limited).length > MAX_PARTS_JSON_CHARS) {
    const toolIndex = limited.findIndex(
      (part) => isRecord(part) && typeof part.type === "string" && part.type.startsWith("tool-")
    );
    if (toolIndex === -1) break;
    limited.splice(toolIndex, 1);
  }
  if (JSON.stringify(limited).length > MAX_PARTS_JSON_CHARS) {
    return limited.filter(
      (part) => isRecord(part) && part.type === "text"
    );
  }
  return limited;
}

function missingTable(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  return error.code === "42P01" || error.code === "PGRST205";
}

export async function createConversation(supabase: SupabaseClient, userId: string) {
  const { data, error } = await supabase
    .from("assistant_conversations")
    .insert({ user_id: userId })
    .select("id")
    .single();
  if (error || !data?.id) {
    console.error("Assist AI could not start a conversation");
    return null;
  }
  return String(data.id);
}

export async function resolveOwnedConversation(
  supabase: SupabaseClient,
  userId: string,
  conversationId?: string | null
): Promise<{ id: string } | { unavailable: true } | { forbidden: true }> {
  if (conversationId) {
    const { data, error } = await supabase
      .from("assistant_conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", userId)
      .maybeSingle();
    if (missingTable(error)) return { unavailable: true };
    if (error) {
      console.error("Assist AI could not load the conversation");
      return { unavailable: true };
    }
    if (!data?.id) return { forbidden: true };
    return { id: String(data.id) };
  }

  const { data, error } = await supabase
    .from("assistant_conversations")
    .select("id")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (missingTable(error)) return { unavailable: true };
  if (error) {
    console.error("Assist AI could not load the conversation");
    return { unavailable: true };
  }
  if (data?.id) return { id: String(data.id) };

  const created = await createConversation(supabase, userId);
  if (!created) return { unavailable: true };
  return { id: created };
}

export async function saveChatTurn(
  supabase: SupabaseClient,
  conversationId: string,
  userParts: unknown,
  assistantParts: unknown
) {
  const rows = [
    { conversation_id: conversationId, role: "user", parts: partsForStorage("user", userParts) },
    {
      conversation_id: conversationId,
      role: "assistant",
      parts: partsForStorage("assistant", assistantParts),
    },
  ].filter((row) => row.parts.length > 0);

  if (rows.length === 0) return;
  const { error } = await supabase.from("assistant_messages").insert(rows);
  if (error) console.error("Assist AI could not save the conversation");
}

export async function loadLatestConversation(
  supabase: SupabaseClient,
  userId: string
): Promise<{ conversationId: string | null; messages: StoredChatMessage[] }> {
  const { data: conversation, error } = await supabase
    .from("assistant_conversations")
    .select("id")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !conversation?.id) {
    if (error && !missingTable(error)) console.error("Assist AI could not load the conversation");
    return { conversationId: null, messages: [] };
  }

  const { data: messages, error: messageError } = await supabase
    .from("assistant_messages")
    .select("id, role, parts")
    .eq("conversation_id", conversation.id)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);
  if (messageError || !messages) {
    console.error("Assist AI could not load the conversation");
    return { conversationId: String(conversation.id), messages: [] };
  }

  return {
    conversationId: String(conversation.id),
    messages: messages
      .reverse()
      .flatMap((row) => {
        if (row.role !== "user" && row.role !== "assistant") return [];
        const parts = partsForStorage(row.role, row.parts);
        if (parts.length === 0) return [];
        return [{ id: String(row.id), role: row.role, parts: parts as StoredChatMessage["parts"] }];
      }),
  };
}
