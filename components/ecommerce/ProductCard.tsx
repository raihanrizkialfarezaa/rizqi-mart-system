"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, Package, Plus, Minus } from "lucide-react";
import { useCart } from "./CartContext";

type ProductCardProps = {
  id: string;
  name: string;
  sku: string;
  price: number;
  imageUrl?: string;
  categoryName: string;
  isAvailable?: boolean;
  stockCount?: number;
  unitName?: string;
  onAddToCart?: () => void;
};

export default function ProductCard({
  id,
  name,
  sku,
  price,
  imageUrl,
  categoryName,
  isAvailable = true,
  stockCount,
  unitName = "Pcs",
  onAddToCart,
}: ProductCardProps) {
  const { cartItems, addToCart, updateQuantity, removeFromCart } = useCart();

  const formattedPrice = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(price));

  const cartItem = cartItems.find((item) => item.productId === id);

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onAddToCart) {
      onAddToCart();
    } else {
      addToCart({ id, name, sku, price: Number(price), imageUrl, unitName });
    }
  };

  const handleDecrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (cartItem) {
      if (cartItem.quantity <= 1) {
        removeFromCart(id);
      } else {
        updateQuantity(id, cartItem.quantity - 1);
      }
    }
  };

  const handleIncrement = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (cartItem) {
      if (stockCount !== undefined && cartItem.quantity >= stockCount) {
        return; // stock limit
      }
      updateQuantity(id, cartItem.quantity + 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    e.stopPropagation();
    let val = parseInt(e.target.value, 10);
    if (isNaN(val) || val < 1) {
      val = 1;
    }
    if (stockCount !== undefined && val > stockCount) {
      val = stockCount;
    }
    updateQuantity(id, val);
  };

  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md">
      {/* Image container */}
      <Link href={`/products/${id}`} className="relative block aspect-[4/3] overflow-hidden bg-slate-50">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-slate-300">
            <Package className="h-10 w-10 stroke-[1.25]" />
            <span className="text-[11px] font-medium text-slate-400">Belum ada foto</span>
          </div>
        )}

        {!isAvailable && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[2px]">
            <span className="rounded-full border border-slate-300 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600">
              Stok Habis
            </span>
          </div>
        )}
      </Link>

      {/* Content */}
      <div className="flex flex-1 flex-col p-4">
        {/* Category */}
        <div className="mb-1.5 flex items-center justify-between">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {categoryName}
          </span>
          {/* Highlight Stock Badge */}
          {isAvailable && stockCount !== undefined && (
            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700 border border-emerald-100/50">
              Stok: {stockCount}
            </span>
          )}
        </div>

        {/* Name */}
        <Link href={`/products/${id}`} className="flex-1">
          <h3 className="line-clamp-2 text-xs font-semibold leading-snug text-slate-800 transition-colors group-hover:text-slate-900">
            {name}
          </h3>
        </Link>

        {/* SKU */}
        <p className="mt-1 text-[10px] text-slate-400">SKU: {sku}</p>

        {/* Price + Action */}
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-slate-100 pt-3">
          <div className="flex flex-col">
            <span className="text-sm font-extrabold text-slate-900">
              {formattedPrice}
            </span>
            <span className="text-[9px] text-slate-400 font-medium">per {unitName}</span>
          </div>

          {isAvailable ? (
            cartItem ? (
              /* Shopee style inline quantity selector inside ProductCard */
              <div 
                className="flex items-center rounded-lg border border-slate-200 bg-slate-50/50 p-0.5"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
              >
                <button
                  onClick={handleDecrement}
                  className="flex h-7 w-7 items-center justify-center rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 active:scale-90 transition-all"
                  aria-label="Kurang"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <input
                  type="number"
                  value={cartItem.quantity}
                  onChange={handleInputChange}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  className="w-8 text-center text-xs font-bold text-slate-800 bg-transparent border-0 focus:outline-none focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  onClick={handleIncrement}
                  disabled={stockCount !== undefined && cartItem.quantity >= stockCount}
                  className={`flex h-7 w-7 items-center justify-center rounded bg-white border text-slate-650 transition-all ${
                    stockCount !== undefined && cartItem.quantity >= stockCount
                      ? "border-slate-100 text-slate-300 cursor-not-allowed"
                      : "border-slate-200 text-slate-600 hover:bg-slate-100 active:scale-90"
                  }`}
                  aria-label="Tambah"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleAddToCart}
                aria-label={`Tambah ${name} ke keranjang`}
                className="flex flex-shrink-0 items-center gap-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-1.5 text-[11px] font-semibold text-white transition-all hover:bg-slate-700 active:scale-95 shadow-sm"
              >
                <ShoppingCart className="h-3.5 w-3.5" />
                <span>Tambah</span>
              </button>
            )
          ) : (
            <button
              disabled
              className="flex flex-shrink-0 cursor-not-allowed items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-100 px-3 py-1.5 text-[11px] font-semibold text-slate-400"
            >
              <ShoppingCart className="h-3.5 w-3.5" />
              <span>Habis</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
