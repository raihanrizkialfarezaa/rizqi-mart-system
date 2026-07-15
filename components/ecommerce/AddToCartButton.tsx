"use client";

import { useCart } from "./CartContext";
import { ShoppingCart, Plus, Minus } from "lucide-react";

type AddToCartButtonProps = {
  product: {
    id: string;
    name: string;
    sku: string;
    price: number;
    imageUrl?: string;
    unitName?: string;
  };
  maxStock?: number;
  className?: string;
};

export default function AddToCartButton({ product, maxStock, className }: AddToCartButtonProps) {
  const { cartItems, addToCart, updateQuantity, removeFromCart } = useCart();

  const cartItem = cartItems.find((item) => item.productId === product.id);

  if (cartItem) {
    const handleDecrement = () => {
      if (cartItem.quantity <= 1) {
        removeFromCart(product.id);
      } else {
        updateQuantity(product.id, cartItem.quantity - 1);
      }
    };

    const handleIncrement = () => {
      if (maxStock !== undefined && cartItem.quantity >= maxStock) {
        return;
      }
      updateQuantity(product.id, cartItem.quantity + 1);
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      let val = parseInt(e.target.value, 10);
      if (isNaN(val) || val < 1) {
        val = 1;
      }
      if (maxStock !== undefined && val > maxStock) {
        val = maxStock;
      }
      updateQuantity(product.id, val);
    };

    return (
      <div className="flex items-center justify-between gap-3 w-full mt-6">
        <button
          onClick={handleDecrement}
          className="flex h-12 w-12 items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 active:scale-95 transition-all shadow-sm"
          aria-label="Kurangi jumlah"
        >
          <Minus className="h-4 w-4" />
        </button>

        <div className="flex-1 h-12 relative flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 shadow-sm">
          <input
            type="number"
            value={cartItem.quantity}
            onChange={handleInputChange}
            min={1}
            max={maxStock}
            className="w-full text-center font-bold text-slate-900 bg-transparent focus:outline-none focus:ring-0 text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          {product.unitName && (
            <span className="absolute right-4 text-xs font-semibold text-slate-400 pointer-events-none">
              {product.unitName}
            </span>
          )}
        </div>

        <button
          onClick={handleIncrement}
          disabled={maxStock !== undefined && cartItem.quantity >= maxStock}
          className={`flex h-12 w-12 items-center justify-center rounded-xl border text-slate-700 active:scale-95 transition-all shadow-sm ${
            maxStock !== undefined && cartItem.quantity >= maxStock
              ? "border-slate-100 bg-slate-50 text-slate-350 cursor-not-allowed"
              : "border-slate-200 bg-white hover:bg-slate-50"
          }`}
          aria-label="Tambah jumlah"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        addToCart(product);
      }}
      className={
        className ||
        "flex w-full items-center justify-center space-x-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-all hover:bg-primary/90 active:scale-95"
      }
    >
      <ShoppingCart className="h-4 w-4" />
      <span>Tambah ke Keranjang</span>
    </button>
  );
}
