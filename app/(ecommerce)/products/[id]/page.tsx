import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ShoppingCart, ArrowLeft, Package } from "lucide-react";
import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ecommerce/ProductCard";
import AddToCartButton from "@/components/ecommerce/AddToCartButton";

async function getProduct(id: string) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      category: true,
      baseUnit: true,
      unitConversions: {
        include: {
          unit: true,
        },
      },
      sellingPrices: {
        where: {
          customerType: "RETAIL",
          isActive: true,
        },
        include: {
          unit: true,
        },
        orderBy: {
          effectiveFrom: "desc",
        },
      },
      stockBatches: {
        where: {
          qtyRemainingBase: { gt: 0 },
        },
        select: {
          qtyRemainingBase: true,
          expiryDate: true,
        },
        orderBy: {
          expiryDate: "asc",
        },
      },
    },
  });

  return product;
}

async function getRelatedProducts(categoryId: string, currentProductId: string) {
  return prisma.product.findMany({
    where: {
      categoryId,
      isActive: true,
      id: { not: currentProductId },
    },
    include: {
      category: true,
      baseUnit: true,
      sellingPrices: {
        where: {
          customerType: "RETAIL",
          isActive: true,
        },
        orderBy: {
          effectiveFrom: "desc",
        },
        take: 1,
      },
      stockBatches: {
        where: { qtyRemainingBase: { gt: 0 } },
        select: { qtyRemainingBase: true },
      },
    },
    take: 4,
  });
}

export default async function ProductDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const product = await getProduct(params.id);

  if (!product) {
    notFound();
  }

  const relatedProducts = await getRelatedProducts(
    product.categoryId,
    product.id
  );

  const totalStock = product.stockBatches.reduce(
    (sum, batch) => sum + Number(batch.qtyRemainingBase),
    0
  );
  const isAvailable = totalStock > 0;

  const nearestExpiry = product.stockBatches[0]?.expiryDate;

  const primaryPrice = product.sellingPrices[0];
  const priceValue = primaryPrice ? Number(primaryPrice.price) : 0;

  const formattedPrice = primaryPrice
    ? new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(priceValue)
    : "Harga belum tersedia";

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="page-container py-12 md:py-16">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center space-x-2 text-xs font-semibold text-slate-550 text-slate-500">
          <Link href="/" className="hover:text-slate-900 transition-colors">
            Beranda
          </Link>
          <span className="text-slate-300">/</span>
          <Link href="/products" className="hover:text-slate-900 transition-colors">
            Produk
          </Link>
          <span className="text-slate-300">/</span>
          <span className="text-slate-900">{product.name}</span>
        </div>

        {/* Back Button */}
        <div className="mb-8">
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Kembali ke Produk</span>
          </Link>
        </div>

        <div className="grid gap-10 md:grid-cols-2">
          {/* Product Image */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex items-center justify-center">
            <div className="relative aspect-square w-full overflow-hidden rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
              {product.imageUrl ? (
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  width={600}
                  height={600}
                  className="h-full w-full object-cover transition-transform hover:scale-[1.02]"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-300">
                  <Package className="h-16 w-16 stroke-[1.25]" />
                  <span className="text-[11px] font-semibold text-slate-400">Belum ada foto</span>
                </div>
              )}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  {product.category.name}
                </span>
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {product.name}
              </h1>

              <div className="mt-2 text-xs text-slate-400">SKU: {product.sku}</div>

              <div className="mt-6 border-t border-slate-100 pt-5">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block mb-1">
                  Harga Retail
                </span>
                <div className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {formattedPrice}
                </div>
                {primaryPrice && (
                  <div className="mt-1.5 text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md w-fit">
                    per {primaryPrice.unit.name}
                  </div>
                )}
              </div>

              {/* Stock Status */}
              <div className="mt-6 border-t border-slate-100 pt-5">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block mb-2.5">
                  Ketersediaan
                </span>
                {isAvailable ? (
                  <div className="inline-flex items-center gap-2 rounded-xl bg-emerald-50/60 border border-emerald-100/80 px-3 py-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-semibold text-emerald-800">
                      Tersisa <strong className="font-extrabold text-emerald-950 text-[13px]">{totalStock}</strong> {product.baseUnit.name}
                    </span>
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-100/80 px-3 py-2">
                    <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                    <span className="text-xs font-semibold text-rose-800">
                      Stok Habis
                    </span>
                  </div>
                )}

                {nearestExpiry && isAvailable && (
                  <div className="mt-2.5 text-[11px] font-medium text-slate-500">
                    Sisa Exp:{" "}
                    {new Date(nearestExpiry).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="mt-8 border-t border-slate-100 pt-6 space-y-3">
                {isAvailable ? (
                  <AddToCartButton
                    product={{
                      id: product.id,
                      name: product.name,
                      sku: product.sku,
                      price: priceValue,
                      imageUrl: product.imageUrl || undefined,
                      unitName: primaryPrice?.unit?.name || "Pcs",
                    }}
                    maxStock={totalStock}
                    className="flex w-full items-center justify-center space-x-2 rounded-xl bg-slate-900 px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-slate-800 active:scale-95 shadow-sm"
                  />
                ) : (
                  <button
                    disabled
                    className="flex w-full items-center justify-center rounded-xl bg-slate-100 px-6 py-3.5 text-sm font-semibold text-slate-400 cursor-not-allowed border border-slate-200"
                  >
                    <span>Stok Tidak Tersedia</span>
                  </button>
                )}

                <a
                  href={`https://wa.me/6281234567890?text=Halo%20Rizqi%20Mart%2C%20saya%20tertarik%20dengan%20produk%3A%20${encodeURIComponent(product.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 shadow-sm"
                >
                  <span>Hubungi via WhatsApp</span>
                </a>
              </div>
            </div>

            {/* Product Description */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                Spesifikasi Produk
              </h2>
              <div className="space-y-3 text-[13px] text-slate-600">
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span>Kategori</span>
                  <span className="font-semibold text-slate-800">{product.category.name}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-100">
                  <span>Unit Dasar (Base Unit)</span>
                  <span className="font-semibold text-slate-800">{product.baseUnit.name}</span>
                </div>
                {product.isPerishable && (
                  <div className="flex justify-between py-1.5">
                    <span>Karakteristik</span>
                    <span className="font-semibold text-slate-800">Perishable (Mudah Rusak)</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-16 border-t border-slate-200 pt-12">
            <h2 className="mb-6 text-xl font-bold tracking-tight text-slate-900">
              Produk Terkait Lainnya
            </h2>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {relatedProducts.map((relatedProduct) => {
                const price = relatedProduct.sellingPrices[0]
                  ? Number(relatedProduct.sellingPrices[0].price)
                  : 0;
                const relatedStock = relatedProduct.stockBatches.reduce(
                  (sum, batch) => sum + Number(batch.qtyRemainingBase),
                  0
                );
                return (
                  <ProductCard
                    key={relatedProduct.id}
                    id={relatedProduct.id}
                    name={relatedProduct.name}
                    sku={relatedProduct.sku}
                    price={price}
                    imageUrl={relatedProduct.imageUrl || undefined}
                    categoryName={relatedProduct.category.name}
                    isAvailable={relatedStock > 0}
                    stockCount={relatedStock}
                    unitName={relatedProduct.baseUnit.name}
                  />
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
