import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CartItem } from "@/types";

interface CartState {
  items: CartItem[];
  isDrawerOpen: boolean;
  addItem: (item: Omit<CartItem, "id" | "totalPrice">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  getTotalItems: () => number;
  getSubtotal: () => number;
  getTotalWeight: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isDrawerOpen: false,

      addItem: (itemData) => {
        const id = `${itemData.productId}-${itemData.variantId}-${itemData.pricingTier}`;
        const currentItems = get().items;
        const existingIndex = currentItems.findIndex((item) => item.id === id);

        if (existingIndex > -1) {
          const updatedItems = [...currentItems];
          const existingItem = updatedItems[existingIndex];
          const newQty = existingItem.quantity + itemData.quantity;
          updatedItems[existingIndex] = {
            ...existingItem,
            quantity: newQty,
            totalPrice: Number((newQty * existingItem.unitPrice).toFixed(2)),
          };
          set({ items: updatedItems, isDrawerOpen: true });
        } else {
          const newItem: CartItem = {
            ...itemData,
            id,
            totalPrice: Number((itemData.quantity * itemData.unitPrice).toFixed(2)),
          };
          set({ items: [...currentItems, newItem], isDrawerOpen: true });
        }
      },

      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));
      },

      updateQuantity: (id, quantity) => {
        if (quantity <= 0) {
          get().removeItem(id);
          return;
        }

        set((state) => ({
          items: state.items.map((item) => {
            if (item.id === id) {
              return {
                ...item,
                quantity,
                totalPrice: Number((quantity * item.unitPrice).toFixed(2)),
              };
            }
            return item;
          }),
        }));
      },

      clearCart: () => {
        set({ items: [] });
      },

      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
      toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),

      getTotalItems: () => {
        return get().items.reduce((total, item) => total + item.quantity, 0);
      },

      getSubtotal: () => {
        return Number(
          get()
            .items.reduce((total, item) => total + item.totalPrice, 0)
            .toFixed(2)
        );
      },

      getTotalWeight: () => {
        return Number(
          get()
            .items.reduce((total, item) => {
              const weightPerUnit = parseFloat(item.weightLbs) || 0;
              return total + weightPerUnit * item.quantity;
            }, 0)
            .toFixed(1)
        );
      },
    }),
    {
      name: "plastipac-cart-storage",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ items: state.items }),
    }
  )
);
