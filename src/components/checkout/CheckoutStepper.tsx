"use client";

import { Check } from "lucide-react";

export const CHECKOUT_STEPS = [
  { id: 1, label: "Shopping Cart" },
  { id: 2, label: "Shipping Address" },
  { id: 3, label: "Shipping Method" },
  { id: 4, label: "Payment" },
] as const;

export type CheckoutStepId = (typeof CHECKOUT_STEPS)[number]["id"];

interface CheckoutStepperProps {
  currentStep: CheckoutStepId;
  furthestStep: CheckoutStepId;
  onStepChange: (step: CheckoutStepId) => void;
}

export function CheckoutStepper({
  currentStep,
  furthestStep,
  onStepChange,
}: CheckoutStepperProps) {
  return (
    <nav aria-label="Checkout progress" className="w-full">
      <ol className="grid grid-cols-4 gap-2 sm:gap-4">
        {CHECKOUT_STEPS.map((step, index) => {
          const isComplete = step.id < currentStep;
          const isCurrent = step.id === currentStep;
          const isUpcoming = step.id > furthestStep;
          const canSelect = step.id <= furthestStep;

          return (
            <li key={step.id} className="min-w-0">
              <button
                type="button"
                disabled={!canSelect}
                onClick={() => canSelect && onStepChange(step.id)}
                aria-current={isCurrent ? "step" : undefined}
                className={`group flex w-full flex-col items-center gap-2 text-center ${
                  canSelect ? "cursor-pointer" : "cursor-not-allowed"
                }`}
              >
                <span className="relative flex w-full items-center justify-center">
                  {index > 0 && (
                    <span
                      aria-hidden
                      className={`absolute right-1/2 left-0 top-1/2 h-0.5 -translate-y-1/2 ${
                        step.id <= currentStep ? "bg-sky-600" : "bg-slate-200"
                      }`}
                    />
                  )}
                  {index < CHECKOUT_STEPS.length - 1 && (
                    <span
                      aria-hidden
                      className={`absolute left-1/2 right-0 top-1/2 h-0.5 -translate-y-1/2 ${
                        step.id < currentStep ? "bg-sky-600" : "bg-slate-200"
                      }`}
                    />
                  )}
                  <span
                    className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border text-xs font-black transition-colors ${
                      isComplete
                        ? "border-sky-600 bg-sky-600 text-white"
                        : isCurrent
                          ? "border-sky-600 bg-white text-sky-700 ring-4 ring-sky-100"
                          : "border-slate-200 bg-white text-slate-400"
                    }`}
                  >
                    {isComplete ? (
                      <Check className="h-4 w-4" aria-hidden />
                    ) : (
                      step.id
                    )}
                  </span>
                </span>
                <span
                  className={`text-[10px] font-bold leading-tight sm:text-xs ${
                    isCurrent
                      ? "text-sky-800"
                      : isUpcoming
                        ? "text-slate-400"
                        : "text-slate-700"
                  }`}
                >
                  {step.label}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
