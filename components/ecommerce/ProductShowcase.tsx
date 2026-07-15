"use client";

import { useState } from "react";
import ProductCard from "./ProductCard";
import { ArrowRight, Inbox } from "lucide-react";
import Link from "next/link";

/* ─── Serialized type — safe to cross server/client boundary ─── */
export type SerializedProduct = {
  id: string;
  name: string;
  sku: string;
  imageUrl: string | null;
  isActive: boolean;
  category: { id: string; name: string };
  sellingPrices: {
    id: string;
    price: number;
    customerType: string;
    isActive: boolean;
  }[];
  totalStock: number;
  unitName: string;
};

type ProductShowcaseProps = {
  initialProducts: SerializedProduct[];
};

export default function ProductShowcase({ initialProducts }: ProductShowcaseProps) {
  const [activeTab, setActiveTab] = useState<string>("all");

  // Unique category names from fetched products
  const categoryNames = Array.from(
    new Set(initialProducts.map((p) => p.category.name).filter(Boolean))
  ) as string[];

  const filteredProducts =
    activeTab === "all"
      ? initialProducts.slice(0, 8)
      : initialProducts
          .filter((p) => p.category.name === activeTab)
          .slice(0, 8);

  return (
    <div className="page-container">
      {/* Header */}
      <div className="mb-10 flex items-end justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Pilihan Produk
          </p>
          <h2 className="mt-1.5 text-2xl font-semibold text-slate-900">
            Katalog Produk Terkini
          </h2>
        </div>
        <Link
          href="/products"
          className="flex items-center gap-1 text-xs font-semibold text-slate-600 transition-colors hover:text-slate-900"
        >
          Lihat Semua
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Category tabs */}
      {categoryNames.length > 0 && (
        <div className="mb-8 flex flex-wrap gap-2 border-b border-slate-100 pb-4">
          <button
            onClick={() => setActiveTab("all")}
            className={`rounded-lg px-4 py-2 text-[12px] font-medium transition-all ${
              activeTab === "all"
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
            }`}
          >
            Semua Produk
          </button>
          {categoryNames.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveTab(cat)}
              className={`rounded-lg px-4 py-2 text-[12px] font-medium transition-all ${
                activeTab === cat
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Product grid */}
      {filteredProducts.length > 0 ? (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {filteredProducts.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              sku={product.sku}
              price={product.sellingPrices[0]?.price ?? 0}
              imageUrl={product.imageUrl ?? undefined}
              categoryName={product.category.name}
              isAvailable={product.isActive && product.totalStock > 0}
              stockCount={product.totalStock}
              unitName={product.unitName}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 py-20 text-center">
          <Inbox className="h-10 w-10 text-slate-300" strokeWidth={1.25} />
          <p className="mt-3 text-[13px] font-medium text-slate-700">Belum ada produk</p>
          <p className="mt-1 text-[12px] text-slate-400">Produk kategori ini belum tersedia</p>
        </div>
      )}
    </div>
  );
}
