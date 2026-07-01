import Link from "next/link";
import { ArrowRight, Package, TrendingUp, Clock } from "lucide-react";
import ProductCard from "@/components/ecommerce/ProductCard";
import { prisma } from "@/lib/prisma";

async function getFeaturedProducts() {
  const products = await prisma.product.findMany({
    where: {
      isActive: true,
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
      baseUnit: true,
    },
    take: 8,
    orderBy: {
      createdAt: "desc",
    },
  });

  return products;
}

export default async function HomePage() {
  const products = await getFeaturedProducts();

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-blue-600 py-20 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold md:text-5xl">
              Belanja Sembako Mudah & Terpercaya
            </h1>
            <p className="mt-4 text-lg opacity-90">
              Produk berkualitas dengan harga terjangkau. Gratis ongkir area Mojokerto!
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link
                href="/products"
                className="rounded-lg bg-white px-6 py-3 font-medium text-primary transition-transform hover:scale-105"
              >
                Lihat Produk
              </Link>
              <Link
                href="/about"
                className="rounded-lg border-2 border-white px-6 py-3 font-medium transition-colors hover:bg-white/10"
              >
                Tentang Kami
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            <div className="flex items-start space-x-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <Package className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Produk Lengkap</h3>
                <p className="text-sm text-gray-600">
                  Ribuan produk sembako berkualitas
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <TrendingUp className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Harga Terbaik</h3>
                <p className="text-sm text-gray-600">
                  Harga kompetitif untuk ecer & grosir
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="rounded-lg bg-primary/10 p-3">
                <Clock className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Pengiriman Cepat</h3>
                <p className="text-sm text-gray-600">
                  Gratis ongkir area Mojokerto
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Kategori Produk</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {[
              { name: "Susu & Olahan", slug: "susu", color: "bg-blue-100" },
              { name: "Sembako Pokok", slug: "sembako", color: "bg-green-100" },
              { name: "Minyak & Bumbu", slug: "minyak", color: "bg-yellow-100" },
              { name: "Minuman", slug: "minuman", color: "bg-red-100" },
            ].map((category) => (
              <Link
                key={category.slug}
                href={`/products?category=${category.slug}`}
                className={`${category.color} group rounded-lg p-6 text-center transition-transform hover:scale-105`}
              >
                <h3 className="font-semibold group-hover:text-primary">
                  {category.name}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="bg-gray-50 py-16">
        <div className="container mx-auto px-4">
          <div className="mb-8 flex items-center justify-between">
            <h2 className="text-2xl font-bold">Produk Terbaru</h2>
            <Link
              href="/products"
              className="flex items-center space-x-2 text-sm font-medium text-primary hover:underline"
            >
              <span>Lihat Semua</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {products.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  sku={product.sku}
                  price={product.sellingPrices[0]?.price || 0}
                  imageUrl={product.imageUrl || undefined}
                  categoryName={product.category.name}
                  isAvailable={true}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-lg border bg-white p-12 text-center">
              <p className="text-gray-500">Produk akan segera tersedia</p>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="rounded-2xl bg-primary p-8 text-center text-white md:p-12">
            <h2 className="text-3xl font-bold">Butuh Bantuan?</h2>
            <p className="mt-2 text-lg opacity-90">
              Hubungi kami untuk pemesanan grosir atau pertanyaan lainnya
            </p>
            <div className="mt-6 flex flex-col justify-center gap-4 sm:flex-row">
              <a
                href="tel:081234567890"
                className="rounded-lg bg-white px-6 py-3 font-medium text-primary transition-transform hover:scale-105"
              >
                Hubungi Kami
              </a>
              <a
                href="https://wa.me/6281234567890"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-lg border-2 border-white px-6 py-3 font-medium transition-colors hover:bg-white/10"
              >
                Chat WhatsApp
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
