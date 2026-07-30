"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MapPin, CreditCard, Package, FileText } from "lucide-react";

type CheckoutFormProps = {
  subtotal: number;
  initialNote?: string;
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
  customerNote?: string;
};

export default function CheckoutForm({ subtotal, initialNote = "", onSubmit }: CheckoutFormProps) {
  const [formData, setFormData] = useState<CheckoutFormData>({
    customerName: "",
    phone: "",
    email: "",
    deliveryMethod: "DELIVERY",
    address: "",
    kecamatan: "",
    paymentMethod: "TRANSFER_BANK",
    customerNote: initialNote,
  });

  useEffect(() => {
    if (initialNote && !formData.customerNote) {
      setFormData((prev) => ({ ...prev, customerNote: initialNote }));
    }
  }, [initialNote]);

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
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center space-x-2 text-base font-bold text-slate-900">
          <Package className="h-5 w-5 text-slate-700" />
          <span>Informasi Pembeli</span>
        </h2>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Nama Lengkap <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.customerName}
              onChange={(e) =>
                setFormData({ ...formData, customerName: e.target.value })
              }
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-800 focus:border-slate-400 focus:bg-white focus:outline-none"
              placeholder="Masukkan nama lengkap"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Nomor HP / WhatsApp <span className="text-rose-500">*</span>
            </label>
            <input
              type="tel"
              required
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-800 focus:border-slate-400 focus:bg-white focus:outline-none"
              placeholder="08123456789"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Email (Opsional)
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-800 focus:border-slate-400 focus:bg-white focus:outline-none"
              placeholder="email@example.com"
            />
          </div>
        </div>
      </div>

      {/* Delivery Method */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center space-x-2 text-base font-bold text-slate-900">
          <MapPin className="h-5 w-5 text-slate-700" />
          <span>Metode Pengiriman</span>
        </h2>

        <div className="space-y-3">
          <label className="flex cursor-pointer items-center space-x-3 rounded-xl border border-slate-200 p-4 hover:border-slate-400">
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
              className="h-4 w-4 text-slate-900"
            />
            <div className="flex-1">
              <div className="font-bold text-xs text-slate-900">Dikirim ke Alamat</div>
              <div className="text-[11px] text-slate-500">
                Gratis ongkir area Mojokerto
              </div>
            </div>
          </label>

          <label className="flex cursor-pointer items-center space-x-3 rounded-xl border border-slate-200 p-4 hover:border-slate-400">
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
              className="h-4 w-4 text-slate-900"
            />
            <div className="flex-1">
              <div className="font-bold text-xs text-slate-900">Ambil di Toko</div>
              <div className="text-[11px] text-slate-500">
                Gudang & Toko Pusat Mojokerto
              </div>
            </div>
          </label>
        </div>

        {/* Address Fields (if delivery) */}
        {formData.deliveryMethod === "DELIVERY" && (
          <div className="mt-4 space-y-4 border-t border-slate-100 pt-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Alamat Lengkap <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                value={formData.address}
                onChange={(e) =>
                  setFormData({ ...formData, address: e.target.value })
                }
                rows={3}
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 focus:border-slate-400 focus:bg-white focus:outline-none"
                placeholder="Jl. Gajah Mada No. 45..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Kecamatan <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.kecamatan}
                onChange={(e) =>
                  setFormData({ ...formData, kecamatan: e.target.value })
                }
                className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs text-slate-800 focus:border-slate-400 focus:bg-white focus:outline-none"
                placeholder="Contoh: Prajurit Kulon"
              />
            </div>
          </div>
        )}
      </div>

      {/* Customer Note */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center space-x-2 text-base font-bold text-slate-900">
          <FileText className="h-5 w-5 text-slate-700" />
          <span>Catatan Pesanan / Pengiriman</span>
        </h2>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">
            Catatan untuk Penjual atau Kurir (Opsional)
          </label>
          <textarea
            value={formData.customerNote || ""}
            onChange={(e) =>
              setFormData({ ...formData, customerNote: e.target.value })
            }
            rows={2}
            className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-800 placeholder-slate-400 focus:border-slate-400 focus:bg-white focus:outline-none"
            placeholder="Contoh: Titipkan ke satpam kompleks, tolong dipacking rapat..."
          />
        </div>
      </div>

      {/* Payment Method */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 flex items-center space-x-2 text-base font-bold text-slate-900">
          <CreditCard className="h-5 w-5 text-slate-700" />
          <span>Metode Pembayaran</span>
        </h2>

        <div className="space-y-3">
          <label className="flex cursor-pointer items-center space-x-3 rounded-xl border border-slate-200 p-4 hover:border-slate-400">
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
              className="h-4 w-4 text-slate-900"
            />
            <div className="flex-1">
              <div className="font-bold text-xs text-slate-900">Transfer Bank</div>
              <div className="text-[11px] text-slate-500">BCA, Mandiri, BNI</div>
            </div>
          </label>

          <label className="flex cursor-pointer items-center space-x-3 rounded-xl border border-slate-200 p-4 hover:border-slate-400">
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
              className="h-4 w-4 text-slate-900"
            />
            <div className="flex-1">
              <div className="font-bold text-xs text-slate-900">QRIS Instant</div>
              <div className="text-[11px] text-slate-500">Scan & bayar dengan e-wallet</div>
            </div>
          </label>

          <label className="flex cursor-pointer items-center space-x-3 rounded-xl border border-slate-200 p-4 hover:border-slate-400">
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
              className="h-4 w-4 text-slate-900"
            />
            <div className="flex-1">
              <div className="font-bold text-xs text-slate-900">Cash on Delivery (COD)</div>
              <div className="text-[11px] text-slate-500">
                Bayar tunai saat barang tiba di lokasi
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-slate-900 py-4 text-sm font-bold text-white transition-all hover:bg-slate-800 active:scale-95 disabled:bg-slate-300 disabled:cursor-not-allowed shadow-md"
      >
        {isSubmitting ? "Memproses Pesanan..." : `Konfirmasi & Buat Pesanan - ${formatPrice(subtotal)}`}
      </button>
    </form>
  );
}
