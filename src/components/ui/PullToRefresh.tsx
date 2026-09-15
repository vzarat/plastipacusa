"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCw } from "lucide-react";

const PULL_MAX = 70;
const PULL_THRESHOLD = 60;
const RESISTANCE = 0.45;

export function PullToRefresh() {
  const router = useRouter();
  const startYRef = useRef(0);
  const pullingRef = useRef(false);
  const pullDistanceRef = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isReleasing, setIsReleasing] = useState(false);

  const updatePullDistance = useCallback((value: number) => {
    pullDistanceRef.current = value;
    setPullDistance(value);
  }, []);

  const armed = pullDistance >= PULL_THRESHOLD;
  const rotation = Math.min(360, (pullDistance / PULL_MAX) * 360);
  const scale = Math.min(1.2, 0.8 + pullDistance / 100);
  const showIndicator = pullDistance > 4 || isRefreshing;

  const resetPull = useCallback(() => {
    setIsReleasing(true);
    updatePullDistance(0);
    window.setTimeout(() => setIsReleasing(false), 320);
  }, [updatePullDistance]);

  const triggerRefresh = useCallback(() => {
    setIsRefreshing(true);
    updatePullDistance(PULL_THRESHOLD);

    try {
      router.refresh();
    } catch {
      // ignore
    }

    window.setTimeout(() => {
      window.location.reload();
    }, 450);
  }, [router, updatePullDistance]);

  useEffect(() => {
    const onTouchStart = (event: TouchEvent) => {
      if (isRefreshing) return;
      if (window.scrollY > 0) return;
      if (event.touches.length !== 1) return;

      startYRef.current = event.touches[0].clientY;
      pullingRef.current = true;
      setIsReleasing(false);
    };

    const onTouchMove = (event: TouchEvent) => {
      if (!pullingRef.current || isRefreshing) return;
      if (window.scrollY > 0) {
        pullingRef.current = false;
        updatePullDistance(0);
        return;
      }

      const currentY = event.touches[0].clientY;
      const delta = currentY - startYRef.current;
      if (delta <= 0) {
        updatePullDistance(0);
        return;
      }

      const resisted = Math.min(PULL_MAX, delta * RESISTANCE);
      updatePullDistance(resisted);

      if (resisted > 8 && event.cancelable) {
        event.preventDefault();
      }
    };

    const onTouchEnd = () => {
      if (!pullingRef.current) return;
      pullingRef.current = false;
      if (isRefreshing) return;

      if (pullDistanceRef.current >= PULL_THRESHOLD) {
        triggerRefresh();
      } else {
        resetPull();
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: false });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [isRefreshing, resetPull, triggerRefresh, updatePullDistance]);

  return (
    <div className="block md:hidden pointer-events-none" aria-hidden="true">
      <div
        className={`fixed left-1/2 top-3 z-[90] -translate-x-1/2 ${
          isReleasing ? "transition-transform duration-300" : ""
        }`}
        style={{
          transform: `translateY(${
            isRefreshing ? PULL_THRESHOLD * 0.55 : pullDistance
          }px) scale(${isRefreshing ? 1.1 : showIndicator ? scale : 0.8})`,
          transitionTimingFunction: isReleasing
            ? "cubic-bezier(0.175, 0.885, 0.32, 1.275)"
            : undefined,
          opacity: showIndicator ? 1 : 0,
        }}
      >
        <div
          className={`flex h-11 w-11 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition-all duration-200 ${
            armed || isRefreshing
              ? "scale-110 border-sky-300 bg-sky-50 text-sky-600"
              : "border-slate-200 bg-white/95 text-slate-500"
          }`}
        >
          <RotateCw
            className={`h-5 w-5 ${isRefreshing || armed ? "animate-spin" : ""}`}
            style={
              !isRefreshing && !armed
                ? { transform: `rotate(${rotation}deg)` }
                : undefined
            }
          />
        </div>
      </div>
    </div>
  );
}
