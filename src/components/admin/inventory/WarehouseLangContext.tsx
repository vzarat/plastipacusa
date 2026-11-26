"use client";

import React, { createContext, useContext, useMemo, useState } from "react";

export type WarehouseLang = "es" | "en";

type WarehouseLangContextValue = {
  lang: WarehouseLang;
  setLang: (lang: WarehouseLang) => void;
  t: (es: string, en: string) => string;
};

const WarehouseLangContext = createContext<WarehouseLangContextValue | null>(
  null
);

export function WarehouseLangProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [lang, setLang] = useState<WarehouseLang>("es");
  const value = useMemo<WarehouseLangContextValue>(
    () => ({
      lang,
      setLang,
      t: (es, en) => (lang === "es" ? es : en),
    }),
    [lang]
  );
  return (
    <WarehouseLangContext.Provider value={value}>
      {children}
    </WarehouseLangContext.Provider>
  );
}

export function useWarehouseLang() {
  const ctx = useContext(WarehouseLangContext);
  if (!ctx) {
    return {
      lang: "es" as const,
      setLang: (_lang: WarehouseLang) => {},
      t: (es: string, _en: string) => es,
    };
  }
  return ctx;
}

export function WarehouseLangSwitch() {
  const { lang, setLang } = useWarehouseLang();
  return (
    <div
      className="inline-flex items-center rounded-xl border border-slate-200 bg-white p-0.5"
      role="group"
      aria-label="Idioma / Language"
    >
      <button
        type="button"
        onClick={() => setLang("es")}
        className={`min-h-8 rounded-lg px-2.5 text-[11px] font-bold transition ${
          lang === "es"
            ? "bg-emerald-600 text-white"
            : "text-slate-600 hover:bg-slate-50"
        }`}
      >
        ES
      </button>
      <button
        type="button"
        onClick={() => setLang("en")}
        className={`min-h-8 rounded-lg px-2.5 text-[11px] font-bold transition ${
          lang === "en"
            ? "bg-emerald-600 text-white"
            : "text-slate-600 hover:bg-slate-50"
        }`}
      >
        EN
      </button>
    </div>
  );
}
