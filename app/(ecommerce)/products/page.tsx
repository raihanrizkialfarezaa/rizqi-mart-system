import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ecommerce/ProductCard";
import { Package, Inbox, ArrowLeft } from "lucide-react";
import Link from "next/link";

type SearchParams = {
  category?: string;
  search?: string;
};

async function getProducts(searchParams: SearchParams) {
  const where: any = {
    isActive: true,
  };

  // Filter by category
  if (searchParams.category) {
    const category = await prisma.productCategory.findFirst({
      where: { name: { contains: searchParams.category } },
    });
    if (category) {
      where.categoryId = category.id;
    }
  }

  // Search by name
  if (searchParams.search) {
    where.name = {
      contains: searchParams.search,
    };
  }

  const products = await prisma.product.findMany({
    where,
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
      stockBatches: {
        where: {
          qtyRemainingBase: { gt: 0 },
        },
        select: {
          qtyRemainingBase: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Convert Decimals to number to prevent Next.js client component boundary warnings
  return products.map((product) => {
    const totalStock = product.stockBatches.reduce(
      (sum, batch) => sum + Number(batch.qtyRemainingBase),
      0
    );
    const price = product.sellingPrices[0]
      ? Number(product.sellingPrices[0].price)
      : 0;

    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      price,
      imageUrl: product.imageUrl || null,
      categoryName: product.category.name,
      isAvailable: totalStock > 0,
      totalStock,
      unitName: product.baseUnit.name,
    };
  });
}

async function getCategories() {
  return prisma.productCategory.findMany({
    where: {
      products: {
        some: {
          isActive: true,
        },
      },
    },
    orderBy: {
      name: "asc",
    },
  });
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const [products, categories] = await Promise.all([
    getProducts(searchParams),
    getCategories(),
  ]);

  const selectedCategory = searchParams.category || "all";

  return (
    <div className="min-h-screen bg-slate-50/50">
      <div className="page-container py-12 md:py-16">
        
        {/* Breadcrumb / Back button */}
        <div className="mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Kembali ke Beranda
          </Link>
        </div>

        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Katalog Produk</h1>
          <p className="mt-2 text-[14px] text-slate-500">
            Temukan produk sembako berkualitas dengan harga terbaik untuk kebutuhan harian & grosir.
          </p>
        </div>

        {/* Filters Panel */}
        <div className="mb-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">
            Kategori
          </h2>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/products"
              className={`rounded-lg px-4 py-2 text-[12px] font-medium transition-all ${
                selectedCategory === "all"
                  ? "bg-slate-900 text-white"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
              }`}
            >
              Semua Produk
            </Link>
            {categories.map((category) => {
              const isSelected =
                selectedCategory.toLowerCase() === category.name.toLowerCase();
              return (
                <Link
                  key={category.id}
                  href={`/products?category=${encodeURIComponent(category.name)}`}
                  className={`rounded-lg px-4 py-2 text-[12px] font-medium transition-all ${
                    isSelected
                      ? "bg-slate-900 text-white"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900"
                  }`}
                >
                  {category.name}
                </Link>
              );
            })}
          </div>
        </div>

        {/* Search Query Notification */}
        {searchParams.search && (
          <div className="mb-8 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm flex items-center justify-between">
            <p className="text-[13px] text-slate-600">
              Menampilkan hasil pencarian untuk:{" "}
              <span className="font-semibold text-slate-900">"{searchParams.search}"</span>
            </p>
            <Link href="/products" className="text-[11px] font-semibold text-slate-500 hover:text-slate-900 underline underline-offset-4">
              Hapus Pencarian
            </Link>
          </div>
        )}

        {/* Products Grid */}
        {products.length > 0 ? (
          <div>
            <div className="grid grid-cols-2 gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  sku={product.sku}
                  price={product.price}
                  imageUrl={product.imageUrl || undefined}
                  categoryName={product.categoryName}
                  isAvailable={product.isAvailable}
                  stockCount={product.totalStock}
                  unitName={product.unitName}
                />
              ))}
            </div>

            {/* Product Count Footer */}
            <div className="mt-12 text-center text-xs text-slate-400">
              Menampilkan {products.length} produk pilihan
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-16 text-center shadow-sm">
            <Inbox className="mx-auto h-12 w-12 text-slate-300 stroke-[1.25]" />
            <h3 className="mt-4 text-base font-semibold text-slate-900">
              Produk tidak ditemukan
            </h3>
            <p className="mt-2 text-xs text-slate-500">
              Coba gunakan kata kunci lain atau pilih kategori yang berbeda
            </p>
            <Link
              href="/products"
              className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-slate-700"
            >
              Lihat Semua Produk
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
