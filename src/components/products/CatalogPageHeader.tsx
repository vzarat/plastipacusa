"use client";

import React from "react";
import { Badge } from "@/components/ui/badge";
import { useLanguage } from "@/context/LanguageContext";

export function CatalogPageHeader() {
  const { t } = useLanguage();

  return (
    <div className="mb-10 space-y-2">
      <Badge variant="default" className="uppercase text-xs tracking-wider font-bold">
        {t("catalog.badge")}
      </Badge>
      <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
        {t("catalog.title")}
      </h1>
      <p className="text-sm text-slate-500 max-w-2xl">{t("catalog.subtitle")}</p>
    </div>
  );
}
