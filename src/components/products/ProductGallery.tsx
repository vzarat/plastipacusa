"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { STRETCH_FILM_PLACEHOLDER } from "@/lib/products";
import {
  Box,
  Layers,
  Eye,
  ZoomIn,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

interface ProductGalleryProps {
  images?: string[];
  imageUrl: string;
  productName: string;
  application: "hand" | "machine";
  categoryLogoUrl?: string | null;
  categoryName?: string | null;
}

const DEFAULT_IMAGE = STRETCH_FILM_PLACEHOLDER;

export function ProductGallery({
  images = [],
  imageUrl,
  productName,
  application,
  categoryLogoUrl,
  categoryName,
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
  const scrollerRef = useRef<HTMLDivElement>(null);
  const swipeRef = useRef({ startX: 0, moved: false });
  const touchingRef = useRef(false);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [imageBroken, setImageBroken] = useState(false);
  const activeImage = imageBroken
    ? DEFAULT_IMAGE
    : galleryList[activeIndex] || DEFAULT_IMAGE;

  useEffect(() => {
    setImageBroken(false);
  }, [activeIndex, imageUrl]);

  // Helper label for each thumbnail
  const getImageLabel = (index: number) => {
    if (index === 0) return "Product Rolls";
    if (index === 1) return "Case Packaging Box";
    return `View ${index + 1}`;
  };

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev > 0 ? prev - 1 : galleryList.length - 1));
  }, [galleryList.length]);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev < galleryList.length - 1 ? prev + 1 : 0));
  }, [galleryList.length]);

  const scrollToSlide = useCallback((index: number) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollTo({ left: index * scroller.clientWidth, behavior: "smooth" });
  }, []);

  const handleCarouselScroll = () => {
    const scroller = scrollerRef.current;
    if (!scroller || scroller.clientWidth === 0) return;
    const index = Math.round(scroller.scrollLeft / scroller.clientWidth);
    const next = Math.min(galleryList.length - 1, Math.max(0, index));
    setActiveIndex((current) => (current === next ? current : next));
  };

  // Keyboard controls & body scroll lock for Lightbox
  useEffect(() => {
    if (!isLightboxOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsLightboxOpen(false);
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      } else if (e.key === "ArrowRight") {
        handleNext();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = originalOverflow;
    };
  }, [isLightboxOpen, handlePrev, handleNext]);

  useEffect(() => {
    if (touchingRef.current) return;
    const scroller = scrollerRef.current;
    if (!scroller || scroller.clientWidth === 0) return;
    const left = activeIndex * scroller.clientWidth;
    if (Math.abs(scroller.scrollLeft - left) > 4) {
      scroller.scrollTo({ left, behavior: "smooth" });
    }
  }, [activeIndex]);

  return (
    <div className="space-y-2 md:space-y-4">
      <div className="relative md:hidden">
        <div
          ref={scrollerRef}
          onScroll={handleCarouselScroll}
          onTouchStart={(event) => {
            touchingRef.current = true;
            swipeRef.current = {
              startX: event.changedTouches[0]?.clientX ?? 0,
              moved: false,
            };
          }}
          onTouchEnd={() => {
            window.setTimeout(() => {
              touchingRef.current = false;
            }, 80);
          }}
          onTouchMove={(event) => {
            const startX = swipeRef.current.startX;
            const nextX = event.changedTouches[0]?.clientX ?? startX;
            if (Math.abs(nextX - startX) > 8) swipeRef.current.moved = true;
          }}
          className="no-scrollbar flex w-full snap-x snap-mandatory overflow-x-auto overscroll-x-contain rounded-2xl border border-slate-200/90 bg-white shadow-sm [-webkit-overflow-scrolling:touch]"
        >
          {galleryList.map((img, idx) => (
            <button
              key={`${img}-${idx}`}
              type="button"
              onClick={() => {
                if (swipeRef.current.moved) return;
                setIsLightboxOpen(true);
              }}
              className="relative aspect-[4/3] min-w-full shrink-0 snap-center bg-white"
              aria-label={`${productName} image ${idx + 1} of ${galleryList.length}`}
            >
              <Image
                src={imageBroken && idx === activeIndex ? DEFAULT_IMAGE : img}
                alt={`${productName} - ${getImageLabel(idx)}`}
                fill
                priority={idx === 0}
                sizes="100vw"
                className="object-contain p-3"
                onError={() => {
                  if (idx === activeIndex && img !== DEFAULT_IMAGE) setImageBroken(true);
                }}
              />
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-center gap-1.5" aria-label="Image pages">
          {galleryList.map((img, idx) => {
            const isActive = activeIndex === idx;
            return (
              <button
                key={`dot-${img}-${idx}`}
                type="button"
                aria-label={`Show image ${idx + 1}`}
                aria-current={isActive ? "true" : undefined}
                onClick={() => {
                  setActiveIndex(idx);
                  scrollToSlide(idx);
                }}
                className="flex h-4 w-4 items-center justify-center"
              >
                <span
                  className={`h-2 w-2 rounded-full border transition-colors ${
                    isActive
                      ? "border-sky-600 bg-sky-600"
                      : "border-slate-300 bg-transparent"
                  }`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Main High-Resolution Showcase Frame */}
      <div
        onClick={() => setIsLightboxOpen(true)}
        className="relative hidden aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm transition-colors group cursor-zoom-in hover:border-sky-300 md:flex"
      >
        <Image
          key={activeImage}
          src={activeImage}
          alt={`${productName} - ${getImageLabel(activeIndex)}`}
          fill
          priority
          placeholder="empty"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
          className="object-contain p-4 transition-all duration-300 group-hover:scale-105"
          onError={() => {
            if (activeImage !== DEFAULT_IMAGE) setImageBroken(true);
          }}
        />

        {/* 1. Category Logo Watermark / Overlay (Top-Left) */}
        {categoryLogoUrl && (
          <div className="absolute top-4 left-4 z-10 pointer-events-none bg-white/85 dark:bg-slate-900/85 backdrop-blur-md p-2.5 md:p-3 rounded-xl border border-white/20 shadow-md flex items-center">
            <Image
              src={categoryLogoUrl}
              alt={categoryName || "Category Brand Logo"}
              width={180}
              height={48}
              className="h-10 md:h-12 w-auto object-contain"
            />
          </div>
        )}

        {/* Application Tag (Top-Right) */}
        <div className="absolute top-4 right-4 z-10">
          <Badge
            variant={application === "hand" ? "default" : "gradient"}
            className="uppercase tracking-wider text-[11px] font-bold shadow-md"
          >
            {application === "hand" ? "Manual Hand Film" : "Automated Machine Film"}
          </Badge>
        </div>

        {/* Image Perspective Indicator Pill (Bottom-Left) */}
        {galleryList.length > 1 && (
          <div className="absolute bottom-4 left-4 z-10">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-slate-900/80 text-white backdrop-blur-sm border border-white/10 shadow-sm">
              <Eye className="w-3.5 h-3.5 text-sky-400" />
              {getImageLabel(activeIndex)} ({activeIndex + 1}/{galleryList.length})
            </span>
          </div>
        )}

        {/* Zoom Hint Button Overlay (Bottom-Right) */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsLightboxOpen(true);
          }}
          className="absolute bottom-4 right-4 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900/80 hover:bg-slate-900 text-white backdrop-blur-md border border-white/10 shadow-md text-xs font-semibold transition-all hover:scale-105 group/zoom"
          aria-label="Click to zoom image in fullscreen"
        >
          <ZoomIn className="w-3.5 h-3.5 text-sky-400 group-hover/zoom:scale-110 transition-transform" />
          <span>Zoom</span>
        </button>
      </div>

      {/* Interactive Thumbnails Selector */}
      {galleryList.length > 1 && (
        <div className="hidden gap-3 md:grid md:grid-cols-2 max-md:hidden">
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

      {/* 2. Fullscreen Interactive Lightbox Modal */}
      {isLightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6"
          onClick={() => setIsLightboxOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="High-resolution image viewer"
        >
          {/* Close button at top-right */}
          <button
            type="button"
            onClick={() => setIsLightboxOpen(false)}
            className="absolute top-5 right-5 z-50 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white/90 hover:text-white transition-colors backdrop-blur-md border border-white/20 shadow-lg cursor-pointer"
            aria-label="Close fullscreen modal"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Category Watermark inside Modal */}
          {categoryLogoUrl && (
            <div className="absolute top-5 left-5 z-50 pointer-events-none bg-white/85 dark:bg-slate-900/85 backdrop-blur-md p-2.5 md:p-3 rounded-xl border border-white/20 shadow-md flex items-center">
              <Image
                src={categoryLogoUrl}
                alt={categoryName || "Category Logo"}
                width={180}
                height={48}
                className="h-10 md:h-12 w-auto object-contain"
              />
            </div>
          )}

          {/* Left Arrow Navigation */}
          {galleryList.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
              className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white backdrop-blur-md border border-white/20 transition-all hover:scale-110 shadow-lg cursor-pointer"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}

          {/* Main Centered High-Resolution Image */}
          <div
            className="relative max-h-[90vh] max-w-[90vw] w-full h-full flex flex-col items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative w-full h-[78vh] flex items-center justify-center">
              <Image
                src={activeImage}
                alt={`${productName} - ${getImageLabel(activeIndex)} fullscreen view`}
                fill
                sizes="90vw"
                priority
                className="object-contain drop-shadow-2xl"
              />
            </div>

            {/* Bottom Caption Indicator */}
            <div className="mt-3 flex items-center gap-3">
              <span className="text-xs font-medium text-white/90 bg-white/10 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/15 shadow-sm">
                {productName} • {getImageLabel(activeIndex)}{" "}
                {galleryList.length > 1 && `(${activeIndex + 1}/${galleryList.length})`}
              </span>
            </div>
          </div>

          {/* Right Arrow Navigation */}
          {galleryList.length > 1 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
              className="absolute right-4 sm:right-8 top-1/2 -translate-y-1/2 z-50 p-3 rounded-full bg-white/10 hover:bg-white/25 text-white backdrop-blur-md border border-white/20 transition-all hover:scale-110 shadow-lg cursor-pointer"
              aria-label="Next image"
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
