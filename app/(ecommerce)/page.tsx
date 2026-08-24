import Link from "next/link";
import {
  Package,
  TrendingUp,
  Truck,
  Wheat,
  Droplet,
  Milk,
  Coffee,
  Star,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import HomepageHero from "@/components/ecommerce/HomepageHero";
import ProductShowcase from "@/components/ecommerce/ProductShowcase";
import FaqSection from "@/components/ecommerce/FaqSection";
import type { SerializedProduct } from "@/components/ecommerce/ProductShowcase";

export type HighlightProduct = {
  id: string;
  name: string;
  sku: string;
  categoryName: string;
  retailPrice: number;
  retailUnit: string;
  institusiPrice: number;
  institusiUnit: string;
  totalStock: number;
  baseUnitCode: string;
  firstBatchExpiry: string | null;
};

async function getFeaturedProducts(): Promise<SerializedProduct[]> {
  const rows = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      category: true,
      sellingPrices: {
        where: { customerType: "RETAIL", isActive: true },
        orderBy: { effectiveFrom: "desc" },
        take: 1,
      },
      baseUnit: true,
      stockBatches: {
        where: { qtyRemainingBase: { gt: 0 } },
        select: { qtyRemainingBase: true },
      },
    },
    take: 8,
    orderBy: { createdAt: "desc" },
  });

  // Serialize Prisma Decimal → number so the data is safe to pass
  // across the Server → Client boundary (no Decimal objects allowed).
  return rows.map((p) => {
    const totalStock = p.stockBatches.reduce(
      (sum, batch) => sum + Number(batch.qtyRemainingBase),
      0
    );

    return {
      id: p.id,
      name: p.name,
      sku: p.sku,
      imageUrl: p.imageUrl ?? null,
      isActive: p.isActive,
      category: { id: p.category.id, name: p.category.name },
      sellingPrices: p.sellingPrices.map((sp) => ({
        id: sp.id,
        price: Number(sp.price),
        customerType: sp.customerType,
        isActive: sp.isActive,
      })),
      totalStock,
      unitName: p.baseUnit.name,
    };
  });
}

async function getHighlightProduct(): Promise<HighlightProduct | null> {
  const highlight = await prisma.product.findFirst({
    where: { isActive: true },
    include: {
      category: true,
      baseUnit: true,
      sellingPrices: {
        where: { isActive: true },
        include: { unit: true },
        orderBy: { effectiveFrom: "desc" },
      },
      stockBatches: {
        where: { qtyRemainingBase: { gt: 0 } },
        orderBy: { expiryDate: "asc" },
      },
    },
  });

  if (!highlight) return null;

  const retailPriceObj = highlight.sellingPrices.find((sp) => sp.customerType === "RETAIL");
  const institusiPriceObj = highlight.sellingPrices.find((sp) => sp.customerType === "INSTITUSI");

  const totalStock = highlight.stockBatches.reduce(
    (sum, batch) => sum + Number(batch.qtyRemainingBase),
    0
  );

  const firstBatchExpiryDate = highlight.stockBatches[0]?.expiryDate;
  const firstBatchExpiry = firstBatchExpiryDate
    ? new Date(firstBatchExpiryDate).toLocaleDateString("id-ID", { month: "2-digit", year: "numeric" })
    : null;

  return {
    id: highlight.id,
    name: highlight.name,
    sku: highlight.sku,
    categoryName: highlight.category.name,
    retailPrice: retailPriceObj ? Number(retailPriceObj.price) : 0,
    retailUnit: retailPriceObj?.unit?.code || "pcs",
    institusiPrice: institusiPriceObj ? Number(institusiPriceObj.price) : 0,
    institusiUnit: institusiPriceObj?.unit?.code || "pcs",
    totalStock,
    baseUnitCode: highlight.baseUnit?.code || "pcs",
    firstBatchExpiry,
  };
}

async function getCategories() {
  return prisma.productCategory.findMany({
    where: { products: { some: { isActive: true } } },
    take: 8,
    orderBy: { name: "asc" },
  });
}

function getCategoryIcon(name: string) {
  const n = name.toLowerCase();
  if (n.includes("sembako") || n.includes("pokok") || n.includes("beras") || n.includes("gula") || n.includes("bahan"))
    return Wheat;
  if (n.includes("minyak") || n.includes("bumbu") || n.includes("saus") || n.includes("kecap"))
    return Droplet;
  if (n.includes("susu") || n.includes("olahan") || n.includes("keju") || n.includes("mentega"))
    return Milk;
  if (n.includes("minuman") || n.includes("kopi") || n.includes("teh") || n.includes("jus") || n.includes("snack"))
    return Coffee;
  return Package;
}

const FEATURES = [
  {
    icon: Package,
    title: "Katalog Terintegrasi Real-Time",
    desc: "Seluruh produk sembako terdata dan diperbarui langsung dari sistem inventaris gudang. Stok yang tampil selalu akurat.",
  },
  {
    icon: TrendingUp,
    title: "Harga Ecer & Grosir Transparan",
    desc: "Harga bersumber dari database dan disesuaikan untuk retail harian maupun pembelian partai besar untuk mitra usaha.",
  },
  {
    icon: Truck,
    title: "Gratis Ongkir se-Mojokerto",
    desc: "Layanan pengiriman langsung ke depan rumah tanpa biaya tambahan untuk seluruh area Mojokerto, minimal belanja Rp 50.000.",
  },
];

const TESTIMONIALS = [
  {
    initials: "BI",
    name: "Bu Indah",
    role: "Pelanggan Retail, Mojokerto",
    rating: 5,
    comment:
      "Sangat praktis untuk belanja kebutuhan bulanan keluarga. Pesanan diantar rapi ke rumah, dan layanan gratis ongkirnya benar-benar membantu.",
  },
  {
    initials: "PB",
    name: "Pak Budi Santoso",
    role: "Pemilik Toko Kelontong, Kranggan",
    rating: 5,
    comment:
      "Harga eceran di Rizqi Mart sangat bersaing. Stok selalu tersedia dan pencatatan pesanan grosirnya sangat rapi dan profesional.",
  },
  {
    initials: "MY",
    name: "Mbak Yanti",
    role: "Pengelola Katering, Magersari",
    rating: 5,
    comment:
      "Bahan pokok selalu tiba tepat waktu sesuai jadwal. Layanan yang sangat handal untuk menunjang kebutuhan operasional usaha kuliner kami.",
  },
];

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [products, categories, highlightProduct] = await Promise.all([
    getFeaturedProducts(),
    getCategories(),
    getHighlightProduct(),
  ]);

  return (
    <div className="bg-white">
      {/* ───── Hero ───── */}
      <HomepageHero highlightProduct={highlightProduct} />

      {/* ───── Feature strips ───── */}
      <section className="border-b border-slate-100 bg-slate-50 py-12">
        <div className="page-container">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 shadow-sm">
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{f.title}</h3>
                    <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{f.desc}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ───── Categories (dynamic from DB) ───── */}
      {categories.length > 0 && (
        <section className="section-pad border-b border-slate-100">
          <div className="page-container">
            <div className="mb-10 flex items-end justify-between">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Jelajahi
                </p>
                <h2 className="mt-1.5 text-2xl font-semibold text-slate-900">
                  Kategori Produk
                </h2>
              </div>
              <Link
                href="/products"
                className="flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
              >
                Semua Kategori
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
              {categories.map((cat) => {
                const Icon = getCategoryIcon(cat.name);
                return (
                  <Link
                    key={cat.id}
                    href={`/products?category=${encodeURIComponent(cat.name)}`}
                    className="group flex flex-col items-center rounded-xl border border-slate-200/80 bg-slate-50 px-4 py-6 text-center transition-all duration-200 hover:border-slate-300 hover:bg-white hover:shadow-sm"
                  >
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-sm transition-colors group-hover:border-slate-300 group-hover:text-slate-900">
                      <Icon className="h-5 w-5" strokeWidth={1.75} />
                    </div>
                    <span className="mt-3.5 text-[13px] font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                      {cat.name}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ───── Products Showcase (dynamic tabs by category) ───── */}
      <section className="section-pad border-b border-slate-100">
        <ProductShowcase initialProducts={products} />
      </section>

      {/* ───── Testimonials ───── */}
      <section className="section-pad border-b border-slate-100 bg-slate-50">
        <div className="page-container">
          <div className="mb-10">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Ulasan
            </p>
            <h2 className="mt-1.5 text-2xl font-semibold text-slate-900">
              Tanggapan Pelanggan
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <div
                key={t.name}
                className="flex flex-col justify-between rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm"
              >
                <div>
                  {/* Stars */}
                  <div className="flex gap-0.5">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="mt-4 text-[13px] leading-relaxed text-slate-600">
                    "{t.comment}"
                  </p>
                </div>
                <div className="mt-6 flex items-center gap-3 border-t border-slate-100 pt-5">
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white">
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-[13px] font-semibold text-slate-900">{t.name}</p>
                    <p className="text-[11px] text-slate-500">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ───── FAQ ───── */}
      <FaqSection />

      {/* ───── CTA ───── */}
      <section className="section-pad">
        <div className="page-container">
          <div className="relative overflow-hidden rounded-2xl bg-slate-950 px-8 py-14 text-center md:px-16">
            {/* Subtle radial accent */}
            <div
              aria-hidden
              className="absolute left-1/2 top-0 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-indigo-600/15 blur-3xl"
            />

            <div className="relative z-10 mx-auto max-w-xl space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/60 px-3.5 py-1.5 text-[11px] font-medium text-slate-400">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                Layanan terpercaya sejak 2020
              </div>

              <h2 className="text-2xl font-semibold text-white md:text-3xl">
                Butuh Informasi Pengadaan atau Grosir?
              </h2>
              <p className="text-[14px] leading-relaxed text-slate-400">
                Tim kami siap membantu kebutuhan pasokan skala besar, kerja sama SPPG Makanan Bergizi Gratis,
                atau pertanyaan lainnya mengenai produk dan pengiriman.
              </p>

              <div className="flex flex-col justify-center gap-3 pt-2 sm:flex-row">
                <a
                  href="tel:081234567890"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-[13px] font-semibold text-slate-900 transition-all hover:bg-slate-100 active:scale-95"
                >
                  Hubungi via Telepon
                </a>
                <a
                  href="https://wa.me/6281234567890?text=Halo%2C%20saya%20ingin%20bertanya%20mengenai%20kerjasama%20grosir%20sembako"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800 px-6 py-3.5 text-[13px] font-semibold text-white transition-all hover:bg-slate-700 active:scale-95"
                >
                  Hubungi via WhatsApp
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
