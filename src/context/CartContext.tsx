import React, { createContext, useContext, useState, ReactNode } from "react";
import { CartItem, Product, RentalPlan, CheckoutBreakdown, GST_RATE, PROTECTION_PLAN_MONTHLY } from "@/types/product";

interface CartContextType {
  items: CartItem[];
  addToCart: (product: Product, plan: RentalPlan) => void;
  removeFromCart: (productId: string) => void;
  updateProtectionPlan: (productId: string, add: boolean) => void;
  clearCart: () => void;
  getBreakdown: () => CheckoutBreakdown;
  itemCount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  const addToCart = (product: Product, plan: RentalPlan) => {
    setItems(prev => {
      const existingIndex = prev.findIndex(item => item.product.id === product.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], selectedPlan: plan };
        return updated;
      }
      return [...prev, { product, selectedPlan: plan, quantity: 1, addProtectionPlan: false }];
    });
  };

  const removeFromCart = (productId: string) => {
    setItems(prev => prev.filter(item => item.product.id !== productId));
  };

  const updateProtectionPlan = (productId: string, add: boolean) => {
    setItems(prev => prev.map(item => 
      item.product.id === productId 
        ? { ...item, addProtectionPlan: add }
        : item
    ));
  };

  const clearCart = () => setItems([]);

  const getBreakdown = (): CheckoutBreakdown => {
    const securityDeposit = items.reduce((sum, item) => sum + item.selectedPlan.securityDeposit, 0);
    const deliveryFee = items.reduce((sum, item) => sum + item.product.deliveryFee, 0);
    const installationFee = items.reduce((sum, item) => sum + item.product.installationFee, 0);
    const monthlyRent = items.reduce((sum, item) => sum + item.selectedPlan.monthlyRent, 0);
    const protectionPlan = items.reduce((sum, item) => item.addProtectionPlan ? sum + PROTECTION_PLAN_MONTHLY : sum, 0);
    
    const gst = Math.round((monthlyRent + protectionPlan) * GST_RATE);
    const payableNow = securityDeposit + deliveryFee + installationFee;
    const monthlyTotal = monthlyRent + gst + protectionPlan;

    return {
      securityDeposit,
      deliveryFee,
      installationFee,
      payableNow,
      monthlyRent,
      gst,
      protectionPlan,
      monthlyTotal
    };
  };

  return (
    <CartContext.Provider value={{
      items,
      addToCart,
      removeFromCart,
      updateProtectionPlan,
      clearCart,
      getBreakdown,
      itemCount: items.length
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
