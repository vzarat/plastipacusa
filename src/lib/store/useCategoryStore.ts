import { create } from "zustand";

export type CategorySlug =
  | "force-standard"
  | "force-elite"
  | "genesis-standard"
  | "genesis-high-performance";

interface CategoryState {
  selectedCategory: CategorySlug | null;
  setSelectedCategory: (category: CategorySlug | null) => void;
}

export const useCategoryStore = create<CategoryState>((set) => ({
  selectedCategory: null,
  setSelectedCategory: (category) => set({ selectedCategory: category }),
}));
