"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  ArrowRight,
  ChevronRight,
  Truck,
  ShieldCheck,
  Zap,
  TrendingUp,
  RotateCcw,
} from "lucide-react";
import type { HighlightProduct } from "@/app/(ecommerce)/page";

/* ─── Slide data ──────────────────────────────────── */
const SLIDES = [
  {
    tag: "Distributor Resmi · Mojokerto",
    headlinePart1: "Sembako Lengkap,",
    headlinePart2: "Harga Terpopuler.",
    sub: "Penyedia kebutuhan pokok keluarga dan bisnis dengan harga transparan, stok 100% akurat dari database, dan pengiriman gratis ke seluruh Mojokerto.",
    cta: { label: "Jelajahi Produk", href: "/products" },
    note: "Harga ecer & grosir real-time",
  },
  {
    tag: "Mitra SPPG Makanan Bergizi",
    headlinePart1: "Pasokan Bahan Pokok",
    headlinePart2: "Skala Institusi.",
    sub: "Pengadaan bahan makanan untuk program SPPG, katering, dan warung kelontong dengan jaminan kualitas terbaik dan pengiriman terjadwal.",
    cta: { label: "Hubungi Penjualan", href: "https://wa.me/6281234567890" },
    note: "Dukungan kontrak pasokan",
  },
];

/* ─── Trust badges ────────────────────────────────── */
const BADGES = [
  { icon: Truck, label: "Gratis Ongkir", sub: "Wilayah Mojokerto" },
  { icon: ShieldCheck, label: "Jaminan Kualitas", sub: "Produk Terseleksi" },
  { icon: Zap, label: "Stok Real-Time", sub: "Sinkron Database" },
];

/* ─── Category Quick Links ──────────────────────── */
const CATEGORIES = [
  "Beras & Gula",
  "Minyak Goreng",
  "Susu & Olahan",
  "Tepung",
  "Bumbu Dapur",
];

type HomepageHeroProps = {
  highlightProduct: HighlightProduct | null;
};

export default function HomepageHero({ highlightProduct }: HomepageHeroProps) {
  const [active, setActive] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      setActive((p) => (p + 1) % SLIDES.length);
    }, 7500);
  }, []);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [startTimer]);

  const goTo = (i: number) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setActive(i);
    startTimer();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const slide = SLIDES[active];

  // Helper formats
  const formatIDR = (val: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val);

  // Fallback to static mock values if no DB highlight product is found
  const displayCategory = highlightProduct?.categoryName || "Sembako Pokok";
  const displayName = highlightProduct?.name || "Beras Premium Mentari 5kg";
  const displaySku = highlightProduct?.sku || "RQM-BRS-005";
  
  const displayRetail = highlightProduct 
    ? `${formatIDR(highlightProduct.retailPrice)} / ${highlightProduct.retailUnit.toLowerCase()}` 
    : "Rp 68.500 / bag";
    
  const displayInstitusi = highlightProduct 
    ? `${formatIDR(highlightProduct.institusiPrice)} / ${highlightProduct.institusiUnit.toLowerCase()}` 
    : "Rp 65.000 / bag";
    
  const displayStock = highlightProduct ? `${highlightProduct.totalStock} ${highlightProduct.baseUnitCode}` : "140 baseUnit";
  const displayExpiry = highlightProduct?.firstBatchExpiry ? `1st Batch Exp: ${highlightProduct.firstBatchExpiry}` : "1st Batch Exp: 12/2026";
  const displayCode = highlightProduct ? highlightProduct.sku.split("-")[1] || "ITEM" : "B-5KG";

  return (
    <section className="relative overflow-hidden bg-slate-50 border-b border-slate-200/50">
      {/* Decorative Grid Layer */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.4]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgb(226, 232, 240) 1px, transparent 1px),
            linear-gradient(to bottom, rgb(226, 232, 240) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />

      {/* Main Grid Content */}
      <div className="page-container relative z-10 py-16 md:py-24">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-12 lg:gap-16">

          {/* ─── Left Column: Content (7 cols) ─── */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            {/* Live Indicator Pill */}
            <div className="mb-6 inline-flex w-fit items-center gap-2 rounded-full border border-slate-250 border-slate-200 bg-white px-3.5 py-1.5 shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-slate-600"></span>
              </span>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-700">
                {slide.tag}
              </span>
            </div>

            {/* Headline */}
            <h1 className="mb-6 text-4xl font-extrabold leading-[1.15] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              {slide.headlinePart1}{" "}
              <span className="text-slate-800 block sm:inline">
                {slide.headlinePart2}
              </span>
            </h1>

            {/* Subtext */}
            <p className="mb-8 text-[15px] leading-relaxed text-slate-500 max-w-xl">
              {slide.sub}
            </p>

            {/* Search Form */}
            <form onSubmit={handleSearch} className="mb-6 max-w-lg">
              <div className="flex items-center rounded-2xl border border-slate-250 border-slate-200 bg-white p-1.5 shadow-md shadow-slate-100/50 transition-all focus-within:border-slate-400 focus-within:shadow-lg">
                <Search className="ml-3 h-4 w-4 flex-shrink-0 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari beras premium, minyak goreng, margarin..."
                  className="flex-1 bg-transparent py-2.5 pl-3 pr-2 text-sm text-slate-805 text-slate-800 placeholder-slate-400 focus:outline-none"
                />
                <button
                  type="submit"
                  className="flex items-center gap-1.5 rounded-xl bg-slate-900 px-5 py-2.5 text-[12px] font-semibold text-white transition-all hover:bg-slate-800 active:scale-95 shadow-sm"
                >
                  <span>Cari</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>

            {/* Quick Links */}
            <div className="mb-8 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mr-1">
                Pencarian Populer:
              </span>
              {CATEGORIES.map((c) => (
                <Link
                  key={c}
                  href={`/products?category=${encodeURIComponent(c)}`}
                  className="rounded-lg border border-slate-205 border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-650 shadow-sm transition-all hover:border-slate-350 hover:bg-slate-50 hover:text-slate-900"
                >
                  {c}
                </Link>
              ))}
            </div>

            {/* CTAs & Dots */}
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center gap-4">
                <Link
                  href={slide.cta.href}
                  className="group inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-[13px] font-semibold text-white shadow-md shadow-slate-900/10 transition-all hover:bg-slate-800 active:scale-95"
                >
                  {slide.cta.label}
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </Link>
                <span className="text-[12px] font-medium text-slate-400">
                  {slide.note}
                </span>
              </div>

              {/* Dots */}
              <div className="flex items-center gap-2">
                {SLIDES.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => goTo(i)}
                    aria-label={`Slide ${i + 1}`}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i === active ? "w-6 bg-slate-900" : "w-1.5 bg-slate-300 hover:bg-slate-400"
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ─── Right Column: Visual Dashboard Mockup (5 cols) ─── */}
          <div className="lg:col-span-5 hidden lg:flex items-center justify-end">
            <div className="w-full max-w-[380px] rounded-2xl border border-slate-200 bg-white p-5 shadow-xl shadow-slate-100/50">
              
              {/* Card Window Header */}
              <div className="mb-4 flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-slate-200" />
                  <div className="h-2 w-2 rounded-full bg-slate-200" />
                  <div className="h-2 w-2 rounded-full bg-slate-200" />
                </div>
                <div className="flex items-center gap-1 rounded bg-slate-50 px-2 py-0.5 text-[9px] font-mono text-slate-500 border border-slate-100">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-slate-300 opacity-70"></span>
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-slate-400"></span>
                  </span>
                  Database Active
                </div>
              </div>

              {/* High-Fi Product Display Section */}
              <div className="mb-4 rounded-xl border border-slate-150 border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-3">
                  {/* Tinted placeholder box */}
                  <div className="h-14 w-14 rounded-lg bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-sm">
                    {displayCode}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block">
                      {displayCategory}
                    </span>
                    <h3 className="text-xs font-bold text-slate-800 truncate" title={displayName}>
                      {displayName}
                    </h3>
                    <p className="text-[10px] text-slate-500">
                      SKU: {displaySku}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-slate-200/50 pt-2.5">
                  <div>
                    <span className="text-[9px] text-slate-400 block">Harga Retail</span>
                    <span className="text-xs font-bold text-slate-900">{displayRetail}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-slate-400 block text-right">Harga Institusi</span>
                    <span className="text-xs font-bold text-slate-800 block text-right">{displayInstitusi}</span>
                  </div>
                </div>

                {/* Stock allocation / EFO indicator */}
                <div className="mt-3 pt-2 border-t border-slate-200/50">
                  <div className="flex items-center justify-between text-[9px] text-slate-500 mb-1">
                    <span>EFO Allocation Status</span>
                    <span className="font-semibold text-slate-700">Active</span>
                  </div>
                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-slate-600 h-full rounded-full" style={{ width: "75%" }} />
                  </div>
                  <div className="flex items-center justify-between text-[8px] text-slate-400 mt-1">
                    <span>Stok Tersedia: {displayStock}</span>
                    <span>{displayExpiry}</span>
                  </div>
                </div>
              </div>

              {/* Live Activities Feed */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Protokol Bisnis Aktif
                </h4>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 flex items-start gap-2.5">
                  <TrendingUp className="h-3.5 w-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-slate-800">Metode Alokasi EFO</p>
                    <p className="text-[9px] text-slate-450">Stok keluar diprioritaskan berdasarkan tanggal kedaluwarsa terdekat.</p>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-2 flex items-start gap-2.5">
                  <RotateCcw className="h-3.5 w-3.5 text-slate-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-semibold text-slate-800">Valuasi Pembayaran Otomatis</p>
                    <p className="text-[9px] text-slate-450">Metode QRIS & Transfer ≥ Rp 500.000 ditandai otomatis LUNAS.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* ─── Trust Badge strip ─── */}
      <div className="border-t border-slate-200 bg-white">
        <div className="page-container">
          <div className="grid grid-cols-3 divide-x divide-slate-150">
            {BADGES.map((b) => {
              const Icon = b.icon;
              return (
                <div
                  key={b.label}
                  className="flex items-center justify-center gap-3.5 py-6 md:justify-start"
                >
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 shadow-sm text-slate-650">
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-[13px] font-bold text-slate-800 leading-tight">
                      {b.label}
                    </p>
                    <p className="text-[11px] text-slate-450 mt-0.5">{b.sub}</p>
                  </div>
                  <p className="text-[12px] font-bold text-slate-700 sm:hidden">
                    {b.label}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
