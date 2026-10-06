import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { CartItem } from "@/types";
import type { AppliedCoupon } from "@/types/coupon";
import { getCartDiscountAmount } from "@/lib/coupons";

function machinePackageRolls(item: { application?: string; rollsPerBox?: number }): number {
  if (item.application !== "machine") return 0;
  const rolls = Number(item.rollsPerBox) || 0;
  return rolls === 20 || rolls === 40 ? rolls : 0;
}

function machineLineQuantity(
  item: { application?: string; rollsPerBox?: number },
  quantity: number
): number {
  if (machinePackageRolls(item) === 20) return 1;
  return Math.max(1, Math.floor(quantity) || 1);
}

interface CartState {
  items: CartItem[];
  isDrawerOpen: boolean;
  appliedCoupon: AppliedCoupon | null;
  addItem: (item: Omit<CartItem, "id" | "totalPrice">) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  setAppliedCoupon: (coupon: AppliedCoupon | null) => void;
  clearCoupon: () => void;
  getTotalItems: () => number;
  getSubtotal: () => number;
  getDiscountAmount: () => number;
  getDiscountedTotal: () => number;
  getTotalWeight: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isDrawerOpen: false,
      appliedCoupon: null,

      addItem: (itemData) => {
        if ((itemData as { isSoldOut?: boolean }).isSoldOut) return;
        const id = `${itemData.productId}-${itemData.variantId}-${itemData.pricingTier}`;
        const currentItems = get().items;
        const existingIndex = currentItems.findIndex((item) => item.id === id);

        if (existingIndex > -1) {
          const updatedItems = [...currentItems];
          const existingItem = updatedItems[existingIndex];
          const newQty = machineLineQuantity(
            existingItem,
            existingItem.quantity + itemData.quantity
          );
          const packageRolls = machinePackageRolls(existingItem);
          updatedItems[existingIndex] = {
            ...existingItem,
            quantity: newQty,
            totalRolls: packageRolls > 0 ? packageRolls * newQty : existingItem.totalRolls,
            totalPrice: Number((newQty * existingItem.unitPrice).toFixed(2)),
          };
          set({ items: updatedItems, isDrawerOpen: true });
        } else {
          const quantity = machineLineQuantity(itemData, itemData.quantity);
          const packageRolls = machinePackageRolls(itemData);
          const newItem: CartItem = {
            ...itemData,
            quantity,
            totalRolls: packageRolls > 0 ? packageRolls * quantity : itemData.totalRolls,
            id,
            totalPrice: Number((quantity * itemData.unitPrice).toFixed(2)),
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
              const nextQty = machineLineQuantity(item, quantity);
              const packageRolls = machinePackageRolls(item);
              return {
                ...item,
                quantity: nextQty,
                totalRolls: packageRolls > 0 ? packageRolls * nextQty : item.totalRolls,
                totalPrice: Number((nextQty * item.unitPrice).toFixed(2)),
              };
            }
            return item;
          }),
        }));
      },

      clearCart: () => {
        set({ items: [], appliedCoupon: null });
      },

      openDrawer: () => set({ isDrawerOpen: true }),
      closeDrawer: () => set({ isDrawerOpen: false }),
      toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),

      setAppliedCoupon: (coupon) => set({ appliedCoupon: coupon }),
      clearCoupon: () => set({ appliedCoupon: null }),

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

      getDiscountAmount: () => {
        return getCartDiscountAmount(get().items, get().appliedCoupon);
      },

      getDiscountedTotal: () => {
        const subtotal = get().getSubtotal();
        const discount = get().getDiscountAmount();
        return Number(Math.max(0, subtotal - discount).toFixed(2));
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
      storage: createJSONStorage(() => {
        if (typeof window === "undefined") {
          return {
            getItem: () => null,
            setItem: () => {},
            removeItem: () => {},
          };
        }
        return localStorage;
      }),
      partialize: (state) => ({
        items: state.items,
        appliedCoupon: state.appliedCoupon,
      }),
    }
  )
);
