import { NextRequest, NextResponse } from "next/server";
import { db, inquiries, isDbConfigured } from "@/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      companyName,
      contactName,
      email,
      phone,
      monthlyPalletVolume,
      productInterest,
      selectedSku,
      estimatedQuantity,
      unitType,
      shippingZip,
      message,
    } = body;

    if (!email || !companyName || !contactName) {
      return NextResponse.json(
        { error: "Company name, contact name, and email are required." },
        { status: 400 }
      );
    }

    if (isDbConfigured) {
      try {
        const [newInquiry] = await db
          .insert(inquiries)
          .values({
            companyName,
            contactName,
            email,
            phone: phone || "N/A",
            monthlyPalletVolume: monthlyPalletVolume || "1-5 Pallets/Mo",
            productInterest: productInterest || "General Inquiry",
            selectedSku: selectedSku || null,
            estimatedQuantity: estimatedQuantity || 1,
            unitType: unitType || "pallets",
            shippingZip: shippingZip || null,
            message: message || null,
            status: "new",
          })
          .returning();

        return NextResponse.json(
          {
            success: true,
            inquiryId: newInquiry.id,
            message: "Inquiry registered successfully.",
          },
          { status: 201 }
        );
      } catch (dbError: any) {
        console.warn("DB insert error in API route:", dbError?.message || dbError);
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Inquiry received (offline/demo mode).",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
