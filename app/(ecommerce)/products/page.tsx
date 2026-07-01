import { prisma } from "@/lib/prisma";
import ProductCard from "@/components/ecommerce/ProductCard";
import { Package } from "lucide-react";

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
      where: { name: { contains: searchParams.category, mode: "insensitive" } },
    });
    if (category) {
      where.categoryId = category.id;
    }
  }

  // Search by name
  if (searchParams.search) {
    where.name = {
      contains: searchParams.search,
      mode: "insensitive",
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

  return products;
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
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Katalog Produk</h1>
          <p className="mt-2 text-gray-600">
            Temukan produk sembako berkualitas dengan harga terbaik
          </p>
        </div>

        {/* Filters */}
        <div className="mb-8 rounded-lg bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold">Kategori</h2>
          <div className="flex flex-wrap gap-2">
            <a
              href="/products"
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                selectedCategory === "all"
                  ? "bg-primary text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              Semua Produk
            </a>
            {categories.map((category) => (
              <a
                key={category.id}
                href={`/products?category=${encodeURIComponent(category.name)}`}
                className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                  selectedCategory.toLowerCase() === category.name.toLowerCase()
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {category.name}
              </a>
            ))}
          </div>
        </div>

        {/* Search Info */}
        {searchParams.search && (
          <div className="mb-6 rounded-lg bg-blue-50 p-4">
            <p className="text-sm text-blue-900">
              Hasil pencarian untuk:{" "}
              <span className="font-semibold">{searchParams.search}</span>
            </p>
          </div>
        )}

        {/* Products Grid */}
        {products.length > 0 ? (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => {
              const totalStock = product.stockBatches.reduce(
                (sum, batch) => sum + Number(batch.qtyRemainingBase),
                0
              );
              const isAvailable = totalStock > 0;

              return (
                <ProductCard
                  key={product.id}
                  id={product.id}
                  name={product.name}
                  sku={product.sku}
                  price={product.sellingPrices[0]?.price || 0}
                  imageUrl={product.imageUrl || undefined}
                  categoryName={product.category.name}
                  isAvailable={isAvailable}
                />
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg bg-white p-12 text-center shadow-sm">
            <Package className="mx-auto h-16 w-16 text-gray-400" />
            <h3 className="mt-4 text-lg font-semibold text-gray-900">
              Produk tidak ditemukan
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Coba ubah filter atau kata kunci pencarian Anda
            </p>
            <a
              href="/products"
              className="mt-6 inline-block rounded-lg bg-primary px-6 py-2 text-sm font-medium text-white hover:bg-primary/90"
            >
              Lihat Semua Produk
            </a>
          </div>
        )}

        {/* Product Count */}
        {products.length > 0 && (
          <div className="mt-8 text-center text-sm text-gray-600">
            Menampilkan {products.length} produk
          </div>
        )}
      </div>
    </div>
  );
}
