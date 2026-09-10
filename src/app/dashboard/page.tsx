import React from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/actions/auth";
import { SetPasswordModal } from "@/components/auth/SetPasswordModal";
import { DashboardClient, DashboardOrder } from "@/components/dashboard/DashboardClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Commercial Client Dashboard | Plastipac USA",
  description: "Manage recurring stretch film orders, review dispatch statuses, and trigger 1-click batch reorders.",
};

export default async function DashboardPage({ searchParams }: any) {
  const currentUser = await getCurrentUser();
  const shouldSetupPassword =
    searchParams?.setup_password === "true" ||
    (currentUser?.profile?.hasPassword === false && !currentUser?.profile?.passwordSetupSkipped);

  if (!currentUser) {
    redirect("/login?redirect=/dashboard");
  }

  // If user is admin, perform a clean single redirect to the Admin Portal
  if (currentUser.profile.role === "admin") {
    redirect("/admin");
  }

  // Sample standard commercial orders for the user's company account
  // In production, these can be retrieved from public.orders if configured
  const sampleOrders: DashboardOrder[] = [
    {
      id: "PO-USA-90412",
      date: "Feb 18, 2026",
      status: "delivered",
      totalUsd: 2650.88,
      itemsSummary: 'FORCE Standard 18" (2 Pallets / 128 Boxes)',
      trackingNumber: "FDX-99482104-TX",
      items: [
        {
          productId: 1,
          productSlug: "stretch-film-18-x-80-ga-x-1500ft",
          productName: 'FORCE Standard 18" Hand Stretch Film',
          productImage:
            "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/FORCE_STANDARD.png",
          packageSize: "64 Boxes (256 Rolls)",
          totalRolls: 256,
          totalBoxes: 64,
          application: "hand",
          variantId: "PL-ST-18-80-1500-PAL",
          sku: "PL-ST-18-80-1500-PAL",
          widthInches: "18",
          gauge: 80,
          lengthFeet: 1500,
          rollsPerBox: 4,
          rollsPerPallet: 256,
          weightLbs: "2,240",
          pricingTier: "Full Pallet Batch",
          unitPrice: 1325.44,
          quantity: 2,
        },
      ],
    },
    {
      id: "PO-USA-89820",
      date: "Jan 12, 2026",
      status: "delivered",
      totalUsd: 1924.40,
      itemsSummary: 'GENESIS Standard 20" Machine Film (1 Pallet / 50 Rolls)',
      trackingNumber: "R&L-339184-US",
      items: [
        {
          productId: 3,
          productSlug: "stretch-film-20-x-80-ga-x-5000ft-1",
          productName: 'GENESIS Standard 20" Machine Stretch Film',
          productImage:
            "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/AUTOMATIC_STRETCH_FILM.png",
          packageSize: "50 Rolls (1 Pallet)",
          totalRolls: 50,
          totalBoxes: 50,
          application: "machine",
          variantId: "PL-GN-20-80-5000-PAL",
          sku: "PL-GN-20-80-5000-PAL",
          widthInches: "20",
          gauge: 80,
          lengthFeet: 5000,
          rollsPerBox: 1,
          rollsPerPallet: 50,
          weightLbs: "1,720",
          pricingTier: "Full Pallet Batch",
          unitPrice: 1924.40,
          quantity: 1,
        },
      ],
    },
    {
      id: "PO-USA-88401",
      date: "Nov 29, 2025",
      status: "delivered",
      totalUsd: 1180.00,
      itemsSummary: 'FORCE Elite 15" Ultra-Yield (1 Pallet / 64 Boxes)',
      trackingNumber: "ESTES-8819302-TX",
      items: [
        {
          productId: 2,
          productSlug: "stretch-film-15-x-ultra-yield-1500ft",
          productName: 'FORCE Elite 15" Hand Stretch Film',
          productImage:
            "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/FORCE_ELITE.png",
          packageSize: "64 Boxes (256 Rolls)",
          totalRolls: 256,
          totalBoxes: 64,
          application: "hand",
          variantId: "PL-EL-15-UY-1500-PAL",
          sku: "PL-EL-15-UY-1500-PAL",
          widthInches: "15",
          gauge: 45,
          lengthFeet: 1500,
          rollsPerBox: 4,
          rollsPerPallet: 256,
          weightLbs: "1,850",
          pricingTier: "Full Pallet Batch",
          unitPrice: 1180.00,
          quantity: 1,
        },
      ],
    },
  ];

  return (
    <>
      <DashboardClient profile={currentUser.profile} orders={sampleOrders} />
      <SetPasswordModal isOpen={shouldSetupPassword} />
    </>
  );
}

