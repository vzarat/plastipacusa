"use client";

import React, { useState } from "react";
import { formatCurrency } from "@/lib/utils";
import { useLanguage } from "@/context/LanguageContext";
import {
  Building2,
  Search,
  CheckCircle2,
  AlertCircle,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  FileCheck,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface B2BCustomer {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  city: string;
  state: string;
  creditTerms: "Net 30" | "Net 60" | "Prepaid";
  creditLimit: number;
  creditUsed: number;
  taxExempt: boolean;
  status: "approved" | "under_review" | "suspended";
}

const DEFAULT_CUSTOMERS: B2BCustomer[] = [
  {
    id: "CUST-GM-901",
    companyName: "General Motors Reynosa Plant",
    contactName: "David Vance",
    email: "procurement@gm.com",
    phone: "(956) 555-0192",
    city: "Reynosa / McAllen",
    state: "TX",
    creditTerms: "Net 60",
    creditLimit: 150000,
    creditUsed: 42650,
    taxExempt: true,
    status: "approved",
  },
  {
    id: "CUST-ACM-802",
    companyName: "Acme Logistics Corp",
    contactName: "Marcus Vance",
    email: "m.vance@acmelogistics.com",
    phone: "(956) 555-0192",
    city: "Laredo",
    state: "TX",
    creditTerms: "Net 30",
    creditLimit: 75000,
    creditUsed: 18450,
    taxExempt: true,
    status: "approved",
  },
  {
    id: "CUST-LST-744",
    companyName: "Lone Star Packaging & Freight",
    contactName: "Sarah Jenkins",
    email: "sjenkins@lonestarfreight.net",
    phone: "(210) 844-3200",
    city: "San Antonio",
    state: "TX",
    creditTerms: "Net 30",
    creditLimit: 50000,
    creditUsed: 21900,
    taxExempt: true,
    status: "approved",
  },
  {
    id: "CUST-APX-620",
    companyName: "Apex Distribution Center",
    contactName: "David Rodriguez",
    email: "procurement@apexdist.com",
    phone: "(713) 902-1144",
    city: "Houston",
    state: "TX",
    creditTerms: "Net 30",
    creditLimit: 60000,
    creditUsed: 3540,
    taxExempt: true,
    status: "under_review",
  },
  {
    id: "CUST-PIN-511",
    companyName: "Pinnacle Warehousing LLC",
    contactName: "Linda Chen",
    email: "linda.chen@pinnaclewarehousing.com",
    phone: "(312) 438-9010",
    city: "Chicago",
    state: "IL",
    creditTerms: "Net 30",
    creditLimit: 45000,
    creditUsed: 12800,
    taxExempt: true,
    status: "approved",
  },
];

export function AdminCustomersView() {
  const { t } = useLanguage();
  const [customers, setCustomers] = useState<B2BCustomer[]>(DEFAULT_CUSTOMERS);
  const [search, setSearch] = useState("");

  const filtered = customers.filter((c) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        c.companyName.toLowerCase().includes(q) ||
        c.contactName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        c.city.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold mb-1">
            <span>Admin</span>
            <span>/</span>
            <span className="text-slate-900 font-bold">{t("admin.customers")}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {t("admin.customers")}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            {t("admin.manageCustomers")}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            size="sm"
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-purple-700 hover:bg-purple-800 text-white shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add B2B Commercial Account</span>
          </Button>
        </div>
      </div>

      {/* Customers Table Container */}
      <div className="rounded-2xl border border-slate-200/90 bg-white shadow-xs overflow-hidden">
        {/* Controls */}
        <div className="p-4 sm:px-6 border-b border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by company, procurement agent, or city..."
              className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-600/10 focus:border-purple-400"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4 sm:px-6">Commercial Account</th>
                <th className="py-3.5 px-3">Primary Contact</th>
                <th className="py-3.5 px-3">Location</th>
                <th className="py-3.5 px-3">Credit Terms</th>
                <th className="py-3.5 px-3">Credit Limit / Used</th>
                <th className="py-3.5 px-3">Tax Resale Cert</th>
                <th className="py-3.5 px-4 sm:px-6 text-right">Approval Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filtered.map((client) => (
                <tr key={client.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-4 sm:px-6">
                    <div>
                      <p className="font-bold text-slate-900 text-xs">{client.companyName}</p>
                      <p className="font-mono text-[10px] text-purple-700 font-semibold">
                        {client.id}
                      </p>
                    </div>
                  </td>

                  <td className="py-4 px-3">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-slate-800">{client.contactName}</p>
                      <p className="text-[11px] text-slate-400">{client.email}</p>
                    </div>
                  </td>

                  <td className="py-4 px-3 text-slate-600">
                    {client.city}, {client.state}
                  </td>

                  <td className="py-4 px-3">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 font-bold text-slate-700 text-[11px]">
                      {client.creditTerms}
                    </span>
                  </td>

                  <td className="py-4 px-3">
                    <div className="space-y-0.5">
                      <p className="font-bold text-slate-900 text-xs">
                        {formatCurrency(client.creditLimit)}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {formatCurrency(client.creditUsed)} active balance
                      </p>
                    </div>
                  </td>

                  <td className="py-4 px-3">
                    {client.taxExempt ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        <FileCheck className="w-3 h-3 text-emerald-600" />
                        Verified Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                        Pending Upload
                      </span>
                    )}
                  </td>

                  <td className="py-4 px-4 sm:px-6 text-right">
                    {client.status === "approved" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        Approved Tier
                      </span>
                    ) : client.status === "under_review" ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 border border-amber-200 text-amber-800 text-[10px] font-bold">
                        Credit Review
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-rose-800 text-[10px] font-bold">
                        Suspended
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

