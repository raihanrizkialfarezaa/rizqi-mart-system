"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  ArrowLeft,
  Truck,
  ShieldCheck,
  Zap,
  Tag,
  ChevronRight,
  FileText,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  RefreshCw,
  Gift,
} from "lucide-react";
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

const CATEGORIES_QUICK = [
  "Beras & Gula",
  "Minyak Goreng",
  "Susu & Olahan",
  "Tepung",
  "Bumbu Dapur",
];

export default function CartPage() {
  const { cartItems, updateQuantity, removeFromCart, clearCart, subtotal, showToast } = useCart();

  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState<{
    code: string;
    discountAmount: number;
    label: string;
  } | null>(null);
  const [promoError, setPromoError] = useState("");

  const [orderNote, setOrderNote] = useState("");
  const [showNoteInput, setShowNoteInput] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);

  // Load saved note from localStorage
  useEffect(() => {
    const savedNote = localStorage.getItem("rizqi_mart_cart_note");
    if (savedNote) {
      setOrderNote(savedNote);
      setShowNoteInput(true);
    }
  }, []);

  // Save note to localStorage
  const handleNoteChange = (val: string) => {
    setOrderNote(val);
    localStorage.setItem("rizqi_mart_cart_note", val);
  };

  const FREE_SHIPPING_THRESHOLD = 50000;
  const freeShippingProgress = Math.min(
    100,
    Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100)
  );
  const freeShippingRemaining = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);

  // Calculate discount
  let discountAmount = 0;
  if (appliedPromo) {
    discountAmount = appliedPromo.discountAmount;
  }

  const grandTotal = Math.max(0, subtotal - discountAmount);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const handleApplyPromo = (codeToApply?: string) => {
    const code = (codeToApply || promoInput).trim().toUpperCase();
    setPromoError("");

    if (!code) {
      setPromoError("Masukkan kode voucher terlebih dahulu");
      return;
    }

    const promo = PROMO_CODES[code];
    if (!promo) {
      setPromoError("Kode voucher tidak valid atau sudah kadaluarsa");
      return;
    }

    if (subtotal < promo.minSpend) {
      setPromoError(
        `Minimal belanja ${formatPrice(promo.minSpend)} untuk menggunakan voucher ini`
      );
      return;
    }

    let calculatedDiscount = 0;
    if (promo.type === "fixed") {
      calculatedDiscount = promo.value;
    } else {
      calculatedDiscount = Math.round((subtotal * promo.value) / 100);
    }

    setAppliedPromo({
      code: promo.code,
      discountAmount: calculatedDiscount,
      label: promo.label,
    });
    setPromoInput("");
    if (showToast) {
      showToast(`Voucher ${promo.code} berhasil dipasang! Diskon ${formatPrice(calculatedDiscount)}`);
    }
  };

  const handleRemovePromo = () => {
    setAppliedPromo(null);
    setPromoError("");
    if (showToast) {
      showToast("Voucher dilepas");
    }
  };

  const handleClearAll = () => {
    clearCart();
    setShowClearModal(false);
    setAppliedPromo(null);
    if (showToast) {
      showToast("Keranjang belanja telah dikosongkan");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 pb-16 pt-6">
      <div className="page-container max-w-7xl">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs text-slate-500">
          <Link href="/" className="hover:text-slate-900 transition-colors">
            Beranda
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
          <span className="font-semibold text-slate-900">Keranjang Belanja</span>
        </nav>

        {/* Stepper Progress Bar */}
        <div className="mb-8 rounded-2xl border border-slate-200/80 bg-white p-4 md:p-5 shadow-sm">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {/* Step 1 */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white shadow-md ring-4 ring-slate-100">
                1
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-bold text-slate-900">Keranjang</p>
                <p className="text-[10px] text-slate-400">Pilih & Atur Jumlah</p>
              </div>
            </div>

            <div className="h-[2px] flex-1 bg-slate-200 mx-3 sm:mx-6" />

            {/* Step 2 */}
            <div className="flex items-center gap-2.5 opacity-60">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-500">
                2
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-medium text-slate-600">Checkout</p>
                <p className="text-[10px] text-slate-400">Alamat & Pengiriman</p>
              </div>
            </div>

            <div className="h-[2px] flex-1 bg-slate-200 mx-3 sm:mx-6" />

            {/* Step 3 */}
            <div className="flex items-center gap-2.5 opacity-60">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-300 bg-slate-50 text-xs font-semibold text-slate-500">
                3
              </div>
              <div className="hidden sm:block">
                <p className="text-xs font-medium text-slate-600">Pembayaran</p>
                <p className="text-[10px] text-slate-400">Konfirmasi & Selesai</p>
              </div>
            </div>
          </div>
        </div>

        {cartItems.length > 0 ? (
          <div className="grid gap-8 lg:grid-cols-12">
            {/* Left Column: Cart Items & Actions (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              {/* Header Box with Clear Cart Option */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm">
                    <ShoppingBag className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-lg font-extrabold text-slate-900">
                      Keranjang Belanja
                    </h1>
                    <p className="text-xs text-slate-500">
                      Tersimpan <span className="font-semibold text-slate-800">{cartItems.length} jenis produk</span> di keranjang
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowClearModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition-all hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 active:scale-95"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Kosongkan Keranjang</span>
                </button>
              </div>

              {/* Free Shipping Tracker */}
              <div className="overflow-hidden rounded-2xl border border-emerald-200/80 bg-gradient-to-r from-emerald-50/60 via-white to-emerald-50/40 p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-sm">
                      <Truck className="h-4 w-4" />
                    </div>
                    <span className="text-xs font-bold text-emerald-950">
                      {subtotal >= FREE_SHIPPING_THRESHOLD
                        ? "🎉 Selamat! Anda Mendapatkan Gratis Ongkir"
                        : `Tambah ${formatPrice(freeShippingRemaining)} lagi untuk Gratis Ongkir`}
                    </span>
                  </div>
                  <span className="text-xs font-extrabold text-emerald-800 font-mono">
                    {freeShippingProgress}%
                  </span>
                </div>

                {/* Bar */}
                <div className="h-2 w-full overflow-hidden rounded-full bg-emerald-100/80">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-full transition-all duration-500"
                    style={{ width: `${freeShippingProgress}%` }}
                  />
                </div>

                <p className="mt-2 text-[11px] text-emerald-700/80">
                  *Khusus pengiriman seluruh wilayah Kota & Kabupaten Mojokerto dengan min. belanja {formatPrice(FREE_SHIPPING_THRESHOLD)}.
                </p>
              </div>

              {/* Cart Items List */}
              <div className="space-y-4">
                {cartItems.map((item) => {
                  const itemTotal = item.price * item.quantity;
                  const itemCode = item.sku.split("-")[1] || "PRD";

                  return (
                    <div
                      key={item.id}
                      className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm transition-all duration-200 hover:border-slate-300 hover:shadow-md"
                    >
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        {/* Thumbnail Image */}
                        <Link
                          href={`/products/${item.productId}`}
                          className="relative h-20 w-20 sm:h-24 sm:w-24 flex-shrink-0 overflow-hidden rounded-xl bg-slate-100 border border-slate-200 group-hover:border-slate-300 transition-colors"
                        >
                          {item.imageUrl ? (
                            <Image
                              src={item.imageUrl}
                              alt={item.name}
                              fill
                              sizes="96px"
                              className="object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full w-full flex-col items-center justify-center bg-slate-50 text-slate-400 gap-1">
                              <div className="rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[9px] font-bold text-slate-600">
                                {itemCode}
                              </div>
                              <ShoppingBag className="h-6 w-6 stroke-[1.5]" />
                            </div>
                          )}
                        </Link>

                        {/* Product Info */}
                        <div className="flex flex-1 flex-col justify-between self-stretch w-full">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <Link
                                href={`/products/${item.productId}`}
                                className="font-bold text-slate-900 text-sm sm:text-base leading-snug hover:text-slate-700 transition-colors line-clamp-2"
                              >
                                {item.name}
                              </Link>
                              <div className="mt-1 flex items-center gap-2">
                                <span className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-mono font-medium text-slate-600">
                                  SKU: {item.sku}
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  {formatPrice(item.price)} / {item.unitName}
                                </span>
                              </div>
                            </div>

                            {/* Delete Button */}
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                              title="Hapus produk ini"
                              aria-label={`Hapus ${item.name}`}
                            >
                              <Trash2 className="h-4.5 w-4.5" />
                            </button>
                          </div>

                          {/* Controls & Subtotal */}
                          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                            {/* Quantity Controls */}
                            <div className="flex items-center gap-2">
                              <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 p-1 shadow-inner">
                                <button
                                  onClick={() =>
                                    updateQuantity(item.id, item.quantity - 1)
                                  }
                                  disabled={item.quantity <= 1}
                                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700 shadow-sm transition-all hover:bg-slate-100 active:scale-95 disabled:opacity-40 disabled:hover:bg-white disabled:cursor-not-allowed"
                                  aria-label="Kurangi jumlah"
                                >
                                  <Minus className="h-3.5 w-3.5" />
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => {
                                    const val = parseInt(e.target.value, 10);
                                    if (!isNaN(val) && val >= 1) {
                                      updateQuantity(item.id, val);
                                    }
                                  }}
                                  className="w-12 text-center text-xs font-bold text-slate-900 bg-transparent border-0 focus:outline-none focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <button
                                  onClick={() =>
                                    updateQuantity(item.id, item.quantity + 1)
                                  }
                                  className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700 shadow-sm transition-all hover:bg-slate-100 active:scale-95"
                                  aria-label="Tambah jumlah"
                                >
                                  <Plus className="h-3.5 w-3.5" />
                                </button>
                              </div>
                              <span className="text-xs font-semibold text-slate-600">
                                {item.unitName}
                              </span>
                            </div>

                            {/* Item Subtotal Price */}
                            <div className="text-right">
                              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                                Subtotal
                              </span>
                              <span className="text-base font-extrabold text-slate-900">
                                {formatPrice(itemTotal)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Accordion Cards: Voucher Promo & Order Notes */}
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Promo Code Card */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="h-4 w-4 text-slate-700" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                      Voucher & Promo
                    </h3>
                  </div>

                  {appliedPromo ? (
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          <span className="font-bold text-xs text-emerald-900">
                            {appliedPromo.code}
                          </span>
                        </div>
                        <button
                          onClick={handleRemovePromo}
                          className="text-[11px] font-semibold text-rose-600 hover:underline"
                        >
                          Hapus
                        </button>
                      </div>
                      <p className="mt-1 text-[11px] text-emerald-700">
                        {appliedPromo.label} (Hemat {formatPrice(appliedPromo.discountAmount)})
                      </p>
                    </div>
                  ) : (
                    <div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={promoInput}
                          onChange={(e) => setPromoInput(e.target.value)}
                          placeholder="Masukkan kode promo..."
                          className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 uppercase font-mono placeholder:normal-case placeholder:font-sans focus:border-slate-400 focus:bg-white focus:outline-none"
                        />
                        <button
                          onClick={() => handleApplyPromo()}
                          className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-slate-800 active:scale-95"
                        >
                          Pasang
                        </button>
                      </div>

                      {promoError && (
                        <p className="mt-2 flex items-center gap-1 text-[11px] text-rose-600">
                          <AlertCircle className="h-3 w-3 flex-shrink-0" />
                          <span>{promoError}</span>
                        </p>
                      )}

                      {/* Quick Promo Chips */}
                      <div className="mt-3">
                        <p className="text-[10px] text-slate-400 font-semibold mb-1.5">VOUCHER TERSEDIA:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.values(PROMO_CODES).map((p) => (
                            <button
                              key={p.code}
                              onClick={() => handleApplyPromo(p.code)}
                              className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[10px] font-mono font-bold text-slate-700 hover:border-slate-400 hover:bg-white transition-all"
                            >
                              +{p.code}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Order Notes Card */}
                <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-700" />
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                        Catatan Pesanan
                      </h3>
                    </div>
                    {!showNoteInput && (
                      <button
                        onClick={() => setShowNoteInput(true)}
                        className="text-[11px] font-semibold text-slate-600 hover:text-slate-900"
                      >
                        + Tambah
                      </button>
                    )}
                  </div>

                  {showNoteInput ? (
                    <div>
                      <textarea
                        rows={3}
                        value={orderNote}
                        onChange={(e) => handleNoteChange(e.target.value)}
                        placeholder="Contoh: Titipkan ke satpam kompleks, tolong dipacking rapat..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-800 placeholder-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none"
                      />
                      <p className="mt-1 text-[10px] text-slate-400">
                        Catatan ini akan diteruskan ke tim pengiriman Rizqi Mart.
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic">
                      Belum ada instruksi khusus untuk pengiriman.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Order Summary (4 cols) */}
            <div className="lg:col-span-4">
              <div className="sticky top-24 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-md shadow-slate-100/50 space-y-6">
                <div>
                  <h2 className="text-lg font-extrabold text-slate-900">
                    Ringkasan Pesanan
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Detail rincian tagihan belanja Anda
                  </p>
                </div>

                <div className="space-y-3 border-t border-slate-100 pt-4">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">
                      Subtotal ({cartItems.length} item)
                    </span>
                    <span className="font-semibold text-slate-900">
                      {formatPrice(subtotal)}
                    </span>
                  </div>

                  {appliedPromo && (
                    <div className="flex justify-between text-xs text-emerald-700">
                      <span className="flex items-center gap-1 font-medium">
                        <Tag className="h-3 w-3" />
                        Diskon ({appliedPromo.code})
                      </span>
                      <span className="font-bold">
                        -{formatPrice(appliedPromo.discountAmount)}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-xs">
                    <span className="text-slate-600">Estimasi Ongkos Kirim</span>
                    <span className="font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      GRATIS
                    </span>
                  </div>

                  <div className="border-t border-slate-200 pt-3">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-sm font-extrabold text-slate-900 block">
                          Total Pembayaran
                        </span>
                        <span className="text-[10px] text-slate-400">
                          Sudah termasuk PPN jika berlaku
                        </span>
                      </div>
                      <span className="text-xl font-black text-slate-900 tracking-tight">
                        {formatPrice(grandTotal)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Primary Action Button */}
                <div className="space-y-3">
                  <Link
                    href="/checkout"
                    className="group flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 py-3.5 px-5 text-sm font-bold text-white shadow-lg shadow-slate-900/10 transition-all hover:bg-slate-800 active:scale-95"
                  >
                    <span>Lanjut ke Pembayaran</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Link>

                  <Link
                    href="/products"
                    className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 py-2.5 px-4 text-xs font-semibold text-slate-700 transition-all hover:bg-slate-100 hover:text-slate-900"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Lanjut Belanja Produuk Lain</span>
                  </Link>
                </div>

                {/* Guarantees Box */}
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <Truck className="h-4 w-4 text-slate-700 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Gratis Ongkir Mojokerto
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Pengiriman langsung dari gudang pusat Mojokerto.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 border-t border-slate-200/60 pt-2.5">
                    <ShieldCheck className="h-4 w-4 text-slate-700 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Jaminan Segar & Original
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Distributor resmi bahan pangan terpercaya.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5 border-t border-slate-200/60 pt-2.5">
                    <Zap className="h-4 w-4 text-slate-700 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">
                        Stok Sinkron Real-Time
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Alokasi otomatis metode Expiry-First-Out (EFO).
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Empty Cart State */
          <div className="mx-auto max-w-2xl rounded-3xl border border-slate-200/80 bg-white p-8 sm:p-12 text-center shadow-sm">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-slate-100 text-slate-400 ring-8 ring-slate-50">
              <ShoppingBag className="h-10 w-10 stroke-[1.5]" />
            </div>

            <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
              Keranjang Belanja Anda Kosong
            </h2>
            <p className="mt-2 text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
              Belum ada produk yang ditambahkan. Temukan sembako berkualitas dengan harga transparan langsung dari distributor resmi.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/products"
                className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-xs font-bold text-white shadow-md transition-all hover:bg-slate-800 active:scale-95"
              >
                <span>Mulai Belanja Sekarang</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {/* Quick Categories */}
            <div className="mt-10 border-t border-slate-100 pt-8">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                Kategori Populer:
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {CATEGORIES_QUICK.map((cat) => (
                  <Link
                    key={cat}
                    href={`/products?category=${encodeURIComponent(cat)}`}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-slate-400 hover:bg-white transition-all"
                  >
                    {cat}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Confirmation Modal for Clearing Cart */}
      {showClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5 text-rose-600">
                <AlertCircle className="h-5 w-5" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Kosongkan Keranjang Belanja?
                </h3>
              </div>
              <button
                onClick={() => setShowClearModal(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="mt-4 text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus seluruh barang dari keranjang belanja Anda? Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowClearModal(false)}
                className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                onClick={handleClearAll}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 shadow-sm transition-colors"
              >
                Ya, Kosongkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
