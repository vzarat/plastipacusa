import React from "react";
import dynamic from "next/dynamic";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

const PullToRefresh = dynamic(
  () => import("@/components/ui/PullToRefresh"),
  { ssr: false }
);

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <PullToRefresh />
      <AnnouncementBar />
      <Navbar />
      <main className="flex-1 bg-white">{children}</main>
      <Footer />
    </div>
  );
}
