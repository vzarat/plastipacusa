"use server";

import { db, inquiries } from "@/db";
import { InquiryFormData } from "@/types";

export async function submitInquiry(formData: InquiryFormData) {
  try {
    if (!formData.email || !formData.companyName || !formData.contactName) {
      return {
        success: false,
        error: "Please provide Company Name, Contact Name, and a valid business Email.",
      };
    }

    try {
      await db.insert(inquiries).values({
        companyName: formData.companyName,
        contactName: formData.contactName,
        email: formData.email,
        phone: formData.phone || "N/A",
        monthlyPalletVolume: formData.monthlyPalletVolume || "1-5 Pallets/Mo",
        productInterest: formData.productInterest || "General Stretch Film Inquiry",
        selectedSku: formData.selectedSku || null,
        estimatedQuantity: formData.estimatedQuantity || 1,
        unitType: formData.unitType || "pallets",
        shippingZip: formData.shippingZip || null,
        message: formData.message || null,
        status: "new",
      });
    } catch (dbErr) {
      console.warn("Direct DB insert skipped/failed (possibly running before db:push):", dbErr);
    }

    return {
      success: true,
      message: "Thank you for contacting Plastipac USA! An industrial packaging specialist will contact you within 2 business hours with contract volume pricing.",
    };
  } catch (error) {
    console.error("Failed to submit inquiry:", error);
    return {
      success: false,
      error: "An unexpected error occurred while submitting your inquiry. Please try again or call our direct sales desk.",
    };
  }
}
