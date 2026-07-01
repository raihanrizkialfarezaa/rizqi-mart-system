"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShoppingBag } from "lucide-react";
import CheckoutForm, { CheckoutFormData } from "@/components/ecommerce/CheckoutForm";

// Mock cart items - in production, this would come from Context/Redux/Database
const mockCartItems = [
  {
    id: "1",
    name: "Susu UHT Full Cream Cimory 125ml",
    price: 124000,
    quantity: 2,
    unitName: "Karton",
  },
];

export default function CheckoutPage() {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  const cartItems = mockCartItems;
  const subtotal = cartItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const shippingCost = 0; // Free shipping
  const total = subtotal + shippingCost;

  const handleCheckout = async (formData: CheckoutFormData) => {
    setIsProcessing(true);

    try {
      // In production, this would call the API to create order
      // await createSalesOrder({ ...formData, items: cartItems })

      // Simulate API call
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Redirect to success page
      router.push("/orders?status=success");
    } catch (error) {
      console.error("Checkout error:", error);
      alert("Terjadi kesalahan. Silakan coba lagi.");
    } finally {
      setIsProcessing(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="rounded-lg bg-white p-12 text-center shadow-sm">
            <ShoppingBag className="mx-auto h-24 w-24 text-gray-400" />
            <h2 className="mt-4 text-xl font-semibold text-gray-900">
              Keranjang Kosong
            </h2>
            <p className="mt-2 text-gray-600">
              Tambahkan produk ke keranjang terlebih dahulu
            </p>
            <Link
              href="/products"
              className="mt-6 inline-block rounded-lg bg-primary px-6 py-3 font-medium text-white hover:bg-primary/90"
            >
              Belanja Sekarang
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-6">
          <Link
            href="/cart"
            className="inline-flex items-center space-x-2 text-sm text-gray-600 hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Keranjang</span>
          </Link>
        </div>

        <h1 className="mb-8 text-3xl font-bold">Checkout</h1>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Checkout Form */}
          <div className="lg:col-span-2">
            <CheckoutForm subtotal={total} onSubmit={handleCheckout} />
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 rounded-lg bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold">Ringkasan Pesanan</h2>

              {/* Items */}
              <div className="mb-4 space-y-3 border-b pb-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-gray-600">
                        {item.quantity} {item.unitName} × {formatPrice(item.price)}
                      </div>
                    </div>
                    <div className="font-medium">
                      {formatPrice(item.price * item.quantity)}
                    </div>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{formatPrice(subtotal)}</span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Ongkos Kirim</span>
                  <span className="font-medium text-green-600">GRATIS</span>
                </div>

                <div className="border-t pt-2">
                  <div className="flex justify-between">
                    <span className="font-semibold">Total</span>
                    <span className="text-xl font-bold text-primary">
                      {formatPrice(total)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Security Notice */}
              <div className="mt-6 rounded-lg bg-green-50 p-4">
                <p className="text-sm text-green-900">
                  🔒 Transaksi Anda aman dan terenkripsi
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
