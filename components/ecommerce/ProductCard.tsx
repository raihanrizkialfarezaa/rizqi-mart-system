import Image from "next/image";
import Link from "next/link";
import { ShoppingCart } from "lucide-react";

type ProductCardProps = {
  id: string;
  name: string;
  sku: string;
  price: number;
  imageUrl?: string;
  categoryName: string;
  isAvailable?: boolean;
  onAddToCart?: () => void;
};

export default function ProductCard({
  id,
  name,
  sku,
  price,
  imageUrl,
  categoryName,
  isAvailable = true,
  onAddToCart,
}: ProductCardProps) {
  const formattedPrice = new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    minimumFractionDigits: 0,
  }).format(price);

  return (
    <div className="group relative rounded-lg border bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
      <Link href={`/products/${id}`}>
        <div className="aspect-square overflow-hidden rounded-lg bg-gray-100">
          {imageUrl ? (
            <Image
              src={imageUrl}
              alt={name}
              width={300}
              height={300}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-400">
              <span className="text-sm">No Image</span>
            </div>
          )}
        </div>

        <div className="mt-4 space-y-2">
          <div className="text-xs text-gray-500">{categoryName}</div>
          <h3 className="font-medium line-clamp-2 group-hover:text-primary">
            {name}
          </h3>
          <div className="text-xs text-gray-400">SKU: {sku}</div>
          <div className="flex items-center justify-between">
            <span className="text-lg font-bold text-primary">
              {formattedPrice}
            </span>
            {!isAvailable && (
              <span className="text-xs text-red-500 font-medium">
                Stok Habis
              </span>
            )}
          </div>
        </div>
      </Link>

      {isAvailable && onAddToCart && (
        <button
          onClick={(e) => {
            e.preventDefault();
            onAddToCart();
          }}
          className="mt-3 flex w-full items-center justify-center space-x-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary/90"
        >
          <ShoppingCart className="h-4 w-4" />
          <span>Tambah ke Keranjang</span>
        </button>
      )}

      {!isAvailable && (
        <button
          disabled
          className="mt-3 flex w-full items-center justify-center space-x-2 rounded-lg bg-gray-200 px-4 py-2 text-sm font-medium text-gray-500 cursor-not-allowed"
        >
          <span>Tidak Tersedia</span>
        </button>
      )}
    </div>
  );
}
