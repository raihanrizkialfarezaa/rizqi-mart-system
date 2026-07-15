"use client";

import { useCart } from "./CartContext";
import { ShoppingCart } from "lucide-react";

type AddToCartButtonProps = {
  product: {
    id: string;
    name: string;
    sku: string;
    price: number;
    imageUrl?: string;
    unitName?: string;
  };
  className?: string;
};

export default function AddToCartButton({ product, className }: AddToCartButtonProps) {
  const { addToCart } = useCart();

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
