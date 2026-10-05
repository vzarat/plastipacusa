"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { DriveStep, Driver } from "driver.js";
import "@/components/onboarding/onboarding-tour.css";
import { useCartStore } from "@/lib/store/useCartStore";
import {
  advanceTourPhase,
  hydrateTourFromQuery,
  markTourCompleted,
  readTourState,
  syncTourQueryParams,
  type TourPhase,
  type TourState,
} from "@/lib/onboarding-tour";

const POPOVER_CLASS = "plastipac-tour-popover";
const MOBILE_TOUR_QUERY = "(max-width: 767px)";

const MOBILE_STEPS = [
  {
    id: "hero",
    title: "Industrial Stretch Film",
    body: "Explore high-yield hand and machine stretch films engineered for extreme load containment.",
    selector: "#hero-carousel, [data-tour='hero']",
    slide: 0 as number | null,
  },
  {
    id: "rgv",
    title: "Free RGV Local Shipping",
    body: "Qualified orders starting from 1 Layer (64 rolls / 16 boxes) get $0 freight delivery across the Rio Grande Valley.",
    selector: "#rgv-shipping, [data-tour='rgv-shipping']",
    slide: 1 as number | null,
  },
  {
    id: "houston",
    title: "Houston Friday Corridor",
    body: "Exclusive $0 shipping every Friday to Houston industrial docks on Full Pallet orders (256 rolls).",
    selector: "#houston-shipping, [data-tour='houston-shipping']",
    slide: 2 as number | null,
  },
  {
    id: "catalog",
    title: "Product Filter Bar",
    body: "Filter films by Gauge (GA), Roll Length, or Width to find the exact specification for your facility.",
    selector: "#product-catalog, [data-tour='catalog-filters']",
    slide: null,
  },
  {
    id: "nav",
    title: "Navigation & Custom Quotes",
    body: "Access categories, company info, and wholesale quote requests anytime using the top menu.",
    selector: "#mobile-nav-trigger, [data-tour='nav-trigger']",
    slide: null,
  },
] as const;

type TourAnchor = {
  top: number;
  left: number;
  width: number;
  height: number;
  tipTop: number;
  tipLeft: number;
  place: "above" | "below";
  arrowLeft: number;
};

function measureTourAnchor(node: HTMLElement, tooltipHeight: number): TourAnchor {
  const rect = node.getBoundingClientRect();
  const pad = 8;
  const tipWidth = Math.min(320, window.innerWidth - 24);
  const gap = 14;
  const top = Math.max(8, rect.top - pad);
  const left = Math.max(8, rect.left - pad);
  const width = Math.min(rect.width + pad * 2, window.innerWidth - 16);
  const height = Math.max(36, rect.height + pad * 2);
  const center = left + width / 2;
  const tipLeft = Math.max(12, Math.min(center - tipWidth / 2, window.innerWidth - tipWidth - 12));
  const spaceBelow = window.innerHeight - (top + height);
  const spaceAbove = top;
  const place: "above" | "below" =
    spaceBelow >= tooltipHeight + gap || spaceBelow >= spaceAbove ? "below" : "above";
  let tipTop =
    place === "below" ? top + height + gap : top - tooltipHeight - gap;
  if (tipTop < 8) tipTop = Math.max(8, window.innerHeight - tooltipHeight - 12);
  if (tipTop + tooltipHeight > window.innerHeight - 8) {
    tipTop = Math.max(8, window.innerHeight - tooltipHeight - 12);
  }
  const arrowLeft = Math.min(tipWidth - 18, Math.max(16, center - tipLeft - 6));
  return { top, left, width, height, tipTop, tipLeft, place, arrowLeft };
}

function isMobileTourViewport() {
  return typeof window !== "undefined" && window.matchMedia(MOBILE_TOUR_QUERY).matches;
}

function waitForSelector(
  selector: string,
  timeoutMs = 5000
): Promise<Element | null> {
  return new Promise((resolve) => {
    const existing = document.querySelector(selector);
    if (existing) {
      resolve(existing);
      return;
    }
    const started = Date.now();
    const observer = new MutationObserver(() => {
      const el = document.querySelector(selector);
      if (el) {
        observer.disconnect();
        resolve(el);
      } else if (Date.now() - started > timeoutMs) {
        observer.disconnect();
        resolve(null);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => {
      observer.disconnect();
      resolve(document.querySelector(selector));
    }, timeoutMs);
  });
}

/** Dynamically load driver.js + CSS only when the tour actually runs */
async function loadDriver() {
  const [{ driver }] = await Promise.all([
    import("driver.js"),
    import("driver.js/dist/driver.css"),
  ]);
  return driver;
}

function stepsForPhase(phase: TourPhase): DriveStep[] {
  switch (phase) {
    case "home":
      return [
        {
          element: "[data-tour='tour-catalog']",
          popover: {
            title: "1. Browse Stretch Film Catalog",
            description:
              "Explore FORCE and GENESIS series cards. Pick a film that matches your load profile — next we’ll open a product detail page.",
            side: "bottom",
            align: "start",
          },
        },
      ];
    case "product":
      return [
        {
          element: "[data-tour='product-specs']",
          popover: {
            title: "2. Review Specs & Quantity",
            description:
              "Confirm gauge, width, length, and pallet quantities. Adjust quantity before choosing a volume tier.",
            side: "left",
            align: "start",
          },
        },
        {
          element: "[data-tour='product-price-tiers']",
          popover: {
            title: "Volume price tiers",
            description:
              "Unit price drops as you move from single cases to half / full pallets — wholesale discounts unlock automatically.",
            side: "left",
            align: "start",
          },
        },
        {
          element: "[data-tour='product-add-to-cart']",
          popover: {
            title: "Add to cart",
            description:
              "Add your package to the cart to continue. You’ll review discounts next.",
            side: "top",
            align: "center",
          },
        },
      ];
    case "auth":
      return [
        {
          element: "[data-tour='nav-sign-in']",
          popover: {
            title: "3. Account & Sign In",
            description:
              "Sign in or register to save cart items, unlock wholesale tiers, and access your order dashboard.",
            side: "bottom",
            align: "end",
          },
        },
      ];
    case "cart":
      return [
        {
          element: "[data-tour='cart-quick-actions']",
          popover: {
            title: "4. Cart & Volume Discounts",
            description:
              "Review rolls/pallets, applied tier pricing, request a quote, or proceed to secure checkout.",
            side: "left",
            align: "start",
          },
        },
      ];
    case "checkout":
      return [
        {
          element: "[data-tour='checkout-payment-options']",
          popover: {
            title: "5. Checkout & Payment",
            description:
              "Pay with Credit Card via Stripe Elements, or apply for Commercial Net 30 credit for approved B2B accounts.",
            side: "bottom",
            align: "start",
          },
        },
      ];
    case "dashboard":
      return [
        {
          element:
            "[data-tour='dashboard-invoices-panel'], [data-tour='dashboard-invoices-nav']",
          popover: {
            title: "6. Orders & PDF Statements",
            description:
              "Open Invoices to view purchase orders and download your branded Plastipac PDF statement anytime.",
            side: "bottom",
            align: "start",
          },
        },
      ];
    default:
      return [];
  }
}

function createDriverInstance(
  driverFactory: typeof import("driver.js").driver,
  steps: DriveStep[],
  onDestroyed: (opts: { skipped: boolean; finished: boolean }) => void
): Driver {
  let finished = false;
  let skipped = false;

  return driverFactory({
    showProgress: true,
    animate: true,
    allowClose: true,
    overlayOpacity: 0.55,
    stagePadding: 10,
    stageRadius: 14,
    smoothScroll: true,
    popoverClass: POPOVER_CLASS,
    nextBtnText: "Next",
    prevBtnText: "Back",
    doneBtnText: "Done",
    showButtons: ["next", "previous", "close"],
    progressText: "{{current}} of {{total}}",
    steps,
    onPopoverRender: (popover) => {
      const closeBtn = popover.wrapper.querySelector(
        ".driver-popover-close-btn"
      ) as HTMLButtonElement | null;
      if (closeBtn) closeBtn.textContent = "Skip";
    },
    onCloseClick: (_el, _step, opts) => {
      skipped = true;
      opts.driver.destroy();
    },
    onDestroyStarted: (_el, _step, opts) => {
      if (!skipped && opts.driver.isLastStep()) finished = true;
      opts.driver.destroy();
    },
    onDestroyed: () => onDestroyed({ skipped, finished }),
  });
}

/**
 * End-to-end guided buying tour.
 * driver.js is dynamically imported — zero cost until the tour starts.
 */
export function OnboardingTour() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const isDrawerOpen = useCartStore((s) => s.isDrawerOpen);
  const openDrawer = useCartStore((s) => s.openDrawer);
  const activeDriver = useRef<Driver | null>(null);
  const runningRef = useRef(false);
  const touchStartX = useRef<number | null>(null);
  const navigatedForStep = useRef<number | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [eventKick, setEventKick] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [tourOn, setTourOn] = useState(false);
  const [mobileStep, setMobileStep] = useState(0);
  const [anchor, setAnchor] = useState<TourAnchor | null>(null);

  const destroyActive = useCallback(() => {
    try {
      activeDriver.current?.destroy();
    } catch {
      // ignore
    }
    activeDriver.current = null;
    runningRef.current = false;
  }, []);

  const runPhase = useCallback(
    async (state: TourState) => {
      if (isMobileTourViewport()) return;
      if (runningRef.current) return;
      if (!state.active || state.completed || state.phase === "done") return;

      const onHome = pathname === "/" || pathname === "";
      const onProduct =
        pathname.startsWith("/products/") && pathname !== "/products";
      const onCheckout = pathname.startsWith("/checkout");
      const onDashboard = pathname.startsWith("/dashboard");
      const phase = state.phase;

      if (phase === "home") {
        if (!onHome) {
          router.push("/?tour=true&step=1");
          return;
        }
        const el = await waitForSelector("[data-tour='tour-catalog']");
        if (!el) return;

        runningRef.current = true;
        const driverFactory = await loadDriver();
        const instance = createDriverInstance(
          driverFactory,
          stepsForPhase("home"),
          ({ skipped, finished }) => {
            runningRef.current = false;
            activeDriver.current = null;
            if (skipped) {
              markTourCompleted();
              return;
            }
            if (finished) {
              advanceTourPhase("product");
              const cardLink = document.querySelector(
                "[data-tour='tour-catalog'] a[href^='/products/']"
              ) as HTMLAnchorElement | null;
              if (cardLink?.pathname) {
                router.push(`${cardLink.pathname}?tour=true&step=2`);
              } else {
                router.push("/products?tour=true&step=2");
              }
            }
          }
        );
        activeDriver.current = instance;
        instance.drive();
        return;
      }

      if (phase === "product") {
        if (!onProduct) return;
        const el = await waitForSelector("[data-tour='product-specs']");
        if (!el) return;

        runningRef.current = true;
        const driverFactory = await loadDriver();
        const instance = createDriverInstance(
          driverFactory,
          stepsForPhase("product"),
          ({ skipped, finished }) => {
            runningRef.current = false;
            activeDriver.current = null;
            if (skipped) {
              markTourCompleted();
              return;
            }
            if (finished) {
              advanceTourPhase("auth");
              setEventKick((k) => k + 1);
            }
          }
        );
        activeDriver.current = instance;
        instance.drive();
        return;
      }

      if (phase === "auth") {
        const el = await waitForSelector("[data-tour='nav-sign-in']", 2500);
        if (!el) {
          advanceTourPhase("cart");
          openDrawer();
          setEventKick((k) => k + 1);
          return;
        }

        runningRef.current = true;
        const driverFactory = await loadDriver();
        const instance = createDriverInstance(
          driverFactory,
          stepsForPhase("auth"),
          ({ skipped, finished }) => {
            runningRef.current = false;
            activeDriver.current = null;
            if (skipped) {
              markTourCompleted();
              return;
            }
            if (finished) {
              advanceTourPhase("cart");
              openDrawer();
              setEventKick((k) => k + 1);
            }
          }
        );
        activeDriver.current = instance;
        instance.drive();
        return;
      }

      if (phase === "cart") {
        if (!isDrawerOpen) {
          openDrawer();
          return;
        }
        const el = await waitForSelector("[data-tour='cart-quick-actions']");
        if (!el) return;

        runningRef.current = true;
        const driverFactory = await loadDriver();
        const instance = createDriverInstance(
          driverFactory,
          stepsForPhase("cart"),
          ({ skipped, finished }) => {
            runningRef.current = false;
            activeDriver.current = null;
            if (skipped) {
              markTourCompleted();
              return;
            }
            if (finished) {
              advanceTourPhase("checkout");
              router.push("/checkout?tour=true&step=5");
            }
          }
        );
        activeDriver.current = instance;
        instance.drive();
        return;
      }

      if (phase === "checkout") {
        if (!onCheckout) return;
        const el = await waitForSelector(
          "[data-tour='checkout-payment-options']"
        );
        if (!el) return;

        runningRef.current = true;
        const driverFactory = await loadDriver();
        const instance = createDriverInstance(
          driverFactory,
          stepsForPhase("checkout"),
          ({ skipped, finished }) => {
            runningRef.current = false;
            activeDriver.current = null;
            if (skipped) {
              markTourCompleted();
              return;
            }
            if (finished) {
              advanceTourPhase("dashboard");
              router.push("/dashboard?tour=true&step=6&tab=invoices");
            }
          }
        );
        activeDriver.current = instance;
        instance.drive();
        return;
      }

      if (phase === "dashboard") {
        if (!onDashboard) return;
        const el =
          (await waitForSelector(
            "[data-tour='dashboard-invoices-panel']",
            2500
          )) ||
          (await waitForSelector("[data-tour='dashboard-invoices-nav']", 2500));
        if (!el) return;

        runningRef.current = true;
        const driverFactory = await loadDriver();
        const instance = createDriverInstance(
          driverFactory,
          stepsForPhase("dashboard"),
          ({ skipped, finished }) => {
            runningRef.current = false;
            activeDriver.current = null;
            if (skipped || finished) markTourCompleted();
          }
        );
        activeDriver.current = instance;
        instance.drive();
      }
    },
    [pathname, isDrawerOpen, openDrawer, router]
  );

  useEffect(() => {
    hydrateTourFromQuery();
  }, []);

  useEffect(() => {
    let cancelled = false;
    destroyActive();

    const timer = window.setTimeout(() => {
      if (cancelled) return;
      const state = readTourState();
      const active = Boolean(state.active && !state.completed && state.phase !== "done");
      setTourOn(active);
      syncTourQueryParams(state);
      void runPhase(state);
    }, 400);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      destroyActive();
    };
  }, [pathname, isDrawerOpen, runPhase, destroyActive, eventKick]);

  useEffect(() => {
    const media = window.matchMedia(MOBILE_TOUR_QUERY);
    const apply = () => setIsMobile(media.matches);
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  useEffect(() => {
    if (!isMobile || !tourOn) {
      setAnchor(null);
      return;
    }
    let cancelled = false;
    const step = MOBILE_STEPS[mobileStep];

    const place = () => {
      const node = document.querySelector(step.selector) as HTMLElement | null;
      if (!node) return;
      const tipHeight = tooltipRef.current?.offsetHeight ?? 210;
      setAnchor(measureTourAnchor(node, tipHeight));
    };

    void (async () => {
      if (pathname !== "/") {
        if (navigatedForStep.current !== mobileStep) {
          navigatedForStep.current = mobileStep;
          router.push("/");
        }
        return;
      }
      if (step.slide != null) {
        window.dispatchEvent(new CustomEvent("plastipac:hero-slide", { detail: step.slide }));
      }
      const ready = await waitForSelector(step.selector, 1600);
      if (cancelled || !ready) return;
      ready.scrollIntoView({ behavior: "smooth", block: "center" });
      window.setTimeout(() => {
        if (!cancelled) place();
      }, 480);
    })();

    const onMove = () => place();
    window.addEventListener("scroll", onMove, { passive: true });
    window.addEventListener("resize", onMove);
    return () => {
      cancelled = true;
      window.removeEventListener("scroll", onMove);
      window.removeEventListener("resize", onMove);
    };
  }, [isMobile, tourOn, mobileStep, pathname, router]);

  useEffect(() => {
    const bump = () => setEventKick((k) => k + 1);
    const onStart = () => {
      navigatedForStep.current = null;
      setMobileStep(0);
      setTourOn(true);
      bump();
    };
    window.addEventListener("plastipac:start-tour", onStart);
    window.addEventListener("plastipac:tour-phase", bump);
    return () => {
      window.removeEventListener("plastipac:start-tour", onStart);
      window.removeEventListener("plastipac:tour-phase", bump);
    };
  }, []);

  const closeMobileTour = () => {
    markTourCompleted();
    setTourOn(false);
    setAnchor(null);
    window.dispatchEvent(new CustomEvent("plastipac:hero-slide-release"));
  };

  const goToMobileStep = (next: number) => {
    const clamped = Math.min(MOBILE_STEPS.length - 1, Math.max(0, next));
    if (clamped !== mobileStep) navigatedForStep.current = null;
    setMobileStep(clamped);
  };

  const advanceMobileStep = () => {
    if (mobileStep >= MOBILE_STEPS.length - 1) {
      closeMobileTour();
      return;
    }
    goToMobileStep(mobileStep + 1);
  };

  if (!isMobile || !tourOn) return null;

  const current = MOBILE_STEPS[mobileStep];
  const isLastStep = mobileStep >= MOBILE_STEPS.length - 1;

  return (
    <>
      <div className="fixed inset-0 z-[90] md:hidden" aria-hidden>
        <div
          className="absolute rounded-2xl transition-[top,left,width,height] duration-300 ease-out"
          style={
            anchor
              ? {
                  top: anchor.top,
                  left: anchor.left,
                  width: anchor.width,
                  height: anchor.height,
                  boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.62)",
                }
              : { inset: 0, boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.62)" }
          }
        />
      </div>
      <div
        ref={tooltipRef}
        className="fixed z-[100] w-[min(20rem,calc(100vw-1.5rem))] bg-white text-slate-900 border border-slate-200 shadow-2xl rounded-2xl p-4 max-w-xs md:hidden"
        style={
          anchor
            ? { top: anchor.tipTop, left: anchor.tipLeft }
            : { left: 16, right: 16, bottom: 24, width: "auto" }
        }
        role="dialog"
        aria-modal="false"
        aria-labelledby="mobile-tour-title"
        onTouchStart={(event) => {
          touchStartX.current = event.changedTouches[0]?.clientX ?? null;
        }}
        onTouchEnd={(event) => {
          if (touchStartX.current == null) return;
          const delta = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
          touchStartX.current = null;
          if (delta <= -48) advanceMobileStep();
          else if (delta >= 48) goToMobileStep(mobileStep - 1);
        }}
      >
        {anchor && (
          <span
            aria-hidden
            className={`absolute h-3 w-3 rotate-45 border-slate-200 bg-white ${
              anchor.place === "below" ? "-top-1.5 border-l border-t" : "-bottom-1.5 border-b border-r"
            }`}
            style={{ left: anchor.arrowLeft }}
          />
        )}
        <div key={current.id} className="animate-in fade-in duration-300">
          <span className="bg-slate-100 text-slate-900 font-semibold px-2.5 py-1 rounded-full text-xs">
            Step {mobileStep + 1} of {MOBILE_STEPS.length}
          </span>
          <h2 id="mobile-tour-title" className="mt-3 text-base font-semibold text-slate-900">
            {current.title}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{current.body}</p>
        </div>
        <div className="mt-4 flex justify-center gap-1.5">
          {MOBILE_STEPS.map((step, index) => (
            <button
              key={step.id}
              type="button"
              aria-label={`Step ${index + 1}`}
              aria-current={index === mobileStep ? "step" : undefined}
              onClick={() => goToMobileStep(index)}
              className="flex h-6 w-6 items-center justify-center"
            >
              <span
                className={`h-2 w-2 rounded-full ${
                  index === mobileStep ? "bg-slate-900" : "bg-slate-200"
                }`}
              />
            </button>
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={closeMobileTour}
            className="text-slate-500 hover:text-slate-900 font-medium px-3 py-2 transition-colors"
          >
            Skip Tour
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => goToMobileStep(mobileStep - 1)}
              disabled={mobileStep === 0}
              className="text-slate-500 hover:text-slate-900 font-medium px-3 py-2 transition-colors disabled:opacity-40"
            >
              Back
            </button>
            <button
              type="button"
              onClick={advanceMobileStep}
              className="bg-slate-900 hover:bg-slate-800 text-white font-medium px-4 py-2 rounded-xl transition-colors"
            >
              {isLastStep ? "Finish" : "Next →"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
