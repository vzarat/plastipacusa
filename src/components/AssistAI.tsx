"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { AnimatePresence, motion } from "framer-motion";
import { Calculator, Ruler, Send, Sparkles, Truck, X } from "lucide-react";
import GradientWaves from "@/components/ui/GradientWaves";
import { useAssistStore } from "@/lib/store/useAssistStore";

const QUICK_ACTIONS = [
  { title: "Pallet Calculator", action: "pallet", icon: Calculator },
  { title: "Gauge Advice (GA)", action: "recommend", icon: Ruler },
  { title: "Freight Rate Check", action: "freight", icon: Truck },
] as const;

type AssistProfile = {
  usa_maquina: boolean | null;
  ancho: 15 | 18 | 20 | null;
  pallets_por_dia: number | null;
  dias_al_mes: number | null;
  calibre: 51 | 60 | 70 | 80 | null;
};

const ASSIST_PAUSED = true;
const WELCOME_TEXT = "Do you already have a stretch wrapper?";
const WRAP_CHOICES = [
  { label: "Yes, I use a machine", usa_maquina: true },
  { label: "No, I wrap by hand", usa_maquina: false },
] as const;

function welcomeMessage(): UIMessage {
  return {
    id: "assist-welcome",
    role: "assistant",
    parts: [{ type: "text", text: WELCOME_TEXT }],
  };
}

function chatErrorText(error: Error): string {
  const raw = error.message.trim();
  if (!raw) return "Assist AI is unavailable right now.";
  try {
    const parsed = JSON.parse(raw) as { error?: unknown };
    if (typeof parsed.error === "string" && parsed.error.trim()) return parsed.error;
  } catch {
    // Stream errors are already plain text.
  }
  return raw;
}

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
  const open = useAssistStore((state) => state.open);
  const setOpen = useAssistStore((state) => state.setOpen);
  const [historyReady, setHistoryReady] = useState(false);
  const [poweredBy, setPoweredBy] = useState<string | null>(null);
  const [profile, setProfile] = useState<AssistProfile | null>(null);
  const [wizardNote, setWizardNote] = useState<string | null>(null);
  const [postalCode, setPostalCode] = useState("");
  const [palletsPerDay, setPalletsPerDay] = useState("");
  const [daysPerMonth, setDaysPerMonth] = useState("");
  const [rulesOnly, setRulesOnly] = useState(false);
  const [input, setInput] = useState("");
  const busy = status === "submitted" || status === "streaming";
  busyRef.current = busy;

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/chat")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { poweredBy?: string } | null) => {
        if (!cancelled && typeof data?.poweredBy === "string") setPoweredBy(data.poweredBy);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, setOpen]);

  useEffect(() => {
    if (!open || ASSIST_PAUSED) return;
    const mobile = window.matchMedia("(max-width: 767px)");
    if (!mobile.matches) return;

    const scrollY = window.scrollY;
    const { body, documentElement: html } = document;
    const previous = {
      htmlOverflow: html.style.overflow,
      bodyOverflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    };
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${scrollY}px`;
    body.style.width = "100%";

    return () => {
      html.style.overflow = previous.htmlOverflow;
      body.style.overflow = previous.bodyOverflow;
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.width = previous.width;
      window.scrollTo(0, scrollY);
    };
  }, [open]);

  useEffect(() => {
    if (!open || ASSIST_PAUSED) return;
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
        const loaded = (history.messages ?? []) as UIMessage[];
        setMessages(loaded.length > 0 ? loaded : [welcomeMessage()]);
      } catch {
        if (token === loadToken.current) setMessages([welcomeMessage()]);
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
      setMessages([welcomeMessage()]);
      setHistoryReady(true);
    } catch {
      if (token === loadToken.current) setHistoryReady(true);
    }
  };

  const awaitingWrapChoice = historyReady && !messages.some((message) => message.role === "user");

  useEffect(() => {
    if (!error) return;
    const text = chatErrorText(error);
    if (text.toLowerCase().includes("sign in")) return;
    setRulesOnly(true);
    setWizardNote(text);
  }, [error]);

  const runWizard = async (body: Record<string, unknown>) => {
    try {
      const response = await fetch("/api/assistant/wizard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = (await response.json()) as { error?: string; profile?: AssistProfile; summary?: string };
      if (response.status === 401) {
        setWizardNote(data.error || "Sign in to use Assist AI.");
        return;
      }
      if (data.profile) setProfile(data.profile);
      setWizardNote(data.summary || data.error || "That step could not be completed.");
    } catch {
      setWizardNote("That step could not be completed.");
    }
  };

  useEffect(() => {
    if (!open || ASSIST_PAUSED) return;
    void fetch("/api/assistant/wizard")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { profile?: AssistProfile } | null) => {
        if (data?.profile) setProfile(data.profile);
      })
      .catch(() => undefined);
  }, [open]);

  const submit = (text: string) => {
    const next = text.trim();
    if (!next || busy) return;
    sendMessage({ text: next });
    setInput("");
  };

  if (ASSIST_PAUSED) {
    return (
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
            <motion.div
              role="dialog"
              aria-labelledby="assist-paused-title"
              className="fixed left-1/2 top-24 z-[91] w-[min(22rem,calc(100%-2rem))] -translate-x-1/2 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
            >
              <div className="flex items-start justify-between gap-3">
                <h2 id="assist-paused-title" className="flex items-center gap-1.5 text-base font-black text-slate-900">
                  <Sparkles className="h-4 w-4 text-sky-600" aria-hidden />
                  Assist AI
                </h2>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                We&apos;re still working on Assist AI.
              </p>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    );
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <>
            <motion.button
              type="button"
              aria-label="Close Assist AI"
              className="fixed inset-0 z-[90] hidden bg-slate-950/40 md:block"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
            />
            <motion.aside
              role="dialog"
              aria-label="Assist AI"
              className="fixed inset-0 z-[91] flex h-dvh w-full flex-col overscroll-none bg-white md:inset-y-0 md:right-0 md:left-auto md:h-auto md:max-w-md md:border-l md:border-slate-200 md:shadow-2xl"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "tween", duration: 0.28, ease: "easeOut" }}
            >
              <header className="relative z-20 flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-sky-700">
                    Plastipac USA
                  </p>
                  <h2 className="flex items-center gap-1.5 text-lg font-black text-slate-900">
                    <Sparkles className="h-4 w-4 text-sky-600" aria-hidden />
                    Assist AI
                  </h2>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => void startNewConversation()}
                    disabled={busy}
                    className="rounded-lg px-2 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40"
                  >
                    New chat
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

              <div className="relative flex min-h-0 flex-1 flex-col bg-white">
                <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
                  <div
                    className="absolute inset-x-0 bottom-0 aspect-[5/3] w-full origin-bottom scale-[1.28]"
                    style={{
                      WebkitMaskImage:
                        "linear-gradient(to top, #000 62%, rgba(0,0,0,0.5) 84%, transparent 100%)",
                      maskImage:
                        "linear-gradient(to top, #000 62%, rgba(0,0,0,0.5) 84%, transparent 100%)",
                    }}
                  >
                    <GradientWaves
                      horizonColor="#085de7"
                      waveColor="#0629d4"
                      crestColor="#06B6D4"
                      speed={0.4}
                      amplitude={2.5}
                      waveScale={0.6}
                      waveRatio={0.9}
                      swell={35}
                      turbulence={20}
                      tilt={1.11}
                      zoom={1}
                      height={5.5}
                      fogDepth={15}
                      detail="medium"
                      brightness={1}
                      opacity={1}
                      mouseInteraction={false}
                      parallaxStrength={0.5}
                      grain
                      grainIntensity={0.05}
                      className="gradient-waves-light"
                    />
                  </div>
                </div>

              <div className="relative z-10 shrink-0 px-4 py-3">
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Quick actions
                </p>
                <div className="grid grid-cols-1 gap-2">
                  {QUICK_ACTIONS.map((action, index) => {
                    const Icon = action.icon;
                    return (
                      <motion.button
                        key={action.title}
                        type="button"
                        disabled={busy}
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: 0.06 + index * 0.07, ease: "easeOut" }}
                        onClick={() =>
                          void runWizard(
                            action.action === "freight"
                              ? {
                                  action: "freight",
                                  ...(postalCode.trim() ? { postalCode: postalCode.trim() } : {}),
                                }
                              : { action: action.action }
                          )
                        }
                        className="flex items-center gap-3 rounded-xl border border-white/80 bg-white/55 px-3 py-2.5 text-left text-sm font-bold text-slate-900 shadow-sm backdrop-blur-md transition hover:bg-white/80 disabled:opacity-50"
                      >
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#085de7] text-white">
                          <Icon className="h-4 w-4" aria-hidden />
                        </span>
                        {action.title}
                      </motion.button>
                    );
                  })}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {(profile?.usa_maquina == null ? [15, 18, 20] : profile.usa_maquina ? [20] : [15, 18]).map((width) => (
                    <button
                      key={width}
                      type="button"
                      onClick={() => void runWizard({ action: "save", ancho: width })}
                      className="rounded-full border border-white/80 bg-white/70 px-3 py-1 text-xs font-bold text-slate-800"
                    >
                      {width}"
                    </button>
                  ))}
                  {[51, 60, 70, 80].map((gauge) => (
                    <button
                      key={gauge}
                      type="button"
                      onClick={() => void runWizard({ action: "recommend", calibre: gauge })}
                      className="rounded-full border border-white/80 bg-white/70 px-3 py-1 text-xs font-bold text-[#085de7]"
                    >
                      {gauge} GA
                    </button>
                  ))}
                </div>
                {profile?.usa_maquina === true && (
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <input
                      value={palletsPerDay}
                      onChange={(event) => setPalletsPerDay(event.target.value)}
                      inputMode="numeric"
                      placeholder="Pallets / day"
                      className="h-9 rounded-xl border border-white/80 bg-white/70 px-3 text-sm text-slate-900"
                    />
                    <input
                      value={daysPerMonth}
                      onChange={(event) => setDaysPerMonth(event.target.value)}
                      inputMode="numeric"
                      placeholder="Days / month"
                      className="h-9 rounded-xl border border-white/80 bg-white/70 px-3 text-sm text-slate-900"
                    />
                    <button
                      type="button"
                      className="col-span-2 rounded-xl bg-[#085de7] px-3 py-2 text-xs font-bold text-white"
                      onClick={() => {
                        const pallets = Number(palletsPerDay);
                        const days = Number(daysPerMonth);
                        void runWizard({
                          action: "usage",
                          usa_maquina: true,
                          ...(Number.isInteger(pallets) && pallets >= 1 ? { pallets_por_dia: pallets } : {}),
                          ...(Number.isInteger(days) && days >= 1 && days <= 31 ? { dias_al_mes: days } : {}),
                        });
                      }}
                    >
                      Calculate usage
                    </button>
                  </div>
                )}
                <label className="mt-2 block text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Freight ZIP
                  <input
                    value={postalCode}
                    onChange={(event) => setPostalCode(event.target.value)}
                    inputMode="numeric"
                    maxLength={5}
                    placeholder="78501"
                    className="mt-1 h-9 w-full rounded-xl border border-white/80 bg-white/70 px-3 text-sm font-semibold normal-case tracking-normal text-slate-900"
                  />
                </label>
              </div>

              <div className="relative z-10 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4">
                {awaitingWrapChoice && (
                  <div className="flex flex-col gap-2">
                    {WRAP_CHOICES.map((choice, index) => (
                      <motion.button
                        key={choice.label}
                        type="button"
                        disabled={busy}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.35, delay: 0.28 + index * 0.07, ease: "easeOut" }}
                        onClick={() => void runWizard({ action: "usage", usa_maquina: choice.usa_maquina })}
                        className="rounded-xl border border-white/80 bg-white/55 px-3 py-2.5 text-left text-sm font-bold text-slate-900 shadow-sm backdrop-blur-md transition hover:bg-white/80 disabled:opacity-50"
                      >
                        {choice.label}
                      </motion.button>
                    ))}
                  </div>
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
                          : "mr-auto border border-white/80 bg-white/70 text-slate-800 backdrop-blur-md"
                      }`}
                    >
                      {text}
                    </div>
                  );
                })}
                {busy && (
                  <p className="text-xs font-semibold text-slate-500">Assist AI is writing…</p>
                )}
                {wizardNote && (
                  <p className="mr-auto max-w-[90%] whitespace-pre-wrap break-words rounded-2xl border border-white/80 bg-white/80 px-3.5 py-2.5 text-sm leading-relaxed text-slate-800">
                    {wizardNote}
                  </p>
                )}
                {error && !rulesOnly && (
                  <p className="mr-auto max-w-[90%] whitespace-pre-wrap break-words rounded-2xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-medium leading-relaxed text-red-700">
                    {chatErrorText(error)}
                  </p>
                )}
              </div>

              <form
                className="relative z-10 shrink-0 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-1"
                onSubmit={(event) => {
                  event.preventDefault();
                  submit(input);
                }}
              >
                <div className="flex items-end gap-2 rounded-2xl border border-white/80 bg-white/45 p-2 shadow-lg shadow-sky-950/5 backdrop-blur-xl">
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
                    placeholder={rulesOnly ? "Assist AI is offline. Use the steps above." : "Ask about pallets, gauge, or freight"}
                    disabled={rulesOnly}
                    className="min-h-12 flex-1 resize-none rounded-xl border border-white/70 bg-white/50 px-3 py-2 text-sm text-slate-900 outline-none backdrop-blur-md focus:border-sky-400 disabled:opacity-60"
                  />
                  {busy ? (
                    <button
                      type="button"
                      onClick={() => stop()}
                      className="h-11 rounded-xl border border-white/80 bg-white/60 px-3 text-xs font-bold text-slate-700 backdrop-blur-md"
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
              {poweredBy ? (
                <p className="relative z-10 px-4 pb-3 text-center text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">
                  Powered by {poweredBy}
                </p>
              ) : null}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
