"use client";

import React, { useState, useEffect } from "react";
import { Search } from "lucide-react";

interface ProductCatalogToolbarProps {
  query: string;
  onQueryChange: (value: string) => void;
  onSubmitSearch: (value: string) => void;
}

export function ProductCatalogToolbar({
  query,
  onQueryChange,
  onSubmitSearch,
}: ProductCatalogToolbarProps) {
  const [localQuery, setLocalQuery] = useState(query);

  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = localQuery.trim();
    onQueryChange(trimmed);
    onSubmitSearch(trimmed);
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col sm:flex-row gap-3 rounded-2xl border border-slate-200/90 bg-white p-3 sm:p-4 shadow-sm"
    >
      <div className="relative flex-1">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="search"
          value={localQuery}
          onChange={(e) => {
            const next = e.target.value;
            setLocalQuery(next);
            onQueryChange(next);
          }}
          placeholder="Search by product title, brand, or description..."
          className="w-full pl-9 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-slate-50 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 focus:border-sky-400"
        />
      </div>
      <button
        type="submit"
        className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-sky-500 via-sky-600 to-blue-700 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-sky-500/20 hover:opacity-95 hover:shadow-lg hover:shadow-sky-500/30 transition-all duration-200 cursor-pointer"
      >
        Search Catalog
      </button>
    </form>
  );
}
