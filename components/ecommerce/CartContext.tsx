"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { Check } from "lucide-react";

export type CartItem = {
  id: string;
  productId: string;
  name: string;
  sku: string;
  price: number;
  quantity: number;
  imageUrl?: string;
  unitName: string;
};

type CartContextType = {
  cartItems: CartItem[];
  addToCart: (
    product: {
      id: string;
      name: string;
      sku: string;
      price: number;
      imageUrl?: string;
      unitName?: string;
    },
    quantity?: number
  ) => void;
  removeFromCart: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  subtotal: number;
  showToast: (message: string) => void;
};

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({
    message: "",
    visible: false,
  });

  // Load cart from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("rizqi_mart_cart");
    if (stored) {
      try {
        setCartItems(JSON.parse(stored));
      } catch (e) {
        console.error("Failed to parse cart items", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save cart to localStorage
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("rizqi_mart_cart", JSON.stringify(cartItems));
    }
  }, [cartItems, isLoaded]);

  const showToast = (message: string) => {
    setToast({ message, visible: true });
    const timer = setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 3000);
    return () => clearTimeout(timer);
  };

  const addToCart = (
    product: {
      id: string;
      name: string;
      sku: string;
      price: number;
      imageUrl?: string;
      unitName?: string;
    },
    quantity: number = 1
  ) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [
        ...prev,
        {
          id: product.id,
          productId: product.id,
          name: product.name,
          sku: product.sku,
          price: product.price,
          quantity: quantity,
          imageUrl: product.imageUrl,
          unitName: product.unitName || "Pcs",
        },
      ];
    });
    showToast(`${product.name} ditambahkan ke keranjang`);
  };

  const removeFromCart = (productId: string) => {
    const item = cartItems.find((i) => i.productId === productId);
    setCartItems((prev) => prev.filter((item) => item.productId !== productId));
    if (item) {
      showToast(`${item.name} dihapus dari keranjang`);
    }
  };

  const updateQuantity = (productId: string, quantity: number) => {
    if (quantity < 1) return;
    setCartItems((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity } : item
      )
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        subtotal,
        showToast,
      }}
    >
      {children}

      {/* Floating Toast Notification */}
      {toast.visible && (
        <div className="fixed bottom-5 right-5 z-[9999] flex max-w-sm items-center gap-3 rounded-xl border border-green-200 bg-white/95 p-4 shadow-xl backdrop-blur-md transition-all duration-300 animate-in slide-in-from-bottom-5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-500 text-white shadow-md">
            <Check className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900 text-sm">Berhasil</h4>
            <p className="text-xs text-gray-600 line-clamp-2">{toast.message}</p>
          </div>
        </div>
      )}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
}
