"use client";

import React, { useState } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Box, Layers, Eye } from "lucide-react";

interface ProductGalleryProps {
  images?: string[];
  imageUrl: string;
  productName: string;
  application: "hand" | "machine";
}

const DEFAULT_IMAGE =
  "https://ahvmjptomjjnqjylofpa.supabase.co/storage/v1/object/public/Products/productos_plastipac_manual.png";

export function ProductGallery({
  images = [],
  imageUrl,
  productName,
  application,
}: ProductGalleryProps) {
  // Combine all images cleanly, ensuring at least one valid image
  const galleryList = React.useMemo(() => {
    const list = images && images.length > 0 ? [...images] : [imageUrl || DEFAULT_IMAGE];
    if (!list.includes(imageUrl) && imageUrl) {
      list.unshift(imageUrl);
    }
    return Array.from(new Set(list.filter(Boolean)));
  }, [images, imageUrl]);

  const [activeIndex, setActiveIndex] = useState(0);
  const activeImage = galleryList[activeIndex] || DEFAULT_IMAGE;

  // Helper label for each thumbnail
  const getImageLabel = (index: number) => {
    if (index === 0) return "Product Rolls";
    if (index === 1) return "Case Packaging Box";
    return `View ${index + 1}`;
  };

  return (
    <div className="space-y-4">
      {/* Main High-Resolution Showcase Frame */}
      <div className="relative aspect-[4/3] w-full rounded-3xl border border-slate-200/90 bg-white p-6 overflow-hidden shadow-sm flex items-center justify-center group">
        <Image
          key={activeImage}
          src={activeImage}
          alt={`${productName} - ${getImageLabel(activeIndex)}`}
          fill
          priority
          placeholder="empty"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
          className="object-contain p-4 transition-all duration-300"
        />

        {/* Application Tag */}
        <div className="absolute top-4 left-4 flex gap-2 z-10">
          <Badge
            variant={application === "hand" ? "default" : "gradient"}
            className="uppercase tracking-wider text-xs font-bold shadow-md"
          >
            {application === "hand" ? "Manual Hand Film" : "Automated Machine Film"}
          </Badge>
        </div>

        {/* Image Perspective Pill */}
        {galleryList.length > 1 && (
          <div className="absolute bottom-4 right-4 z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-900/80 text-white backdrop-blur-sm border border-white/10 shadow-sm">
              <Eye className="w-3.5 h-3.5 text-sky-400" />
              {getImageLabel(activeIndex)} ({activeIndex + 1}/{galleryList.length})
            </span>
          </div>
        )}
      </div>

      {/* Interactive Thumbnails Selector */}
      {galleryList.length > 1 && (
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-3">
          {galleryList.map((img, idx) => {
            const isActive = activeIndex === idx;
            const Icon = idx === 0 ? Layers : Box;

            return (
              <button
                key={img + idx}
                type="button"
                onClick={() => setActiveIndex(idx)}
                onMouseEnter={() => setActiveIndex(idx)}
                aria-label={`Select ${getImageLabel(idx)}`}
                className={`relative rounded-2xl border p-2.5 bg-white transition-all duration-200 flex items-center gap-3 text-left cursor-pointer group ${
                  isActive
                    ? "border-sky-500 ring-2 ring-sky-500/20 shadow-md bg-sky-50/50 scale-[1.02]"
                    : "border-slate-200 hover:border-sky-300 hover:bg-slate-50 opacity-75 hover:opacity-100"
                }`}
              >
                {/* Thumbnail Image */}
                <div className="relative w-14 h-14 rounded-xl bg-slate-50 border border-slate-100 flex-shrink-0 overflow-hidden flex items-center justify-center">
                  <Image
                    src={img}
                    alt={`${productName} thumbnail ${idx + 1}`}
                    fill
                    sizes="56px"
                    className="object-contain p-1"
                  />
                </div>

                {/* Text Description */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1 text-[10px] font-mono uppercase text-slate-400 font-bold">
                    <Icon className="w-3 h-3 text-sky-600" />
                    <span>View {idx + 1}</span>
                  </div>
                  <div className={`text-xs font-bold truncate mt-0.5 ${isActive ? "text-sky-900" : "text-slate-700"}`}>
                    {getImageLabel(idx)}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
