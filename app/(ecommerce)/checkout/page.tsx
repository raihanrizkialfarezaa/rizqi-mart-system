"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ShoppingBag,
  Tag,
  FileText,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ChevronRight,
  X,
  Lock,
  Sparkles,
  Zap,
  Package,
} from "lucide-react";
import CheckoutForm, { CheckoutFormData } from "@/components/ecommerce/CheckoutForm";
import { useCart } from "@/components/ecommerce/CartContext";

const PROMO_CODES: Record<
  string,
  { code: string; type: "fixed" | "percent"; value: number; label: string; minSpend: number }
> = {
  MOJOKERTO50: {
    code: "MOJOKERTO50",
    type: "fixed",
    value: 10000,
    label: "Diskon Rp 10.000 (Min. Belanja Rp 50rb)",
    minSpend: 50000,
  },
  RIZQIMART: {
    code: "RIZQIMART",
    type: "percent",
    value: 5,
    label: "Diskon 5% Spesial Pelanggan Baru",
    minSpend: 0,
  },
  HEMAT5K: {
    code: "HEMAT5K",
    type: "fixed",
    value: 5000,
    label: "Potongan Langsung Rp 5.000",
    minSpend: 25000,
  },
};

export default function CheckoutPage() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);
  const { cartItems, subtotal, clearCart } = useCart();

  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountAmount: number;
    label: string;
  } | null>(null);

  const [promoInput, setPromoInput] = useState("");
  const [promoError, setPromoError] = useState("");
  const [cartNote, setCartNote] = useState("");

  // Mobile drawer state for order summary
  const [isMobileSummaryOpen, setIsMobileSummaryOpen] = useState(false);

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

  // Recalculate discount dynamically if subtotal changes
  useEffect(() => {
    if (appliedPromo) {
      const match = PROMO_CODES[appliedPromo.code];
      if (match) {
        let calc = 0;
        if (match.type === "fixed") {
          calc = match.value;
        } else {
          calc = Math.round((subtotal * match.value) / 100);
        }
        if (subtotal < match.minSpend) {
          setAppliedPromo(null);
          localStorage.removeItem("rizqi_mart_cart_promo");
        } else {
          const newPromo = { ...appliedPromo, discountAmount: calc };
          setAppliedPromo(newPromo);
          localStorage.setItem("rizqi_mart_cart_promo", JSON.stringify(newPromo));
        }
      }
    }
  }, [subtotal]);

  const discountAmount = appliedPromo ? appliedPromo.discountAmount : 0;
  const shippingCost = 0; // Free shipping in Mojokerto
  const total = Math.max(0, subtotal - discountAmount + shippingCost);

  const handleApplyPromo = (e: React.FormEvent) => {
    e.preventDefault();
    setPromoError("");
    const cleanCode = promoInput.trim().toUpperCase();

    if (!cleanCode) {
      setPromoError("Masukkan kode voucher terlebih dahulu");
      return;
    }

    const promoObj = PROMO_CODES[cleanCode];
    if (!promoObj) {
      setPromoError("Kode voucher tidak ditemukan atau telah kedaluwarsa");
      return;
    }

    if (subtotal < promoObj.minSpend) {
      setPromoError(`Minimal belanja Rp ${promoObj.minSpend.toLocaleString("id-ID")} untuk voucher ini`);
      return;
    }

    let calculatedDiscount = 0;
    if (promoObj.type === "fixed") {
      calculatedDiscount = promoObj.value;
    } else {
      calculatedDiscount = Math.round((subtotal * promoObj.value) / 100);
    }

    const payload = {
      code: promoObj.code,
      discountAmount: calculatedDiscount,
      label: promoObj.label,
    };

    setAppliedPromo(payload);
    localStorage.setItem("rizqi_mart_cart_promo", JSON.stringify(payload));
    setPromoInput("");
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    localStorage.removeItem("rizqi_mart_cart_promo");
    setPromoError("");
  };

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
      <div className="min-h-screen bg-slate-50/70 py-12 px-4 flex items-center justify-center">
        <div className="max-w-md w-full rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-lg">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <ShoppingBag className="h-10 w-10" />
          </div>
          <h2 className="mt-5 text-xl font-extrabold text-slate-900">
            Keranjang Belanja Kosong
          </h2>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            Anda belum memilih produk apapun. Silakan kembali ke katalog untuk memilih kebutuhan sembako & grosir Anda.
          </p>
          <Link
            href="/products"
            className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-6 py-3.5 text-xs font-bold text-white shadow-md transition-all hover:bg-slate-800 active:scale-95"
          >
            Mulai Belanja Sekarang
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/70 pb-24 lg:pb-12 pt-6">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Navigation & Header */}
        <div className="mb-6">
          <Link
            href="/cart"
            className="inline-flex items-center space-x-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Keranjang Belanja</span>
          </Link>

          <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                Checkout Pesanan
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Konfirmasi data pengiriman dan metode pembayaran Anda
              </p>
            </div>

            {/* Step progress pills */}
            <div className="hidden sm:flex items-center space-x-2 text-xs font-semibold">
              <span className="rounded-full bg-slate-900 px-3 py-1 text-white">
                1. Checkout
              </span>
              <span className="text-slate-300">→</span>
              <span className="rounded-full bg-slate-200 px-3 py-1 text-slate-600">
                2. Pembayaran
              </span>
              <span className="text-slate-300">→</span>
              <span className="rounded-full bg-slate-200 px-3 py-1 text-slate-600">
                3. Selesai
              </span>
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid gap-8 lg:grid-cols-12">
          {/* Left Column: Form (7 Cols) */}
          <div className="lg:col-span-7">
            <CheckoutForm
              initialNote={cartNote}
              subtotal={total}
              onSubmit={handleCheckout}
            />
          </div>

          {/* Right Column: Order Summary (5 Cols) */}
          <div className="lg:col-span-5">
            <div className="sticky top-24 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-5 transition-all hover:shadow-md">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Package className="h-4 w-4 text-slate-700" />
                  <span>Ringkasan Pesanan</span>
                </h2>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-700">
                  {cartItems.length} Item
                </span>
              </div>

              {/* Items List Breakdown */}
              <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                {cartItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex justify-between items-start text-xs rounded-xl bg-slate-50/60 p-2.5 border border-slate-100"
                  >
                    <div className="pr-3">
                      <div className="font-bold text-slate-900 line-clamp-1">
                        {item.name}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        {item.quantity} {item.unitName} × {formatPrice(item.price)}
                      </div>
                    </div>
                    <div className="font-extrabold text-slate-900 shrink-0">
                      {formatPrice(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Note Preview if set */}
              {cartNote && (
                <div className="rounded-xl border border-slate-200 bg-amber-50/50 p-3">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900 mb-1">
                    <FileText className="h-3.5 w-3.5 text-amber-700" />
                    <span>Catatan Pengiriman:</span>
                  </div>
                  <p className="text-xs text-amber-800 italic">"{cartNote}"</p>
                </div>
              )}

              {/* Voucher Code Form inside Summary */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                  <span className="flex items-center gap-1.5">
                    <Tag className="h-3.5 w-3.5 text-slate-600" />
                    Voucher Diskon
                  </span>
                  {appliedPromo && (
                    <button
                      onClick={handleRemovePromo}
                      className="text-[11px] font-semibold text-rose-600 hover:underline flex items-center gap-0.5"
                    >
                      <X className="h-3 w-3" /> Hapus
                    </button>
                  )}
                </div>

                {appliedPromo ? (
                  <div className="flex items-center justify-between rounded-xl bg-emerald-50 border border-emerald-200 p-2.5 text-xs">
                    <div>
                      <span className="font-extrabold text-emerald-800">
                        {appliedPromo.code}
                      </span>
                      <p className="text-[11px] text-emerald-700">
                        {appliedPromo.label}
                      </p>
                    </div>
                    <span className="font-extrabold text-emerald-700">
                      -{formatPrice(appliedPromo.discountAmount)}
                    </span>
                  </div>
                ) : (
                  <form onSubmit={handleApplyPromo} className="flex gap-2">
                    <input
                      type="text"
                      value={promoInput}
                      onChange={(e) => setPromoInput(e.target.value)}
                      placeholder="Masukkan kode promo"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 uppercase placeholder:normal-case placeholder:text-slate-400 focus:border-slate-800 focus:outline-none"
                    />
                    <button
                      type="submit"
                      className="rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800 shrink-0 transition-colors"
                    >
                      Gunakan
                    </button>
                  </form>
                )}

                {promoError && (
                  <p className="text-[11px] text-rose-600 font-semibold">{promoError}</p>
                )}
              </div>

              {/* Price Calculations */}
              <div className="space-y-2.5 pt-2 border-t border-slate-100 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal ({cartItems.length} item)</span>
                  <span className="font-bold text-slate-900">{formatPrice(subtotal)}</span>
                </div>

                {appliedPromo && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span className="flex items-center gap-1">
                      <Tag className="h-3.5 w-3.5" /> Voucher ({appliedPromo.code})
                    </span>
                    <span className="font-bold">
                      -{formatPrice(appliedPromo.discountAmount)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between items-center text-slate-600">
                  <span>Ongkos Kirim Area Mojokerto</span>
                  <span className="font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 text-[11px]">
                    GRATIS
                  </span>
                </div>

                <div className="border-t border-slate-200 pt-3">
                  <div className="flex justify-between items-baseline">
                    <div>
                      <span className="font-bold text-slate-900 text-sm">
                        Total Pembayaran
                      </span>
                      <p className="text-[10px] text-slate-400">Sudah termasuk PPN</p>
                    </div>
                    <span className="text-xl font-black text-slate-900">
                      {formatPrice(total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Guarantees & Security Notice */}
              <div className="rounded-2xl bg-slate-900 p-4 text-white text-xs space-y-2 shadow-sm">
                <div className="flex items-center gap-2 font-bold text-emerald-400">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Jaminan Transaksi Aman Rizqi Mart</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Data Anda terenkripsi dengan aman. Pesanan otomatis terintegrasi langsung dengan sistem ERP & database toko kami.
                </p>
              </div>

              {/* Primary Action Submit Button (Floating / Fixed in Sticky Summary Card) */}
              <button
                type="submit"
                form="checkout-form"
                disabled={isProcessing}
                className="w-full rounded-2xl bg-slate-900 py-4 text-sm font-bold text-white transition-all hover:bg-slate-800 active:scale-[0.99] disabled:bg-slate-300 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center space-x-2 cursor-pointer"
              >
                {isProcessing ? (
                  <span>Memproses Pesanan...</span>
                ) : (
                  <>
                    <span>Konfirmasi & Buat Pesanan</span>
                    <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-emerald-400 font-extrabold border border-slate-700">
                      {formatPrice(total)}
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action Bar for Mobile Screens */}
      <div className="block lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-2xl p-3.5">
        <div className="container mx-auto flex items-center justify-between gap-3">
          <div>
            <button
              onClick={() => setIsMobileSummaryOpen(!isMobileSummaryOpen)}
              className="flex items-center gap-1 text-[11px] font-bold text-slate-600 hover:text-slate-900"
            >
              <span>{cartItems.length} Item</span>
              {isMobileSummaryOpen ? (
                <ChevronDown className="h-3.5 w-3.5" />
              ) : (
                <ChevronUp className="h-3.5 w-3.5" />
              )}
            </button>
            <div className="text-base font-black text-slate-900">
              {formatPrice(total)}
            </div>
          </div>

          <button
            onClick={() => {
              // Trigger form submit
              const submitBtn = document.querySelector('button[type="submit"]') as HTMLButtonElement;
              if (submitBtn) submitBtn.click();
            }}
            disabled={isProcessing}
            className="flex-1 max-w-[200px] rounded-xl bg-slate-900 py-3 text-xs font-bold text-white hover:bg-slate-800 transition-all text-center shadow-md active:scale-95 disabled:bg-slate-300"
          >
            {isProcessing ? "Memproses..." : "Buat Pesanan"}
          </button>
        </div>

        {/* Mobile Summary Collapsible Sheet */}
        {isMobileSummaryOpen && (
          <div className="mt-3 max-h-56 overflow-y-auto border-t border-slate-100 pt-3 space-y-2 text-xs">
            <div className="font-bold text-slate-800 mb-1">Rincian Barang:</div>
            {cartItems.map((item) => (
              <div key={item.id} className="flex justify-between text-[11px]">
                <span className="text-slate-700 line-clamp-1">{item.name} ({item.quantity}x)</span>
                <span className="font-bold text-slate-900">{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
            {appliedPromo && (
              <div className="flex justify-between text-emerald-700 text-[11px] font-bold">
                <span>Voucher ({appliedPromo.code})</span>
                <span>-{formatPrice(appliedPromo.discountAmount)}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
