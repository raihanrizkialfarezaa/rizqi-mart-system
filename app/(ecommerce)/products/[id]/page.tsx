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
  const formattedPrice = primaryPrice
    ? new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
      }).format(primaryPrice.price)
    : "Harga belum tersedia";

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="mb-6 flex items-center space-x-2 text-sm">
          <Link href="/" className="text-gray-600 hover:text-primary">
            Home
          </Link>
          <span className="text-gray-400">/</span>
          <Link href="/products" className="text-gray-600 hover:text-primary">
            Produk
          </Link>
          <span className="text-gray-400">/</span>
          <span className="text-gray-900">{product.name}</span>
        </div>

        {/* Back Button */}
        <Link
          href="/products"
          className="mb-6 inline-flex items-center space-x-2 text-sm text-gray-600 hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Kembali ke Produk</span>
        </Link>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Product Image */}
          <div className="rounded-lg bg-white p-8 shadow-sm">
            <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
              {product.imageUrl ? (
                <Image
                  src={product.imageUrl}
                  alt={product.name}
                  width={600}
                  height={600}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <Package className="h-24 w-24 text-gray-400" />
                </div>
              )}
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="mb-4">
                <Link
                  href={`/products?category=${product.category.name}`}
                  className="text-sm text-primary hover:underline"
                >
                  {product.category.name}
                </Link>
              </div>

              <h1 className="text-3xl font-bold text-gray-900">
                {product.name}
              </h1>

              <div className="mt-2 text-sm text-gray-500">SKU: {product.sku}</div>

              <div className="mt-6">
                <div className="text-4xl font-bold text-primary">
                  {formattedPrice}
                </div>
                {primaryPrice && (
                  <div className="mt-1 text-sm text-gray-600">
                    per {primaryPrice.unit.name}
                  </div>
                )}
              </div>

              {/* Stock Status */}
              <div className="mt-6">
                {isAvailable ? (
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 rounded-full bg-green-500"></div>
                    <span className="text-sm font-medium text-green-700">
                      Stok Tersedia
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <div className="h-3 w-3 rounded-full bg-red-500"></div>
                    <span className="text-sm font-medium text-red-700">
                      Stok Habis
                    </span>
                  </div>
                )}

                {nearestExpiry && (
                  <div className="mt-2 text-sm text-gray-600">
                    Expired:{" "}
                    {new Date(nearestExpiry).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </div>
                )}
              </div>

              {/* Add to Cart */}
              {isAvailable ? (
                <AddToCartButton
                  product={{
                    id: product.id,
                    name: product.name,
                    sku: product.sku,
                    price: primaryPrice?.price || 0,
                    imageUrl: product.imageUrl || undefined,
                    unitName: primaryPrice?.unit?.name || "Pcs",
                  }}
                  className="mt-6 flex w-full items-center justify-center space-x-2 rounded-lg bg-primary px-6 py-3 font-medium text-white transition-all hover:bg-primary/90 active:scale-95 shadow-sm hover:shadow"
                />
              ) : (
                <button
                  disabled
                  className="mt-6 flex w-full items-center justify-center space-x-2 rounded-lg bg-gray-200 px-6 py-3 font-medium text-gray-500 cursor-not-allowed"
                >
                  <span>Tidak Tersedia</span>
                </button>
              )}

              {/* WhatsApp Contact */}
              <a
                href={`https://wa.me/6281234567890?text=Halo, saya tertarik dengan ${product.name}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 flex w-full items-center justify-center space-x-2 rounded-lg border-2 border-primary px-6 py-3 font-medium text-primary transition-colors hover:bg-primary/5"
              >
                <span>Hubungi via WhatsApp</span>
              </a>
            </div>

            {/* Product Description */}
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">Deskripsi Produk</h2>
              <div className="space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Kategori:</span>
                  <span className="font-medium">{product.category.name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Unit Dasar:</span>
                  <span className="font-medium">{product.baseUnit.name}</span>
                </div>
                {product.isPerishable && (
                  <div className="flex justify-between">
                    <span>Jenis:</span>
                    <span className="font-medium">Produk Perishable</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-16">
            <h2 className="mb-6 text-2xl font-bold">Produk Terkait</h2>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {relatedProducts.map((relatedProduct) => (
                <ProductCard
                  key={relatedProduct.id}
                  id={relatedProduct.id}
                  name={relatedProduct.name}
                  sku={relatedProduct.sku}
                  price={relatedProduct.sellingPrices[0]?.price || 0}
                  imageUrl={relatedProduct.imageUrl || undefined}
                  categoryName={relatedProduct.category.name}
                  isAvailable={true}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
