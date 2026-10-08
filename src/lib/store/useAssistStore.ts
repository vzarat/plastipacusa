import { create } from "zustand";

interface AssistState {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const useAssistStore = create<AssistState>((set) => ({
  open: false,
  setOpen: (open) => set({ open }),
}));
