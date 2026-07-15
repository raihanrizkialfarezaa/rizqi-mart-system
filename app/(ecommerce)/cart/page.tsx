"use client";

import Link from "next/link";
import Image from "next/image";
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from "lucide-react";
import { useCart } from "@/components/ecommerce/CartContext";

export default function CartPage() {
  const { cartItems, updateQuantity, removeFromCart, subtotal } = useCart();

  const removeItem = (itemId: string) => {
    removeFromCart(itemId);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="mb-8 text-3xl font-bold">Keranjang Belanja</h1>

        {cartItems.length > 0 ? (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-lg bg-white p-6 shadow-sm"
                >
                  <div className="flex gap-4">
                    {/* Product Image */}
                    <div className="h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100">
                      {item.imageUrl ? (
                        <Image
                          src={item.imageUrl}
                          alt={item.name}
                          width={96}
                          height={96}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <ShoppingBag className="h-8 w-8 text-gray-400" />
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="flex flex-1 flex-col">
                      <div className="flex justify-between">
                        <div>
                          <Link
                            href={`/products/${item.productId}`}
                            className="font-medium hover:text-primary"
                          >
                            {item.name}
                          </Link>
                          <p className="mt-1 text-sm text-gray-500">
                            SKU: {item.sku}
                          </p>
                        </div>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="text-red-500 hover:text-red-700"
                          title="Hapus"
                        >
                          <Trash2 className="h-5 w-5" />
                        </button>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        {/* Quantity Controls */}
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() =>
                              updateQuantity(item.id, item.quantity - 1)
                            }
                            className="rounded-lg border border-gray-300 p-1 hover:bg-gray-100"
                            disabled={item.quantity <= 1}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                          <span className="w-12 text-center font-medium">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() =>
                              updateQuantity(item.id, item.quantity + 1)
                            }
                            className="rounded-lg border border-gray-300 p-1 hover:bg-gray-100"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                          <span className="text-sm text-gray-600">
                            {item.unitName}
                          </span>
                        </div>

                        {/* Price */}
                        <div className="text-right">
                          <div className="font-bold text-primary">
                            {formatPrice(item.price * item.quantity)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {formatPrice(item.price)} / {item.unitName}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 rounded-lg bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold">Ringkasan Pesanan</h2>

                <div className="space-y-3 border-t border-gray-200 pt-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">
                      Subtotal ({cartItems.length} produk)
                    </span>
                    <span className="font-medium">{formatPrice(subtotal)}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Ongkos Kirim</span>
                    <span className="font-medium text-green-600">GRATIS</span>
                  </div>

                  <div className="border-t border-gray-200 pt-3">
                    <div className="flex justify-between">
                      <span className="font-semibold">Total</span>
                      <span className="text-xl font-bold text-primary">
                        {formatPrice(subtotal)}
                      </span>
                    </div>
                  </div>
                </div>

                <Link
                  href="/checkout"
                  className="mt-6 flex w-full items-center justify-center space-x-2 rounded-lg bg-primary px-6 py-3 font-medium text-white transition-colors hover:bg-primary/90"
                >
                  <span>Lanjut ke Pembayaran</span>
                  <ArrowRight className="h-5 w-5" />
                </Link>

                <Link
                  href="/products"
                  className="mt-3 block text-center text-sm text-primary hover:underline"
                >
                  Lanjut Belanja
                </Link>

                {/* Info */}
                <div className="mt-6 rounded-lg bg-blue-50 p-4">
                  <p className="text-sm text-blue-900">
                    ✓ Gratis ongkir area Mojokerto
                    <br />✓ Pembayaran aman & terpercaya
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Empty Cart State
          <div className="rounded-lg bg-white p-12 text-center shadow-sm">
            <ShoppingBag className="mx-auto h-24 w-24 text-gray-400" />
            <h2 className="mt-4 text-xl font-semibold text-gray-900">
              Keranjang Belanja Kosong
            </h2>
            <p className="mt-2 text-gray-600">
              Belum ada produk di keranjang Anda
            </p>
            <Link
              href="/products"
              className="mt-6 inline-block rounded-lg bg-primary px-6 py-3 font-medium text-white hover:bg-primary/90"
            >
              Mulai Belanja
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
