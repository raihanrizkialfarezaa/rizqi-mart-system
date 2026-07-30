"use client";

import { useState, useEffect } from "react";
import {
  User,
  Phone,
  Mail,
  MapPin,
  Truck,
  Store,
  CreditCard,
  QrCode,
  Banknote,
  FileText,
  CheckCircle2,
  Building2,
  Sparkles,
  Info,
  ChevronRight,
  RotateCcw,
  BookOpen,
  Plus,
  X,
  Star,
  Map,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import MapPickerModal from "@/components/ecommerce/MapPickerModal";

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

type SavedAddress = {
  id: string;
  label: string;
  fullAddress: string;
  kecamatan: string;
  kota: string;
  latitude?: number | null;
  longitude?: number | null;
  isDefault: boolean;
};

const STORAGE_KEY = "rizqi_mart_user_checkout_data";

export default function CheckoutForm({
  subtotal,
  initialNote = "",
  onSubmit,
}: CheckoutFormProps) {
  const { user } = useAuth();
  const [isAutofilled, setIsAutofilled] = useState(false);

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

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Multi-address states
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [selectedAddressLabel, setSelectedAddressLabel] = useState<string>("");

  // Load saved session or auth details & addresses
  useEffect(() => {
    let loadedName = "";
    let loadedEmail = "";
    let loadedPhone = "";
    let loadedAddress = "";
    let loadedKecamatan = "";

    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        loadedPhone = parsed.phone || "";
        loadedAddress = parsed.address || "";
        loadedKecamatan = parsed.kecamatan || "";
        loadedName = parsed.customerName || "";
        loadedEmail = parsed.email || "";
      }
    } catch (e) {
      console.error("Failed to read saved checkout data", e);
    }

    if (user) {
      if (!loadedName && user.name) loadedName = user.name;
      if (!loadedEmail && user.email) loadedEmail = user.email;
      fetchSavedAddresses();
    }

    setFormData((prev) => ({
      ...prev,
      customerName: prev.customerName || loadedName,
      phone: prev.phone || loadedPhone,
      email: prev.email || loadedEmail,
      address: prev.address || loadedAddress,
      kecamatan: prev.kecamatan || loadedKecamatan,
      customerNote: prev.customerNote || initialNote,
    }));

    if (loadedName || loadedEmail) {
      setIsAutofilled(true);
    }
  }, [user, initialNote]);

  const fetchSavedAddresses = async () => {
    try {
      const res = await fetch("/api/ecommerce/customer/addresses");
      if (res.ok) {
        const json = await res.json();
        const list: SavedAddress[] = json.data || [];
        setSavedAddresses(list);

        // Auto select default address if address fields are empty
        const defaultAddr = list.find((a) => a.isDefault) || list[0];
        if (defaultAddr && !formData.address) {
          setFormData((prev) => ({
            ...prev,
            address: defaultAddr.fullAddress,
            kecamatan: defaultAddr.kecamatan,
          }));
          setSelectedAddressLabel(defaultAddr.label);
        }
      }
    } catch (e) {
      console.error("Failed to load customer addresses", e);
    }
  };

  useEffect(() => {
    if (initialNote && !formData.customerNote) {
      setFormData((prev) => ({ ...prev, customerNote: initialNote }));
    }
  }, [initialNote]);

  const handleChange = (field: keyof CheckoutFormData, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            customerName: updated.customerName,
            phone: updated.phone,
            email: updated.email,
            address: updated.address,
            kecamatan: updated.kecamatan,
          })
        );
      } catch (e) {
        console.error("Failed to save checkout data", e);
      }
      return updated;
    });
  };

  const handleSelectSavedAddress = (addr: SavedAddress) => {
    handleChange("address", addr.fullAddress);
    handleChange("kecamatan", addr.kecamatan);
    setSelectedAddressLabel(addr.label);
    setIsAddressModalOpen(false);
  };

  const handleResetForm = () => {
    setFormData({
      customerName: "",
      phone: "",
      email: "",
      deliveryMethod: "DELIVERY",
      address: "",
      kecamatan: "",
      paymentMethod: "TRANSFER_BANK",
      customerNote: "",
    });
    setIsAutofilled(false);
    setSelectedAddressLabel("");
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {}
  };

  const addNoteTag = (tag: string) => {
    const current = formData.customerNote || "";
    if (current.includes(tag)) return;
    const newNote = current ? `${current}, ${tag}` : tag;
    handleChange("customerNote", newNote);
  };

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
    <form id="checkout-form" onSubmit={handleSubmit} className="space-y-6">
      {/* 1. Customer Information Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white font-bold text-sm">
              1
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Informasi Pembeli</span>
                {isAutofilled && (
                  <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
                    <Sparkles className="h-3 w-3 text-emerald-600" />
                    Autofill Aktif
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500">
                Lengkapi identitas untuk keperluan konfirmasi & resi pengiriman
              </p>
            </div>
          </div>

          {isAutofilled && (
            <button
              type="button"
              onClick={handleResetForm}
              className="text-xs font-semibold text-slate-500 hover:text-rose-600 flex items-center gap-1 transition-colors"
              title="Reset data form"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Full Name */}
          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 text-slate-500" />
                Nama Lengkap <span className="text-rose-500">*</span>
              </span>
              {formData.customerName.trim() && (
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Valid
                </span>
              )}
            </label>
            <input
              type="text"
              required
              value={formData.customerName}
              onChange={(e) => handleChange("customerName", e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs font-medium text-slate-900 transition-all placeholder:text-slate-400 focus:border-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              placeholder="Contoh: Raihan Rizki"
            />
          </div>

          {/* WhatsApp / Phone */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-slate-500" />
                Nomor HP / WhatsApp (Opsional)
              </span>
              {formData.phone.trim().length >= 9 && (
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Valid
                </span>
              )}
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleChange("phone", e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs font-medium text-slate-900 transition-all placeholder:text-slate-400 focus:border-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              placeholder="08123456789 (opsional)"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Notifikasi pesanan & resi akan dikirim via WhatsApp jika diisi
            </p>
          </div>

          {/* Email */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Mail className="h-3.5 w-3.5 text-slate-500" />
                Email (Opsional)
              </span>
            </label>
            <input
              type="email"
              value={formData.email || ""}
              onChange={(e) => handleChange("email", e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs font-medium text-slate-900 transition-all placeholder:text-slate-400 focus:border-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
              placeholder="nama@email.com"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Untuk pengiriman invoice digital & bukti transaksi
            </p>
          </div>
        </div>
      </div>

      {/* 2. Delivery Method & Address Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-center space-x-2.5 mb-4 pb-3 border-b border-slate-100">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white font-bold text-sm">
            2
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Metode Pengiriman & Alamat
            </h2>
            <p className="text-xs text-slate-500">
              Pilih opsi pengiriman langsung ke rumah atau kurir lokal
            </p>
          </div>
        </div>

        {/* Option Selection Cards */}
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Option: Delivery */}
          <div
            onClick={() => handleChange("deliveryMethod", "DELIVERY")}
            className={`cursor-pointer rounded-2xl border p-4 transition-all ${
              formData.deliveryMethod === "DELIVERY"
                ? "border-slate-900 bg-slate-900/5 ring-2 ring-slate-900 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    formData.deliveryMethod === "DELIVERY"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  <Truck className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Dikirim ke Alamat
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Kurir Toko Rizqi Mart
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                GRATIS
              </span>
            </div>
            <p className="mt-2.5 text-[11px] text-slate-600 bg-white/80 p-2 rounded-xl border border-slate-100">
              ⚡ Gratis ongkir wilayah Mojokerto & sekitarnya. Estimasi 30-60 menit.
            </p>
          </div>

          {/* Option: Pickup */}
          <div
            onClick={() => handleChange("deliveryMethod", "PICKUP")}
            className={`cursor-pointer rounded-2xl border p-4 transition-all ${
              formData.deliveryMethod === "PICKUP"
                ? "border-slate-900 bg-slate-900/5 ring-2 ring-slate-900 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    formData.deliveryMethod === "PICKUP"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Ambil di Toko (Pickup)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Bisa diambil kapan saja
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200">
                Bebas Waktu
              </span>
            </div>
            <p className="mt-2.5 text-[11px] text-slate-600 bg-white/80 p-2 rounded-xl border border-slate-100">
              🏬 Gudang & Toko Pusat Mojokerto (Jl. Raya Bypass Mojokerto No. 88).
            </p>
          </div>
        </div>

        {/* Address Input Section (if delivery) */}
        {formData.deliveryMethod === "DELIVERY" ? (
          <div className="mt-5 space-y-4 rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-all">
            {/* Action Bar for Maps & Saved Addresses */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                <MapPin className="h-4 w-4 text-slate-700" />
                <span>Detail Alamat Pengiriman</span>
                {selectedAddressLabel && (
                  <span className="rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-extrabold text-white">
                    {selectedAddressLabel}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {savedAddresses.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsAddressModalOpen(true)}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 shadow-sm transition-all"
                  >
                    <BookOpen className="h-3.5 w-3.5 text-slate-600" />
                    <span>Pilih Alamat Tersimpan ({savedAddresses.length})</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsMapOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-extrabold text-emerald-800 hover:bg-emerald-100 shadow-sm transition-all"
                >
                  <Map className="h-3.5 w-3.5 text-emerald-600" />
                  <span>Pilih via Maps</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Alamat Lengkap Pengiriman <span className="text-rose-500">*</span>
              </label>
              <textarea
                required
                rows={3}
                value={formData.address || ""}
                onChange={(e) => handleChange("address", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-900 transition-all placeholder:text-slate-400 focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                placeholder="Masukkan nama jalan, nomor rumah, RT/RW, dan patokan alamat..."
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                <Building2 className="h-3.5 w-3.5 text-slate-500" />
                Kecamatan <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.kecamatan || ""}
                onChange={(e) => handleChange("kecamatan", e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-medium text-slate-900 transition-all placeholder:text-slate-400 focus:border-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900/10"
                placeholder="Contoh: Prajurit Kulon / Magersari / Sooko"
              />
            </div>
          </div>
        ) : (
          <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50/60 p-4 text-xs text-blue-900 flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Informasi Pengambilan Toko:</p>
              <p className="mt-0.5 text-blue-800">
                Pesanan Anda akan disiapkan dalam 15-20 menit. Silakan tunjukkan nomor pesanan saat tiba di kasir Toko Pusat Rizqi Mart Mojokerto.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 3. Customer Note Section */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm transition-all hover:shadow-md">
        <h2 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-2">
          <FileText className="h-4 w-4 text-slate-700" />
          <span>Catatan Pesanan / Pengiriman (Opsional)</span>
        </h2>
        <p className="text-xs text-slate-500 mb-3">
          Tambahkan instruksi khusus untuk penjual atau kurir saat mengirim barang
        </p>

        <textarea
          rows={2}
          value={formData.customerNote || ""}
          onChange={(e) => handleChange("customerNote", e.target.value)}
          className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs font-medium text-slate-900 transition-all placeholder:text-slate-400 focus:border-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10"
          placeholder="Contoh: Titipkan di satpam, tolong dipacking rapat, jangan dibanting..."
        />

        {/* Quick Tag Suggestion Chips */}
        <div className="mt-2.5 flex flex-wrap gap-2">
          <span className="text-[11px] font-semibold text-slate-400 self-center">
            Pilihan cepat:
          </span>
          {[
            "Titipkan di Satpam",
            "Hubungi sebelum tiba",
            "Packing Rapat",
            "Taruh di depan pintu",
          ].map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => addNoteTag(tag)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 hover:border-slate-400 hover:bg-white hover:text-slate-900 transition-all"
            >
              + {tag}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Payment Method Selection Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm transition-all hover:shadow-md">
        <div className="flex items-center space-x-2.5 mb-4 pb-3 border-b border-slate-100">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white font-bold text-sm">
            3
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">
              Metode Pembayaran
            </h2>
            <p className="text-xs text-slate-500">
              Pilih opsi pembayaran yang paling nyaman untuk Anda
            </p>
          </div>
        </div>

        <div className="space-y-3">
          {/* Transfer Bank */}
          <div
            onClick={() => handleChange("paymentMethod", "TRANSFER_BANK")}
            className={`cursor-pointer rounded-2xl border p-4 transition-all ${
              formData.paymentMethod === "TRANSFER_BANK"
                ? "border-slate-900 bg-slate-900/5 ring-2 ring-slate-900 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    formData.paymentMethod === "TRANSFER_BANK"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Transfer Bank (Manual Check)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    BCA, Mandiri, BNI, BRI
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 border border-slate-200">
                Verifikasi Otomatis/Manual
              </span>
            </div>

            {formData.paymentMethod === "TRANSFER_BANK" && (
              <div className="mt-3 border-t border-slate-200/60 pt-3 text-xs text-slate-600 space-y-1 bg-white/70 p-3 rounded-xl">
                <p className="font-semibold text-slate-900">Rekening Tujuan Rizqi Mart:</p>
                <div className="flex justify-between font-mono text-[11px]">
                  <span>BCA: 8291-0029-11</span>
                  <span className="text-slate-500">a.n. Rizqi Mart Official</span>
                </div>
                <div className="flex justify-between font-mono text-[11px]">
                  <span>Mandiri: 1420-0019-2831</span>
                  <span className="text-slate-500">a.n. Rizqi Mart Official</span>
                </div>
              </div>
            )}
          </div>

          {/* QRIS Instant */}
          <div
            onClick={() => handleChange("paymentMethod", "QRIS")}
            className={`cursor-pointer rounded-2xl border p-4 transition-all ${
              formData.paymentMethod === "QRIS"
                ? "border-slate-900 bg-slate-900/5 ring-2 ring-slate-900 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    formData.paymentMethod === "QRIS"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  <QrCode className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    QRIS Instant Payment
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Gopay, OVO, ShopeePay, Dana, LinkAja & All Mobile Banking
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-800 border border-emerald-200">
                Instant Confirm
              </span>
            </div>

            {formData.paymentMethod === "QRIS" && (
              <div className="mt-3 border-t border-slate-200/60 pt-3 text-xs text-slate-600 bg-white/70 p-3 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-semibold text-slate-900">Kode QRIS akan tampil setelah order dibuat</p>
                  <p className="text-[11px] text-slate-500">Bisa di-scan dari aplikasi e-wallet mana saja tanpa biaya admin.</p>
                </div>
              </div>
            )}
          </div>

          {/* CASH (COD) */}
          <div
            onClick={() => handleChange("paymentMethod", "CASH")}
            className={`cursor-pointer rounded-2xl border p-4 transition-all ${
              formData.paymentMethod === "CASH"
                ? "border-slate-900 bg-slate-900/5 ring-2 ring-slate-900 shadow-sm"
                : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    formData.paymentMethod === "CASH"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  <Banknote className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Cash on Delivery (COD / Bayar di Tempat)
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Bayar tunai ke kurir saat barang tiba
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold text-amber-900 border border-amber-200">
                Bayar Saat Tiba
              </span>
            </div>

            {formData.paymentMethod === "CASH" && (
              <div className="mt-3 border-t border-slate-200/60 pt-3 text-xs text-slate-600 bg-white/70 p-3 rounded-xl">
                <p className="font-semibold text-slate-900">Pastikan uang pas disiapkan</p>
                <p className="text-[11px] text-slate-500">Nominal yang harus dibayarkan ke kurir: {formatPrice(subtotal)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Saved Addresses Modal Selector */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <BookOpen className="h-5 w-5 text-slate-900" />
                <h3 className="text-base font-bold text-slate-900">
                  Pilih Alamat Pengiriman Tersimpan
                </h3>
              </div>
              <button
                onClick={() => setIsAddressModalOpen(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {savedAddresses.map((addr) => (
                <div
                  key={addr.id}
                  onClick={() => handleSelectSavedAddress(addr)}
                  className={`cursor-pointer rounded-2xl border p-4 transition-all hover:border-slate-800 ${
                    formData.address === addr.fullAddress
                      ? "border-slate-900 bg-slate-900/5 ring-2 ring-slate-900"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="rounded-lg bg-slate-100 px-2.5 py-0.5 text-xs font-extrabold text-slate-800">
                      {addr.label}
                    </span>
                    {addr.isDefault && (
                      <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                        Utama
                      </span>
                    )}
                  </div>
                  <p className="text-xs font-bold text-slate-900 mt-1">
                    {addr.fullAddress}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Kecamatan {addr.kecamatan}, {addr.kota}
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-slate-100 text-right">
              <button
                type="button"
                onClick={() => setIsAddressModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Map Picker Modal */}
      <MapPickerModal
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        onSelectLocation={(data) => {
          handleChange("address", data.address);
          handleChange("kecamatan", data.kecamatan);
          setSelectedAddressLabel("Lokasi Peta");
        }}
      />
    </form>
  );
}
