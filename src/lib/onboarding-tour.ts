export const TOUR_STORAGE_KEY = "plastipac_onboarding_tour_v1";

export type TourPhase = "product" | "cart" | "checkout" | "done";

export interface TourState {
  /** User dismissed or finished the full tour */
  completed: boolean;
  /** Current phase awaiting display */
  phase: TourPhase;
  /** ISO timestamp when tour was first started */
  startedAt?: string;
}

export const DEFAULT_TOUR_STATE: TourState = {
  completed: false,
  phase: "product",
};

export function readTourState(): TourState {
  if (typeof window === "undefined") return { ...DEFAULT_TOUR_STATE };
  try {
    const raw = window.localStorage.getItem(TOUR_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_TOUR_STATE };
    const parsed = JSON.parse(raw) as Partial<TourState>;
    return {
      completed: Boolean(parsed.completed),
      phase:
        parsed.phase === "cart" ||
        parsed.phase === "checkout" ||
        parsed.phase === "done" ||
        parsed.phase === "product"
          ? parsed.phase
          : "product",
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
    // Mirror to cookie so SSR/middleware could read later if needed
    document.cookie = `${TOUR_STORAGE_KEY}=${encodeURIComponent(
      next.completed ? "done" : next.phase
    )}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  } catch {
    // ignore storage failures
  }
}

export function markTourCompleted() {
  writeTourState({
    completed: true,
    phase: "done",
    startedAt: readTourState().startedAt || new Date().toISOString(),
  });
}

export function advanceTourPhase(phase: TourPhase) {
  const prev = readTourState();
  if (prev.completed) return;
  writeTourState({
    completed: phase === "done",
    phase,
    startedAt: prev.startedAt || new Date().toISOString(),
  });
}

/** Soft reset helper for QA / “Replay tour” buttons */
export function resetTourState() {
  writeTourState({ ...DEFAULT_TOUR_STATE });
}
