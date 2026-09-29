"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { driver, type DriveStep, type Driver } from "driver.js";
import "driver.js/dist/driver.css";
import "@/components/onboarding/onboarding-tour.css";
import { useCartStore } from "@/lib/store/useCartStore";
import {
  advanceTourPhase,
  markTourCompleted,
  readTourState,
  writeTourState,
} from "@/lib/onboarding-tour";

const POPOVER_CLASS = "plastipac-tour-popover";

function waitForSelector(
  selector: string,
  timeoutMs = 4000
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

function productSteps(): DriveStep[] {
  return [
    {
      element: "[data-tour='product-specs']",
      popover: {
        title: "Product specifications",
        description:
          "Confirm gauge, width, and length for your wrap application, then set the quantity you need.",
        side: "left",
        align: "start",
      },
    },
    {
      element: "[data-tour='product-price-tiers']",
      popover: {
        title: "Volume price tiers",
        description:
          "Notice how the unit price decreases as you move up package sizes — Case vs. Half Pallet vs. Full Pallet discount levels.",
        side: "left",
        align: "start",
      },
    },
    {
      element: "[data-tour='product-add-to-cart']",
      popover: {
        title: "Add to cart",
        description:
          "Ready to buy? Tap Add to Cart to save this package, then continue to checkout when you’re set.",
        side: "top",
        align: "center",
      },
    },
  ];
}

function cartSteps(): DriveStep[] {
  return [
    {
      element: "[data-tour='cart-quick-actions']",
      popover: {
        title: "Cart & checkout",
        description:
          "Review quantities, request a commercial quote, or proceed to secure checkout. You can reopen this drawer anytime from the bag icon.",
        side: "left",
        align: "start",
      },
    },
  ];
}

function checkoutSteps(): DriveStep[] {
  return [
    {
      element: "[data-tour='checkout-payment-options']",
      popover: {
        title: "Payment options",
        description:
          "Pay now with a credit card via Stripe, or apply for Net 30 commercial credit for approved B2B accounts.",
        side: "bottom",
        align: "start",
      },
    },
  ];
}

function createDriverInstance(
  steps: DriveStep[],
  onDestroyed: (opts: { skipped: boolean; finished: boolean }) => void
): Driver {
  let finished = false;
  let skipped = false;

  return driver({
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
      if (closeBtn) {
        closeBtn.textContent = "Skip";
      }
    },
    onCloseClick: (_el, _step, opts) => {
      skipped = true;
      opts.driver.destroy();
    },
    onDestroyStarted: (_el, _step, opts) => {
      if (!skipped && opts.driver.isLastStep()) {
        finished = true;
      }
      opts.driver.destroy();
    },
    onDestroyed: () => {
      onDestroyed({ skipped, finished });
    },
  });
}

/**
 * Guided first-purchase tour for product → cart → checkout.
 * State persists in localStorage (+ cookie mirror).
 */
export function OnboardingTour() {
  const pathname = usePathname() || "";
  const isDrawerOpen = useCartStore((s) => s.isDrawerOpen);
  const openDrawer = useCartStore((s) => s.openDrawer);
  const activeDriver = useRef<Driver | null>(null);
  const runningRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    const destroyActive = () => {
      try {
        activeDriver.current?.destroy();
      } catch {
        // ignore
      }
      activeDriver.current = null;
      runningRef.current = false;
    };

    const run = async () => {
      if (cancelled || runningRef.current) return;

      const state = readTourState();
      if (state.completed || state.phase === "done") return;

      const onProduct =
        pathname.startsWith("/products/") && pathname !== "/products";
      const onCheckout = pathname.startsWith("/checkout");
      const onCartRoute = pathname === "/cart";

      // --- PRODUCT PHASE ---
      if (state.phase === "product" && onProduct) {
        const el = await waitForSelector("[data-tour='product-specs']");
        if (cancelled || !el) return;

        runningRef.current = true;
        if (!state.startedAt) {
          writeTourState({
            ...state,
            startedAt: new Date().toISOString(),
          });
        }

        const instance = createDriverInstance(productSteps(), ({ skipped, finished }) => {
          runningRef.current = false;
          activeDriver.current = null;
          if (skipped) {
            markTourCompleted();
            return;
          }
          if (finished) {
            advanceTourPhase("cart");
          }
        });
        activeDriver.current = instance;
        instance.drive();
        return;
      }

      // --- CART PHASE (wait until cart drawer is open, or /cart) ---
      if (state.phase === "cart") {
        if (!isDrawerOpen && !onCartRoute) {
          // Stay idle until the shopper opens the cart after adding items
          return;
        }
        if (!isDrawerOpen && onCartRoute) {
          openDrawer();
        }
        const el = await waitForSelector("[data-tour='cart-quick-actions']", 5000);
        if (cancelled || !el) return;

        runningRef.current = true;
        const instance = createDriverInstance(cartSteps(), ({ skipped, finished }) => {
          runningRef.current = false;
          activeDriver.current = null;
          if (skipped) {
            markTourCompleted();
            return;
          }
          if (finished) {
            advanceTourPhase("checkout");
          }
        });
        activeDriver.current = instance;
        instance.drive();
        return;
      }

      // --- CHECKOUT PHASE ---
      if (state.phase === "checkout" && onCheckout) {
        const el = await waitForSelector(
          "[data-tour='checkout-payment-options']",
          5000
        );
        if (cancelled || !el) return;

        runningRef.current = true;
        const instance = createDriverInstance(
          checkoutSteps(),
          ({ skipped, finished }) => {
            runningRef.current = false;
            activeDriver.current = null;
            if (skipped || finished) {
              markTourCompleted();
            }
          }
        );
        activeDriver.current = instance;
        instance.drive();
      }
    };

    const timer = window.setTimeout(() => {
      void run();
    }, 450);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      destroyActive();
    };
  }, [pathname, isDrawerOpen, openDrawer]);

  return null;
}
