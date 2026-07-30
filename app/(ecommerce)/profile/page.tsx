"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  User,
  MapPin,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Sparkles,
  Phone,
  Mail,
  Building2,
  ShieldCheck,
  ArrowLeft,
  Loader2,
  Star,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthProvider";
import MapPickerModal from "@/components/ecommerce/MapPickerModal";

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

export default function ProfilePage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"profile" | "addresses">("addresses");

  // Profile Form state
  const [profileData, setProfileData] = useState({
    name: "",
    phone: "",
    email: "",
  });

  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState("");

  // Addresses state
  const [addresses, setAddresses] = useState<SavedAddress[]>([]);
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);

  // Address Modal state
  const [isAddressModalOpen, setIsAddressModalOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<SavedAddress | null>(null);

  const [addressForm, setAddressForm] = useState({
    label: "Rumah",
    fullAddress: "",
    kecamatan: "",
    kota: "Mojokerto",
    latitude: null as number | null,
    longitude: null as number | null,
    isDefault: false,
  });

  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);

  useEffect(() => {
    fetchProfile();
    fetchAddresses();
  }, [user]);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/ecommerce/customer/profile");
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setProfileData({
            name: json.data.name || user?.name || "",
            phone: json.data.phone || "",
            email: json.data.email || user?.email || "",
          });
        }
      }
    } catch (e) {
      console.error("Failed to fetch profile", e);
    }
  };

  const fetchAddresses = async () => {
    setIsLoadingAddresses(true);
    try {
      const res = await fetch("/api/ecommerce/customer/addresses");
      if (res.ok) {
        const json = await res.json();
        setAddresses(json.data || []);
      }
    } catch (e) {
      console.error("Failed to fetch addresses", e);
    } finally {
      setIsLoadingAddresses(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileMsg("");

    try {
      const res = await fetch("/api/ecommerce/customer/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileData),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal memperbarui profil");
      }

      setProfileMsg("Profil berhasil diperbarui!");
      setTimeout(() => setProfileMsg(""), 3000);
    } catch (err: any) {
      alert(err.message || "Terjadi kesalahan");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleOpenAddAddress = () => {
    setEditingAddress(null);
    setAddressForm({
      label: "Rumah",
      fullAddress: "",
      kecamatan: "",
      kota: "Mojokerto",
      latitude: null,
      longitude: null,
      isDefault: addresses.length === 0,
    });
    setIsAddressModalOpen(true);
  };

  const handleOpenEditAddress = (addr: SavedAddress) => {
    setEditingAddress(addr);
    setAddressForm({
      label: addr.label,
      fullAddress: addr.fullAddress,
      kecamatan: addr.kecamatan,
      kota: addr.kota,
      latitude: addr.latitude || null,
      longitude: addr.longitude || null,
      isDefault: addr.isDefault,
    });
    setIsAddressModalOpen(true);
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAddress(true);

    try {
      const url = editingAddress
        ? `/api/ecommerce/customer/addresses/${editingAddress.id}`
        : "/api/ecommerce/customer/addresses";

      const method = editingAddress ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addressForm),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Gagal menyimpan alamat");
      }

      setIsAddressModalOpen(false);
      fetchAddresses();
    } catch (err: any) {
      alert(err.message || "Gagal menyimpan alamat");
    } finally {
      setIsSavingAddress(false);
    }
  };

  const handleSetDefaultAddress = async (id: string) => {
    try {
      const res = await fetch(`/api/ecommerce/customer/addresses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isDefault: true }),
      });
      if (res.ok) {
        fetchAddresses();
      }
    } catch (e) {
      console.error("Failed to set default address", e);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus alamat ini?")) return;

    try {
      const res = await fetch(`/api/ecommerce/customer/addresses/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchAddresses();
      }
    } catch (e) {
      console.error("Failed to delete address", e);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50/70 py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        {/* Navigation back */}
        <div className="mb-6">
          <Link
            href="/products"
            className="inline-flex items-center space-x-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Belanja</span>
          </Link>
        </div>

        {/* Page Header Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-white text-xl font-bold">
              {profileData.name ? profileData.name.charAt(0).toUpperCase() : "U"}
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-slate-900">
                {profileData.name || "Akun Pelanggan"}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {profileData.email || user?.email || "Kelola profil & daftar alamat pengiriman"}
              </p>
            </div>
          </div>

          <div className="flex rounded-2xl border border-slate-200 bg-slate-100 p-1 text-xs font-bold w-full sm:w-auto">
            <button
              onClick={() => setActiveTab("addresses")}
              className={`flex-1 sm:flex-initial rounded-xl px-4 py-2 transition-all ${
                activeTab === "addresses"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Daftar Alamat ({addresses.length})
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className={`flex-1 sm:flex-initial rounded-xl px-4 py-2 transition-all ${
                activeTab === "profile"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Profil Saya
            </button>
          </div>
        </div>

        {/* Tab 1: Alamat Pengiriman */}
        {activeTab === "addresses" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Daftar Alamat Pengiriman
                </h2>
                <p className="text-xs text-slate-500">
                  Simpan beberapa alamat untuk kemudahan checkout otomatis
                </p>
              </div>

              <button
                onClick={handleOpenAddAddress}
                className="rounded-2xl bg-slate-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-all flex items-center gap-1.5 shadow-md"
              >
                <Plus className="h-4 w-4 text-emerald-400" />
                <span>Tambah Alamat Baru</span>
              </button>
            </div>

            {isLoadingAddresses ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-slate-400">
                <Loader2 className="mx-auto h-8 w-8 animate-spin" />
                <p className="mt-2 text-xs font-medium">Memuat alamat tersimpan...</p>
              </div>
            ) : addresses.length === 0 ? (
              <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-sm">
                <MapPin className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-3 text-sm font-bold text-slate-900">
                  Belum Ada Alamat Tersimpan
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  Tambahkan alamat rumah atau kantor Anda untuk mempermudah pemesanan sembako
                </p>
                <button
                  onClick={handleOpenAddAddress}
                  className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
                >
                  <Plus className="h-4 w-4" />
                  <span>Tambah Alamat Pertama</span>
                </button>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={`rounded-2xl border p-5 transition-all bg-white shadow-sm hover:shadow-md flex flex-col justify-between ${
                      addr.isDefault
                        ? "border-slate-900 ring-2 ring-slate-900/10"
                        : "border-slate-200"
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-extrabold text-slate-800 border border-slate-200">
                            {addr.label}
                          </span>
                          {addr.isDefault && (
                            <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800 border border-emerald-200 flex items-center gap-1">
                              <Star className="h-3 w-3 fill-emerald-600 text-emerald-600" />
                              Alamat Utama
                            </span>
                          )}
                        </div>

                        {addr.latitude && addr.longitude && (
                          <span className="text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            📍 Maps Pin
                          </span>
                        )}
                      </div>

                      <p className="text-xs font-bold text-slate-900 mt-2">
                        {addr.fullAddress}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Kecamatan {addr.kecamatan}, {addr.kota}
                      </p>
                    </div>

                    <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between">
                      {!addr.isDefault ? (
                        <button
                          onClick={() => handleSetDefaultAddress(addr.id)}
                          className="text-xs font-semibold text-slate-600 hover:text-slate-900 underline"
                        >
                          Atur Sebagai Utama
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Terpilih Default
                        </span>
                      )}

                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleOpenEditAddress(addr)}
                          className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-600 hover:border-slate-400 hover:bg-white"
                          title="Edit Alamat"
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteAddress(addr.id)}
                          className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-rose-600 hover:border-rose-300 hover:bg-rose-50"
                          title="Hapus Alamat"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Profil Saya */}
        {activeTab === "profile" && (
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-4">
              Edit Data Diri Pelanggan
            </h2>

            {profileMsg && (
              <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 p-3 text-xs font-bold text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>{profileMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="space-y-4 max-w-lg">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  required
                  value={profileData.name}
                  onChange={(e) => setProfileData({ ...profileData, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs font-semibold text-slate-900 focus:border-slate-800 focus:bg-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nomor HP / WhatsApp (Opsional)
                </label>
                <input
                  type="tel"
                  value={profileData.phone}
                  onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs font-semibold text-slate-900 focus:border-slate-800 focus:bg-white focus:outline-none"
                  placeholder="08123456789 (opsional)"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={profileData.email}
                  onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs font-semibold text-slate-900 focus:border-slate-800 focus:bg-white focus:outline-none"
                  placeholder="email@example.com"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingProfile}
                className="rounded-xl bg-slate-900 px-6 py-2.5 text-xs font-bold text-white hover:bg-slate-800 transition-all shadow-md"
              >
                {isSavingProfile ? "Menyimpan..." : "Simpan Perubahan Profil"}
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Address Add / Edit Modal */}
      {isAddressModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {editingAddress ? "Edit Alamat Pengiriman" : "Tambah Alamat Baru"}
            </h3>

            <form onSubmit={handleSaveAddress} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Label Alamat (Contoh: Rumah, Kantor, Toko)
                </label>
                <div className="flex gap-2 mb-2">
                  {["Rumah", "Kantor", "Gudang", "Lainnya"].map((lbl) => (
                    <button
                      key={lbl}
                      type="button"
                      onClick={() => setAddressForm({ ...addressForm, label: lbl })}
                      className={`rounded-lg border px-3 py-1 text-xs font-bold transition-all ${
                        addressForm.label === lbl
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-slate-50 text-slate-700 hover:bg-white"
                      }`}
                    >
                      {lbl}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-700">
                    Alamat Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsMapOpen(true)}
                    className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 flex items-center gap-1 hover:bg-emerald-100"
                  >
                    <MapPin className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Pilih via Maps</span>
                  </button>
                </div>
                <textarea
                  required
                  rows={3}
                  value={addressForm.fullAddress}
                  onChange={(e) => setAddressForm({ ...addressForm, fullAddress: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 p-3 text-xs font-semibold text-slate-900 focus:border-slate-800 focus:bg-white focus:outline-none"
                  placeholder="Nama jalan, nomor rumah, RT/RW..."
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Kecamatan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addressForm.kecamatan}
                  onChange={(e) => setAddressForm({ ...addressForm, kecamatan: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-2.5 text-xs font-semibold text-slate-900 focus:border-slate-800 focus:bg-white focus:outline-none"
                  placeholder="Contoh: Prajurit Kulon"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <input
                  type="checkbox"
                  id="isDefault"
                  checked={addressForm.isDefault}
                  onChange={(e) => setAddressForm({ ...addressForm, isDefault: e.target.checked })}
                  className="h-4 w-4 text-slate-900 rounded border-slate-300"
                />
                <label htmlFor="isDefault" className="text-xs font-bold text-slate-700">
                  Jadikan Alamat Utama (Default)
                </label>
              </div>

              <div className="flex justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddressModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingAddress}
                  className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800"
                >
                  {isSavingAddress ? "Menyimpan..." : "Simpan Alamat"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Map Location Picker Modal */}
      <MapPickerModal
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        onSelectLocation={(data) => {
          setAddressForm((prev) => ({
            ...prev,
            fullAddress: data.address,
            kecamatan: data.kecamatan,
            latitude: data.latitude,
            longitude: data.longitude,
          }));
        }}
      />
    </div>
  );
}
