"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShoppingBag, Tag, FileText } from "lucide-react";
import CheckoutForm, { CheckoutFormData } from "@/components/ecommerce/CheckoutForm";
import { useCart } from "@/components/ecommerce/CartContext";

export default function CheckoutPage() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const { cartItems, subtotal, clearCart } = useCart();

  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountAmount: number;
    label: string;
  } | null>(null);
  const [cartNote, setCartNote] = useState("");

  useEffect(() => {
    // Load promo from localStorage
    const savedPromo = localStorage.getItem("rizqi_mart_cart_promo");
    if (savedPromo) {
      try {
        setAppliedPromo(JSON.parse(savedPromo));
      } catch (e) {
        console.error("Failed to parse cart promo", e);
      }
    }

    // Load note from localStorage
    const savedNote = localStorage.getItem("rizqi_mart_cart_note");
    if (savedNote) {
      setCartNote(savedNote);
    }
  }, []);

  const discountAmount = appliedPromo ? appliedPromo.discountAmount : 0;
  const shippingCost = 0; // Free shipping
  const total = Math.max(0, subtotal - discountAmount + shippingCost);

  const handleCheckout = async (formData: CheckoutFormData) => {
    setIsProcessing(true);

    try {
      const res = await fetch("/api/ecommerce/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          items: cartItems,
          customerNote: formData.customerNote || cartNote || undefined,
          discountAmount: discountAmount,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Gagal membuat pesanan");
      }

      const resData = await res.json();

      // Clear local cart and cart metadata
      clearCart();
      localStorage.removeItem("rizqi_mart_cart_note");
      localStorage.removeItem("rizqi_mart_cart_promo");

      // Redirect to orders page with success status
      router.push(`/orders?status=success&orderId=${resData.data.id}`);
    } catch (error: any) {
      console.error("Checkout error:", error);
      alert(error.message || "Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 py-8">
        <div className="container mx-auto px-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <ShoppingBag className="mx-auto h-20 w-20 text-slate-300" />
            <h2 className="mt-4 text-xl font-bold text-slate-900">
              Keranjang Kosong
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Tambahkan produk ke keranjang terlebih dahulu
            </p>
            <Link
              href="/products"
              className="mt-6 inline-block rounded-xl bg-slate-900 px-6 py-3 font-semibold text-white hover:bg-slate-800"
            >
              Belanja Sekarang
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/cart"
            className="inline-flex items-center space-x-2 text-xs font-semibold text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Keranjang Belanja</span>
          </Link>
        </div>

        <h1 className="mb-8 text-2xl font-extrabold text-slate-900">Checkout Pesanan</h1>

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Checkout Form */}
          <div className="lg:col-span-7">
            <CheckoutForm initialNote={cartNote} subtotal={total} onSubmit={handleCheckout} />
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-5">
            <div className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
              <h2 className="text-lg font-bold text-slate-900">Ringkasan Pesanan</h2>

              {/* Items */}
              <div className="space-y-3 border-b border-slate-100 pb-4 max-h-72 overflow-y-auto">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-xs">
                    <div>
                      <div className="font-semibold text-slate-800">{item.name}</div>
                      <div className="text-slate-500">
                        {item.quantity} {item.unitName} × {formatPrice(item.price)}
                      </div>
                    </div>
                    <div className="font-bold text-slate-900">
                      {formatPrice(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Note preview if any */}
              {cartNote && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800 mb-1">
                    <FileText className="h-3.5 w-3.5 text-slate-600" />
                    <span>Catatan Pengiriman:</span>
                  </div>
                  <p className="text-xs text-slate-600 italic">"{cartNote}"</p>
                </div>
              )}

              {/* Totals */}
              <div className="space-y-2.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Subtotal ({cartItems.length} item)</span>
                  <span className="font-semibold text-slate-900">{formatPrice(subtotal)}</span>
                </div>

                {appliedPromo && (
                  <div className="flex justify-between text-xs text-emerald-700">
                    <span className="flex items-center gap-1 font-medium">
                      <Tag className="h-3.5 w-3.5" />
                      Voucher ({appliedPromo.code})
                    </span>
                    <span className="font-bold">-{formatPrice(appliedPromo.discountAmount)}</span>
                  </div>
                )}

                <div className="flex justify-between text-xs">
                  <span className="text-slate-600">Ongkos Kirim</span>
                  <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    GRATIS
                  </span>
                </div>

                <div className="border-t border-slate-200 pt-3">
                  <div className="flex justify-between items-baseline">
                    <span className="font-bold text-slate-900 text-sm">Total Pembayaran</span>
                    <span className="text-xl font-extrabold text-slate-900">
                      {formatPrice(total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Security Notice */}
              <div className="rounded-xl bg-emerald-50/80 border border-emerald-200 p-3.5 text-center">
                <p className="text-xs font-medium text-emerald-900">
                  🔒 Transaksi Anda aman, terenkripsi & tercatat resmi di database.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
