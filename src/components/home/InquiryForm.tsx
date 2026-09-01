"use client";

import React, { useState } from "react";
import { submitInquiry } from "@/actions/inquiries";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CheckCircle2, AlertCircle, Send, Building2, Package, MapPin } from "lucide-react";

export function InquiryForm() {
  const [formData, setFormData] = useState({
    companyName: "",
    contactName: "",
    email: "",
    phone: "",
    monthlyPalletVolume: "5-20 Pallets/Mo",
    productInterest: "Force Hand Stretch Film",
    estimatedQuantity: 2,
    unitType: "pallets",
    shippingZip: "",
    message: "",
  });

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const res = await submitInquiry({
      companyName: formData.companyName,
      contactName: formData.contactName,
      email: formData.email,
      phone: formData.phone,
      monthlyPalletVolume: formData.monthlyPalletVolume,
      productInterest: formData.productInterest,
      estimatedQuantity: Number(formData.estimatedQuantity) || 1,
      unitType: formData.unitType,
      shippingZip: formData.shippingZip,
      message: formData.message,
    });

    setLoading(false);
    setResult(res);

    if (res.success) {
      setFormData({
        companyName: "",
        contactName: "",
        email: "",
        phone: "",
        monthlyPalletVolume: "5-20 Pallets/Mo",
        productInterest: "Force Hand Stretch Film",
        estimatedQuantity: 2,
        unitType: "pallets",
        shippingZip: "",
        message: "",
      });
    }
  };

  return (
    <section id="inquiry-form" className="py-20 bg-slate-50/50 border-b border-slate-100 scroll-mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Column: Info & Value Proposition */}
          <div className="lg:col-span-5 space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-sky-50 border border-sky-200 text-sky-700 text-xs font-semibold shadow-sm">
              <Building2 className="w-3.5 h-3.5 text-sky-600" /> Direct B2B Wholesale Pricing
            </div>

            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Request a Custom Pallet or Truckload Quote
            </h2>

            <p className="text-slate-600 text-sm leading-relaxed">
              Unlock volume tier discounts, scheduled blanket purchase orders, and free freight evaluations for your manufacturing plant or distribution facility.
            </p>

            <div className="space-y-4 pt-2">
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-100 text-sky-600">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">2-Hour Quote Turnaround</h4>
                  <p className="text-xs text-slate-500">Our packaging engineers calculate freight and gauge optimization quickly.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-100 text-sky-600">
                  <Package className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Free Sample Rolls Available</h4>
                  <p className="text-xs text-slate-500">Test Plastipac film on your rotary wrappers and hand dispensers risk-free.</p>
                </div>
              </div>

              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-100 text-sky-600">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">South Texas & Northern Mexico Delivery</h4>
                  <p className="text-xs text-slate-500">Fast regional cross-border dispatch and truckload rates.</p>
                </div>
              </div>
            </div>

            {/* Direct Phone Numbers Callout */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 space-y-1 text-xs shadow-sm">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Direct Sales Desk:</span>
              <div className="flex items-center gap-3 font-bold text-slate-800">
                <a href="tel:+19564003683" className="text-sky-700 hover:text-sky-800">
                  (956) 400 36 83
                </a>
                <span className="text-slate-300">•</span>
                <a href="tel:+19564006563" className="text-sky-700 hover:text-sky-800">
                  (956) 400 65 63
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: Clean White Form */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl border border-slate-200/90 bg-white p-8 sm:p-10 shadow-xl shadow-slate-200/40">
              <h3 className="text-xl font-bold text-slate-900 mb-1.5">B2B Commercial Quote Generator</h3>
              <p className="text-xs text-slate-500 mb-6">
                Fill out your load specifications below for immediate volume pricing.
              </p>

              {result?.success && (
                <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed">
                    <strong className="block text-sm font-bold text-slate-900">Quote Request Received!</strong>
                    {result.message}
                  </div>
                </div>
              )}

              {result?.error && (
                <div className="mb-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs leading-relaxed">
                    <strong className="block text-sm font-bold text-slate-900">Submission Error</strong>
                    {result.error}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Company Name *
                    </label>
                    <Input
                      required
                      placeholder="e.g. Acme Logistics LLC"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Contact Name *
                    </label>
                    <Input
                      required
                      placeholder="e.g. Jane Doe"
                      value={formData.contactName}
                      onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Business Email *
                    </label>
                    <Input
                      type="email"
                      required
                      placeholder="purchasing@company.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Phone Number *
                    </label>
                    <Input
                      type="tel"
                      required
                      placeholder="(555) 000-0000"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Product Line
                    </label>
                    <select
                      value={formData.productInterest}
                      onChange={(e) => setFormData({ ...formData, productInterest: e.target.value })}
                      className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-xs text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    >
                      <option value="Force Hand Stretch Film (18 Inch)">Force™ Hand Film - 18" Width</option>
                      <option value="Force Hand Stretch Film (15 Inch)">Force™ Hand Film - 15" Width</option>
                      <option value="Force Hand Stretch Film (12 Inch)">Force™ Hand Film - 12" Width</option>
                      <option value="Custom Gauge / Width Specification">Custom Gauge / Pallet Specification</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Monthly Volume
                    </label>
                    <select
                      value={formData.monthlyPalletVolume}
                      onChange={(e) => setFormData({ ...formData, monthlyPalletVolume: e.target.value })}
                      className="w-full h-10 bg-white border border-slate-200 rounded-xl px-3 text-xs text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                    >
                      <option value="1-5 Pallets/Mo">1 - 5 Pallets / Mo</option>
                      <option value="5-20 Pallets/Mo">5 - 20 Pallets / Mo</option>
                      <option value="20-50 Pallets/Mo">20 - 50 Pallets (Truckload)</option>
                      <option value="50+ Pallets/Mo (Enterprise FTL)">50+ Pallets (Multi-Plant)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Destination Zip
                    </label>
                    <Input
                      placeholder="e.g. 75001"
                      value={formData.shippingZip}
                      onChange={(e) => setFormData({ ...formData, shippingZip: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Specific Requirements or Current Film Issues (Optional)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Looking for high puncture resistance on irregular pallet corners; need full pallet pricing for 80 gauge 18 inch rolls..."
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-xs text-slate-900 placeholder:text-slate-400 shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={loading}
                  variant="gradient"
                  size="lg"
                  className="w-full flex items-center justify-center gap-2 font-bold shadow-lg shadow-sky-500/20"
                >
                  <Send className="w-4 h-4" />
                  <span>{loading ? "Calculating & Transmitting..." : "Submit B2B Quote Request"}</span>
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
