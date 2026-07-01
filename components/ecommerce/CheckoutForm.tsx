"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, CreditCard, Package } from "lucide-react";

type CheckoutFormProps = {
  subtotal: number;
  onSubmit: (data: CheckoutFormData) => void;
};

export type CheckoutFormData = {
  customerName: string;
  phone: string;
  email?: string;
  deliveryMethod: "PICKUP" | "DELIVERY";
  address?: string;
  kecamatan?: string;
  paymentMethod: "CASH" | "TRANSFER_BANK" | "QRIS";
};

export default function CheckoutForm({ subtotal, onSubmit }: CheckoutFormProps) {
  const [formData, setFormData] = useState<CheckoutFormData>({
    customerName: "",
    phone: "",
    email: "",
    deliveryMethod: "DELIVERY",
    address: "",
    kecamatan: "",
    paymentMethod: "TRANSFER_BANK",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Customer Information */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center space-x-2 text-lg font-semibold">
          <Package className="h-5 w-5 text-primary" />
          <span>Informasi Pembeli</span>
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Nama Lengkap <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.customerName}
              onChange={(e) =>
                setFormData({ ...formData, customerName: e.target.value })
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none"
              placeholder="Masukkan nama lengkap"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Nomor HP <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none"
              placeholder="08123456789"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Email (Opsional)
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none"
              placeholder="email@example.com"
            />
          </div>
        </div>
      </div>

      {/* Delivery Method */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center space-x-2 text-lg font-semibold">
          <MapPin className="h-5 w-5 text-primary" />
          <span>Metode Pengiriman</span>
        </h2>

        <div className="space-y-3">
          <label className="flex cursor-pointer items-center space-x-3 rounded-lg border-2 border-gray-200 p-4 hover:border-primary">
            <input
              type="radio"
              name="deliveryMethod"
              value="DELIVERY"
              checked={formData.deliveryMethod === "DELIVERY"}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  deliveryMethod: e.target.value as "DELIVERY",
                })
              }
              className="h-4 w-4 text-primary"
            />
            <div className="flex-1">
              <div className="font-medium">Dikirim ke Alamat</div>
              <div className="text-sm text-gray-600">
                Gratis ongkir area Mojokerto
              </div>
            </div>
          </label>

          <label className="flex cursor-pointer items-center space-x-3 rounded-lg border-2 border-gray-200 p-4 hover:border-primary">
            <input
              type="radio"
              name="deliveryMethod"
              value="PICKUP"
              checked={formData.deliveryMethod === "PICKUP"}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  deliveryMethod: e.target.value as "PICKUP",
                })
              }
              className="h-4 w-4 text-primary"
            />
            <div className="flex-1">
              <div className="font-medium">Ambil di Toko</div>
              <div className="text-sm text-gray-600">
                Mojokerto, Jawa Timur
              </div>
            </div>
          </label>
        </div>

        {/* Address Fields (if delivery) */}
        {formData.deliveryMethod === "DELIVERY" && (
          <div className="mt-4 space-y-4 border-t pt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Alamat Lengkap <span className="text-red-500">*</span>
              </label>
              <textarea
                required
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                rows={3}
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none"
                placeholder="Jl. Contoh No. 123"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Kecamatan <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.kecamatan}
                onChange={(e) =>
                  setFormData({ ...formData, kecamatan: e.target.value })
                }
                className="mt-1 w-full rounded-lg border border-gray-300 px-4 py-2 focus:border-primary focus:outline-none"
                placeholder="Contoh: Prajurit Kulon"
              />
            </div>
          </div>
        )}
      </div>

      {/* Payment Method */}
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center space-x-2 text-lg font-semibold">
          <CreditCard className="h-5 w-5 text-primary" />
          <span>Metode Pembayaran</span>
        </h2>

        <div className="space-y-3">
          <label className="flex cursor-pointer items-center space-x-3 rounded-lg border-2 border-gray-200 p-4 hover:border-primary">
            <input
              type="radio"
              name="paymentMethod"
              value="TRANSFER_BANK"
              checked={formData.paymentMethod === "TRANSFER_BANK"}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  paymentMethod: e.target.value as "TRANSFER_BANK",
                })
              }
              className="h-4 w-4 text-primary"
            />
            <div className="flex-1">
              <div className="font-medium">Transfer Bank</div>
              <div className="text-sm text-gray-600">BCA, Mandiri, BNI</div>
            </div>
          </label>

          <label className="flex cursor-pointer items-center space-x-3 rounded-lg border-2 border-gray-200 p-4 hover:border-primary">
            <input
              type="radio"
              name="paymentMethod"
              value="QRIS"
              checked={formData.paymentMethod === "QRIS"}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  paymentMethod: e.target.value as "QRIS",
                })
              }
              className="h-4 w-4 text-primary"
            />
            <div className="flex-1">
              <div className="font-medium">QRIS</div>
              <div className="text-sm text-gray-600">Scan & bayar</div>
            </div>
          </label>

          <label className="flex cursor-pointer items-center space-x-3 rounded-lg border-2 border-gray-200 p-4 hover:border-primary">
            <input
              type="radio"
              name="paymentMethod"
              value="CASH"
              checked={formData.paymentMethod === "CASH"}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  paymentMethod: e.target.value as "CASH",
                })
              }
              className="h-4 w-4 text-primary"
            />
            <div className="flex-1">
              <div className="font-medium">Cash on Delivery</div>
              <div className="text-sm text-gray-600">
                Bayar saat barang diterima
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-lg bg-primary px-6 py-4 text-lg font-medium text-white transition-colors hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed"
      >
        {isSubmitting ? "Memproses..." : `Buat Pesanan - ${formatPrice(subtotal)}`}
      </button>
    </form>
  );
}
