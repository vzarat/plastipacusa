"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { SavedShippingAddress } from "@/lib/saved-shipping-address";
import type { DeliveryMethodId } from "@/lib/shipping-method";
import type { ShippingOption } from "@/lib/shipping/types";

interface CheckoutStateValue {
  selectedAddress: SavedShippingAddress | null;
  setSelectedAddress: Dispatch<SetStateAction<SavedShippingAddress | null>>;
  deliveryMethod: DeliveryMethodId;
  setDeliveryMethod: Dispatch<SetStateAction<DeliveryMethodId>>;
  selectedShippingOption: ShippingOption | null;
  setSelectedShippingOption: Dispatch<SetStateAction<ShippingOption | null>>;
  shipmentWeightLbs: number | null;
  setShipmentWeightLbs: Dispatch<SetStateAction<number | null>>;
  shipmentDimensions: string[];
  setShipmentDimensions: Dispatch<SetStateAction<string[]>>;
  shipmentWeightDetail: string[];
  setShipmentWeightDetail: Dispatch<SetStateAction<string[]>>;
  taxExemptRequested: boolean;
  setTaxExemptRequested: Dispatch<SetStateAction<boolean>>;
}

const CheckoutStateContext = createContext<CheckoutStateValue | null>(null);

export function CheckoutStateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [selectedAddress, setSelectedAddress] =
    useState<SavedShippingAddress | null>(null);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethodId>("ground");
  const [selectedShippingOption, setSelectedShippingOption] =
    useState<ShippingOption | null>(null);
  const [shipmentWeightLbs, setShipmentWeightLbs] = useState<number | null>(null);
  const [shipmentDimensions, setShipmentDimensions] = useState<string[]>([]);
  const [shipmentWeightDetail, setShipmentWeightDetail] = useState<string[]>([]);
  const [taxExemptRequested, setTaxExemptRequested] = useState(false);

  const value = useMemo(
    () => ({
      selectedAddress,
      setSelectedAddress,
      deliveryMethod,
      setDeliveryMethod,
      selectedShippingOption,
      setSelectedShippingOption,
      shipmentWeightLbs,
      setShipmentWeightLbs,
      shipmentDimensions,
      setShipmentDimensions,
      shipmentWeightDetail,
      setShipmentWeightDetail,
      taxExemptRequested,
      setTaxExemptRequested,
    }),
    [
      selectedAddress,
      deliveryMethod,
      selectedShippingOption,
      shipmentWeightLbs,
      shipmentDimensions,
      shipmentWeightDetail,
      taxExemptRequested,
    ]
  );

  return (
    <CheckoutStateContext.Provider value={value}>
      {children}
    </CheckoutStateContext.Provider>
  );
}

export function useCheckoutState() {
  const context = useContext(CheckoutStateContext);
  if (!context) {
    throw new Error("useCheckoutState must be used within CheckoutStateProvider");
  }
  return context;
}
