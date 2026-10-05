export const TOUR_STORAGE_KEY = "plastipac_onboarding_tour_v1";

export type TourPhase =
  | "home"
  | "product"
  | "auth"
  | "cart"
  | "checkout"
  | "dashboard"
  | "done";

export interface TourState {
  /** Tour was explicitly started (banner / ?tour=true) */
  active: boolean;
  /** User dismissed or finished the full tour */
  completed: boolean;
  /** Current phase awaiting display */
  phase: TourPhase;
  /** 1-based step index for query-param sync */
  step: number;
  startedAt?: string;
}

export const PHASE_TO_STEP: Record<Exclude<TourPhase, "done">, number> = {
  home: 1,
  product: 2,
  auth: 3,
  cart: 4,
  checkout: 5,
  dashboard: 6,
};

export const STEP_TO_PHASE: Record<number, TourPhase> = {
  1: "home",
  2: "product",
  3: "auth",
  4: "cart",
  5: "checkout",
  6: "dashboard",
};

export const DEFAULT_TOUR_STATE: TourState = {
  active: false,
  completed: false,
  phase: "home",
  step: 1,
};

function isPhase(value: unknown): value is TourPhase {
  return (
    value === "home" ||
    value === "product" ||
    value === "auth" ||
    value === "cart" ||
    value === "checkout" ||
    value === "dashboard" ||
    value === "done"
  );
}

export function readTourState(): TourState {
  if (typeof window === "undefined") return { ...DEFAULT_TOUR_STATE };
  try {
    const raw = window.localStorage.getItem(TOUR_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_TOUR_STATE };
    const parsed = JSON.parse(raw) as Partial<TourState>;
    const phase = isPhase(parsed.phase) ? parsed.phase : "home";
    const step =
      typeof parsed.step === "number" && parsed.step >= 1 && parsed.step <= 6
        ? parsed.step
        : phase === "done"
          ? 6
          : PHASE_TO_STEP[phase as Exclude<TourPhase, "done">] || 1;
    return {
      active: Boolean(parsed.active),
      completed: Boolean(parsed.completed),
      phase,
      step,
      startedAt: parsed.startedAt,
    };
  } catch {
    return { ...DEFAULT_TOUR_STATE };
  }
}

export function writeTourState(next: TourState) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(TOUR_STORAGE_KEY, JSON.stringify(next));
    document.cookie = `${TOUR_STORAGE_KEY}=${encodeURIComponent(
      next.completed ? "done" : `${next.active ? "1" : "0"}:${next.phase}:${next.step}`
    )}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  } catch {
    // ignore
  }
}

export function syncTourQueryParams(state: TourState) {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    if (state.active && !state.completed && state.phase !== "done") {
      url.searchParams.set("tour", "true");
      url.searchParams.set("step", String(state.step));
    } else {
      url.searchParams.delete("tour");
      url.searchParams.delete("step");
    }
    window.history.replaceState({}, "", url.toString());
  } catch {
    // ignore
  }
}

/** Hydrate from ?tour=true&step=N if present */
export function hydrateTourFromQuery(): TourState {
  const stored = readTourState();
  if (typeof window === "undefined") return stored;

  try {
    const url = new URL(window.location.href);
    const tourFlag = url.searchParams.get("tour");
    const stepRaw = url.searchParams.get("step");
    if (tourFlag !== "true" && tourFlag !== "1") return stored;

    const step = Math.min(6, Math.max(1, Number(stepRaw) || stored.step || 1));
    const phase = STEP_TO_PHASE[step] || "home";
    const next: TourState = {
      active: true,
      completed: false,
      phase,
      step,
      startedAt: stored.startedAt || new Date().toISOString(),
    };
    writeTourState(next);
    return next;
  } catch {
    return stored;
  }
}

export function markTourCompleted() {
  const next: TourState = {
    active: false,
    completed: true,
    phase: "done",
    step: 6,
    startedAt: readTourState().startedAt || new Date().toISOString(),
  };
  writeTourState(next);
  syncTourQueryParams(next);
}

export function advanceTourPhase(phase: TourPhase) {
  const prev = readTourState();
  if (prev.completed && phase !== "home") return;

  const step =
    phase === "done" ? 6 : PHASE_TO_STEP[phase as Exclude<TourPhase, "done">] || prev.step;

  const next: TourState = {
    active: phase !== "done",
    completed: phase === "done",
    phase,
    step,
    startedAt: prev.startedAt || new Date().toISOString(),
  };
  writeTourState(next);
  syncTourQueryParams(next);

  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("plastipac:tour-phase", { detail: next })
    );
  }
}

/** Called by the homepage banner CTA */
export function startGuidedTour() {
  const next: TourState = {
    active: true,
    completed: false,
    phase: "home",
    step: 1,
    startedAt: new Date().toISOString(),
  };
  writeTourState(next);
  syncTourQueryParams(next);

  if (typeof window !== "undefined") {
    const catalog = document.getElementById("product-catalog-section");
    const hero = document.querySelector("[data-tour='tour-hero']");
    if (window.matchMedia("(max-width: 767px)").matches && hero) {
      hero.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      catalog?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    window.dispatchEvent(new CustomEvent("plastipac:start-tour", { detail: next }));
  }
}

export function resetTourState() {
  writeTourState({ ...DEFAULT_TOUR_STATE });
  syncTourQueryParams({ ...DEFAULT_TOUR_STATE });
}
