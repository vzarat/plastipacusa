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
  const [eventKick, setEventKick] = useState(0);

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
    const bump = () => setEventKick((k) => k + 1);
    window.addEventListener("plastipac:start-tour", bump);
    window.addEventListener("plastipac:tour-phase", bump);
    return () => {
      window.removeEventListener("plastipac:start-tour", bump);
      window.removeEventListener("plastipac:tour-phase", bump);
    };
  }, []);

  return null;
}
