"use server";

import { db, inquiries } from "@/db";
import { CONTACT_EMAIL, CONTACT_FROM } from "@/lib/company-email";
import { sendEmail } from "@/lib/email";
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

    await sendEmail({
      from: CONTACT_FROM,
      to: CONTACT_EMAIL,
      replyTo: formData.email,
      subject: `Business proposal — ${formData.companyName}`,
      text: [
        "New business proposal",
        "",
        `Company: ${formData.companyName}`,
        `Contact: ${formData.contactName}`,
        `Email: ${formData.email}`,
        `Phone: ${formData.phone || "N/A"}`,
        `Monthly volume: ${formData.monthlyPalletVolume || "1-5 Pallets/Mo"}`,
        `Interest: ${formData.productInterest || "General Stretch Film Inquiry"}`,
        formData.selectedSku ? `SKU: ${formData.selectedSku}` : null,
        `Quantity: ${formData.estimatedQuantity || 1} ${formData.unitType || "pallets"}`,
        formData.shippingZip ? `ZIP: ${formData.shippingZip}` : null,
        formData.message ? `Message: ${formData.message}` : null,
      ]
        .filter(Boolean)
        .join("\n"),
    });

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
