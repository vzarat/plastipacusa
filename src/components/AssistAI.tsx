"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import { Calculator, Ruler, Send, Sparkles, Truck, X } from "lucide-react";

const QUICK_ACTIONS = [
  {
    title: "Pallet Calculator",
    prompt:
      "Help me calculate a Plastipac order. Ask whether I need hand film (15\" or 18\") or machine film (20\"), then tell me which package tier and quantity I should use.",
    icon: Calculator,
  },
  {
    title: "Gauge Advice (GA)",
    prompt:
      "Which gauge (GA) should I choose for my load? Ask about film width, load weight, and whether the freight is hand wrap or an automated machine.",
    icon: Ruler,
  },
  {
    title: "Freight Rate Check",
    prompt:
      "Explain Plastipac freight eligibility. I want to know when RGV and Houston shipping are included based on boxes or pallet size.",
    icon: Truck,
  },
] as const;

function messageText(parts: { type: string; text?: string }[]): string {
  return parts
    .filter((part) => part.type === "text" && part.text)
    .map((part) => part.text)
    .join("");
}

export default function AssistAI() {
  const conversationIdRef = useRef<string | null>(null);
  const loadToken = useRef(0);
  const busyRef = useRef(false);
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages: chatMessages, id, body }) => ({
          body: {
            ...body,
            id,
            messages: chatMessages,
            conversationId: conversationIdRef.current ?? undefined,
          },
        }),
      }),
    []
  );
  const { messages, sendMessage, status, error, stop, setMessages } = useChat({ transport });
  const [open, setOpen] = useState(false);
  const [historyReady, setHistoryReady] = useState(false);
  const [input, setInput] = useState("");
  const busy = status === "submitted" || status === "streaming";
  busyRef.current = busy;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const token = ++loadToken.current;
    setHistoryReady(false);
    const load = async () => {
      try {
        const response = await fetch("/api/chat/conversations");
        if (!response.ok || token !== loadToken.current) return;
        const history = (await response.json()) as {
          conversationId?: string | null;
          messages?: Array<{ id: string; role: "user" | "assistant"; parts: { type: string; text?: string }[] }>;
        };
        if (token !== loadToken.current || busyRef.current) return;
        conversationIdRef.current = history.conversationId ?? null;
        setMessages((history.messages ?? []) as UIMessage[]);
      } catch {
        if (token === loadToken.current) setMessages([]);
      } finally {
        if (token === loadToken.current) setHistoryReady(true);
      }
    };
    void load();
  }, [open, setMessages]);

  const startNewConversation = async () => {
    if (busy) return;
    const token = ++loadToken.current;
    try {
      const response = await fetch("/api/chat/conversations", { method: "POST" });
      if (!response.ok || token !== loadToken.current) return;
      const created = (await response.json()) as { conversationId?: string };
      if (!created.conversationId || token !== loadToken.current) return;
      conversationIdRef.current = created.conversationId;
      setMessages([]);
      setHistoryReady(true);
    } catch {
      if (token === loadToken.current) setHistoryReady(true);
    }
  };

  const submit = (text: string) => {
    const next = text.trim();
    if (!next || busy) return;
    sendMessage({ text: next });
    setInput("");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`fixed bottom-5 right-5 z-[90] inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-slate-900/20 transition hover:bg-sky-700 ${
          open ? "pointer-events-none opacity-0" : ""
        }`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Sparkles className="h-4 w-4 text-sky-300" aria-hidden />
        Assist AI
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              aria-label="Close Assist AI"
              className="fixed inset-0 z-[90] bg-slate-950/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              role="dialog"
              aria-label="Assist AI"
              className="fixed inset-y-0 right-0 z-[91] flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.28, ease: "easeOut" }}
            >
              <header className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-700">
                    Plastipac USA
                  </p>
                  <h2 className="text-lg font-black text-slate-900">Assist AI</h2>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => void startNewConversation()}
                    disabled={busy}
                    className="rounded-lg px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                  >
                    Nueva conversación
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    aria-label="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </header>

              <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Quick actions
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {QUICK_ACTIONS.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.title}
                        type="button"
                        disabled={busy}
                        onClick={() => submit(action.prompt)}
                        className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-left text-sm font-bold text-slate-900 transition hover:border-sky-300 hover:bg-sky-50 disabled:opacity-50"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
                          <Icon className="h-4 w-4" aria-hidden />
                        </span>
                        {action.title}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
                {historyReady && messages.length === 0 && (
                  <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-relaxed text-slate-600">
                    Ask about pallet quantities, gauge, or freight. Packaging limits are enforced
                    for half pallets, layers, and boxes.
                  </p>
                )}
                {messages.map((message) => {
                  const text = messageText(message.parts);
                  if (!text) return null;
                  const isUser = message.role === "user";
                  return (
                    <div
                      key={message.id}
                      className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        isUser
                          ? "ml-auto bg-slate-900 text-white"
                          : "mr-auto border border-slate-200 bg-white text-slate-800"
                      }`}
                    >
                      {text}
                    </div>
                  );
                })}
                {busy && (
                  <p className="text-xs font-semibold text-slate-400">Assist AI is writing…</p>
                )}
                {error && (
                  <p className="text-xs font-medium text-red-700">
                    Assist AI is unavailable right now. Try again in a moment.
                  </p>
                )}
              </div>

              <form
                className="border-t border-slate-200 p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  submit(input);
                }}
              >
                <div className="flex items-end gap-2">
                  <label className="sr-only" htmlFor="assist-ai-input">
                    Message Assist AI
                  </label>
                  <textarea
                    id="assist-ai-input"
                    value={input}
                    rows={2}
                    onChange={(event) => setInput(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        submit(input);
                      }
                    }}
                    placeholder="Ask about pallets, gauge, or freight"
                    className="min-h-12 flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none focus:border-sky-500"
                  />
                  {busy ? (
                    <button
                      type="button"
                      onClick={() => stop()}
                      className="h-11 rounded-xl border border-slate-200 px-3 text-xs font-bold text-slate-700"
                    >
                      Stop
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!input.trim()}
                      className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-900 text-white disabled:opacity-40"
                      aria-label="Send message"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </form>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
