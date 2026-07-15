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
} from "lucide-react";

/* ─── Slide data ──────────────────────────────────── */
const SLIDES = [
  {
    tag: "Distributor Resmi · Mojokerto",
    headline: "Sembako Lengkap,\nHarga Terjangkau",
    accent: "Harga Terjangkau",
    sub: "Belanja kebutuhan pokok keluarga dan usaha langsung dari sumbernya. Harga transparan, stok selalu tersedia, pengiriman gratis se-Mojokerto.",
    cta: { label: "Lihat Semua Produk", href: "/products" },
    note: "Tanpa minimum pembelian",
  },
  {
    tag: "Mitra SPPG & Pengadaan Institusi",
    headline: "Pasokan Grosir untuk\nUsaha & Institusi",
    accent: "Usaha & Institusi",
    sub: "Kami melayani pengadaan bahan pokok skala besar untuk SPPG, katering, dan usaha kelontong dengan harga mitra khusus.",
    cta: { label: "Hubungi Tim Penjualan", href: "https://wa.me/6281234567890" },
    note: "Konsultasi gratis",
  },
];

/* ─── Trust badges ────────────────────────────────── */
const BADGES = [
  { icon: Truck, label: "Gratis Ongkir", sub: "Seluruh Wilayah Mojokerto" },
  { icon: ShieldCheck, label: "Produk Terjamin", sub: "Kualitas Terseleksi" },
  { icon: Zap, label: "Stok Real-Time", sub: "Sinkron Langsung dari Database" },
];

/* ─── Category quick links ──────────────────────── */
const CATEGORIES = [
  "Beras & Gula",
  "Minyak Goreng",
  "Susu & Olahan",
  "Tepung",
  "Bumbu Dapur",
  "Minuman",
];

export default function HomepageHero() {
  const [active, setActive] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(() => {
    timerRef.current = setInterval(() => {
      setActive((p) => (p + 1) % SLIDES.length);
    }, 7000);
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

  return (
    <section className="relative overflow-hidden bg-slate-50">
      {/* Subtle top-right decoration */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 -top-32 h-[500px] w-[500px] rounded-full bg-blue-50 opacity-60"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-16 -left-16 h-64 w-64 rounded-full bg-slate-100"
      />

      {/* Main content */}
      <div className="page-container relative z-10 pb-16 pt-14 md:pb-20 md:pt-20">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">

          {/* ─── Left column: headline ─── */}
          <div className="max-w-xl">
            {/* Tag pill */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
              {slide.tag}
            </div>

            {/* Headline */}
            <h1 className="mb-5 whitespace-pre-line text-[2.4rem] font-bold leading-[1.2] tracking-tight text-slate-900 md:text-5xl">
              {slide.headline}
            </h1>

            {/* Subtext */}
            <p className="mb-8 text-[15px] leading-relaxed text-slate-500">
              {slide.sub}
            </p>

            {/* Search */}
            <form onSubmit={handleSearch} className="mb-6">
              <div className="flex max-w-md items-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow focus-within:shadow-md focus-within:border-slate-400">
                <Search className="ml-4 h-4 w-4 flex-shrink-0 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari beras, minyak, susu..."
                  className="flex-1 bg-transparent py-3 pl-3 pr-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
                />
                <button
                  type="submit"
                  className="m-1.5 flex items-center gap-1 rounded-lg bg-slate-900 px-4 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-slate-700 active:scale-95"
                >
                  Cari
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </form>

            {/* Category quick links */}
            <div className="mb-8 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <Link
                  key={c}
                  href={`/products?category=${encodeURIComponent(c)}`}
                  className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-600 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900"
                >
                  {c}
                </Link>
              ))}
            </div>

            {/* CTA row */}
            <div className="flex flex-wrap items-center gap-4">
              <Link
                href={slide.cta.href}
                className="group inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3.5 text-[13px] font-semibold text-white shadow-sm transition-all hover:bg-slate-700 active:scale-95"
              >
                {slide.cta.label}
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <span className="text-[12px] text-slate-400">{slide.note}</span>
            </div>

            {/* Slide dots */}
            <div className="mt-10 flex items-center gap-2">
              {SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => goTo(i)}
                  aria-label={`Slide ${i + 1}`}
                  className={`h-[3px] rounded-full transition-all duration-500 ${
                    i === active
                      ? "w-8 bg-slate-800"
                      : "w-4 bg-slate-300 hover:bg-slate-400"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* ─── Right column: catalog card ─── */}
          <div className="hidden lg:flex items-center justify-end">
            <div className="relative w-full max-w-[400px]">
              {/* Main card */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-xl">
                {/* Browser chrome */}
                <div className="mb-4 flex items-center gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                  <div className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                  <div className="h-2.5 w-2.5 rounded-full bg-slate-200" />
                  <div className="ml-auto flex items-center gap-1.5 rounded-md bg-slate-100 px-3 py-1">
                    <span className="font-mono text-[10px] text-slate-500">
                      rizqimart.com/products
                    </span>
                  </div>
                </div>

                {/* Search bar mockup */}
                <div className="mb-4 flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2.5">
                  <Search className="h-3.5 w-3.5 text-slate-400" />
                  <span className="text-[12px] text-slate-400">
                    Minyak goreng 2 liter...
                  </span>
                </div>

                {/* Product grid mockup — 2×2 */}
                <div className="mb-4 grid grid-cols-2 gap-3">
                  {[
                    { name: "Beras Premium", price: "Rp 68.500", color: "bg-amber-50" },
                    { name: "Minyak Goreng", price: "Rp 33.000", color: "bg-orange-50" },
                    { name: "Gula Pasir 1kg", price: "Rp 17.000", color: "bg-yellow-50" },
                    { name: "Susu UHT 1L",   price: "Rp 19.500", color: "bg-blue-50"   },
                  ].map((item) => (
                    <div
                      key={item.name}
                      className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm"
                    >
                      {/* Image placeholder with soft tinted bg */}
                      <div
                        className={`mb-2.5 aspect-square w-full rounded-lg ${item.color}`}
                      />
                      <p className="text-[11px] font-semibold text-slate-800 leading-tight">
                        {item.name}
                      </p>
                      <p className="mt-0.5 text-[11px] font-bold text-slate-900">
                        {item.price}
                      </p>
                      <div className="mt-2 h-6 w-full rounded-md border border-slate-200 bg-slate-50" />
                    </div>
                  ))}
                </div>

                {/* Live sync indicator */}
                <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" aria-hidden />
                    <span className="text-[11px] font-medium text-emerald-700">
                      Harga &amp; Stok Sinkron Database
                    </span>
                  </div>
                  <span className="font-mono text-[10px] text-emerald-500">Live</span>
                </div>
              </div>

              {/* Floating badge — orders */}
              <div className="absolute -right-5 -top-5 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
                <p className="text-[10px] font-medium text-slate-400">
                  Pesanan Hari Ini
                </p>
                <p className="text-lg font-bold text-slate-900">
                  47{" "}
                  <span className="text-[13px] font-medium text-slate-400">
                    transaksi
                  </span>
                </p>
              </div>

              {/* Floating badge — delivery */}
              <div className="absolute -bottom-4 -left-5 flex items-center gap-2.5 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-lg">
                <Truck className="h-5 w-5 text-slate-700" strokeWidth={1.75} />
                <div>
                  <p className="text-[10px] font-medium text-slate-400">
                    Gratis Ongkir
                  </p>
                  <p className="text-[12px] font-bold text-slate-800">
                    Se-Mojokerto
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Trust badges strip ─── */}
      <div className="border-t border-slate-200/70 bg-white">
        <div className="page-container">
          <div className="grid grid-cols-3 divide-x divide-slate-100">
            {BADGES.map((b) => {
              const Icon = b.icon;
              return (
                <div
                  key={b.label}
                  className="flex items-center justify-center gap-3 py-5 md:justify-start"
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-slate-100 bg-slate-50">
                    <Icon
                      className="h-4.5 w-4.5 text-slate-600"
                      strokeWidth={1.75}
                    />
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-[12px] font-semibold text-slate-800">
                      {b.label}
                    </p>
                    <p className="text-[11px] text-slate-400">{b.sub}</p>
                  </div>
                  <p className="text-[11px] font-medium text-slate-700 sm:hidden">
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
