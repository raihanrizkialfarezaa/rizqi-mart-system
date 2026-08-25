"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Package,
  MapPin,
  CreditCard,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Printer,
  RefreshCw,
  Upload,
  ChevronDown,
  ChevronUp,
  Truck,
  Store,
  Building2,
  FileText,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  MessageSquare,
  ShoppingBag,
  RotateCcw,
  Landmark,
  Wallet,
  Info,
  ImageIcon,
  X,
  ZoomIn,
} from "lucide-react";
import { useCart } from "./CartContext";

// ─── Types ───

export type OrderItem = {
  id: string;
  qty: number | string;
  unitSellPrice: number | string;
  subtotalSell: number | string;
  product: {
    id: string;
    name: string;
    sku: string;
    imageUrl?: string | null;
  };
  unit: {
    id: string;
    name: string;
  };
};

export type StatusHistory = {
  id?: string;
  fromStatus?: string | null;
  toStatus: string;
  changedAt: string | Date;
  note?: string | null;
};

export type Payment = {
  id: string;
  method: string;
  amount: number | string;
  status: string;
  proofFileUrl?: string | null;
  createdAt: string | Date;
};

export type OrderDetailData = {
  id: string;
  orderNumber: string;
  status: string;
  fulfillmentStatus: string;
  paymentStatus: string;
  deliveryMethod: string;
  deliveryAddressText?: string | null;
  subtotal: number | string;
  discountAmount?: number | string;
  totalAmount: number | string;
  createdAt: string | Date;
  updatedAt: string | Date;
  customer?: {
    name: string;
    phone?: string | null;
    email?: string | null;
  } | null;
  items: OrderItem[];
  statusHistory: StatusHistory[];
  payments: Payment[];
  invoice?: any;
  deliveryNote?: any;
};

// ─── Status Configurations ───

const statusConfig: Record<
  string,
  {
    label: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    description: string;
    icon: React.ElementType;
    stepIndex: number;
  }
> = {
  DRAFT: {
    label: "Pesanan Dibuat",
    badgeBg: "bg-slate-100",
    badgeText: "text-slate-800",
    badgeBorder: "border-slate-200",
    description: "Pesanan baru dibuat dan menunggu pembayaran / konfirmasi.",
    icon: FileText,
    stepIndex: 0,
  },
  MENUNGGU_KONFIRMASI: {
    label: "Menunggu Konfirmasi",
    badgeBg: "bg-amber-50",
    badgeText: "text-amber-900",
    badgeBorder: "border-amber-200",
    description: "Pesanan sedang diverifikasi oleh admin toko Rizqi Mart.",
    icon: Clock,
    stepIndex: 1,
  },
  DIKONFIRMASI: {
    label: "Pesanan Dikonfirmasi",
    badgeBg: "bg-slate-900",
    badgeText: "text-white",
    badgeBorder: "border-slate-900",
    description: "Pesanan telah disetujui dan sedang disiapkan.",
    icon: CheckCircle2,
    stepIndex: 2,
  },
  MENUNGGU_PENGADAAN: {
    label: "Pengadaan Barang",
    badgeBg: "bg-slate-900",
    badgeText: "text-white",
    badgeBorder: "border-slate-900",
    description: "Sebagian barang sedang disiapkan dari gudang pusat.",
    icon: Package,
    stepIndex: 2,
  },
  SIAP_KIRIM: {
    label: "Sedang Dikemas",
    badgeBg: "bg-slate-900",
    badgeText: "text-white",
    badgeBorder: "border-slate-900",
    description: "Barang sudah rapi dikemas dan siap diantar oleh kurir.",
    icon: Package,
    stepIndex: 2,
  },
  DALAM_PENGIRIMAN: {
    label: "Dalam Pengiriman",
    badgeBg: "bg-slate-900",
    badgeText: "text-white",
    badgeBorder: "border-slate-900",
    description: "Kurir toko Rizqi Mart sedang menuju alamat pengiriman Anda.",
    icon: Truck,
    stepIndex: 3,
  },
  TERKIRIM_MENUNGGU_TTD: {
    label: "Tiba di Lokasi",
    badgeBg: "bg-slate-900",
    badgeText: "text-white",
    badgeBorder: "border-slate-900",
    description: "Pesanan telah sampai di lokasi tujuan Anda.",
    icon: MapPin,
    stepIndex: 3,
  },
  SELESAI: {
    label: "Pesanan Selesai",
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-800",
    badgeBorder: "border-emerald-200",
    description: "Pesanan telah selesai dan diterima dengan baik.",
    icon: Sparkles,
    stepIndex: 4,
  },
  DIBATALKAN: {
    label: "Pesanan Dibatalkan",
    badgeBg: "bg-rose-50",
    badgeText: "text-rose-800",
    badgeBorder: "border-rose-200",
    description: "Pesanan ini telah dibatalkan.",
    icon: XCircle,
    stepIndex: -1,
  },
};

const ORDER_STEPS = [
  { label: "Dibuat", title: "Pesanan Dibuat", icon: FileText, desc: "Pesanan tercatat" },
  { label: "Verifikasi", title: "Verifikasi Admin", icon: ShieldCheck, desc: "Pengecekan pesanan" },
  { label: "Dikemas", title: "Diproses & Dikemas", icon: Package, desc: "Barang disiapkan" },
  { label: "Dikirim", title: "Dalam Pengiriman", icon: Truck, desc: "Kurir mengantar" },
  { label: "Selesai", title: "Pesanan Selesai", icon: CheckCircle2, desc: "Barang diterima" },
];

export default function OrderDetailClient({
  initialOrder,
}: {
  initialOrder: OrderDetailData;
}) {
  const router = useRouter();
  const { addToCart } = useCart();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [order, setOrder] = useState<OrderDetailData>(initialOrder);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [copiedBankIndex, setCopiedBankIndex] = useState<number | null>(null);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  // Modal / Action states
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Payment proof upload states
  const [proofUrl, setProofUrl] = useState("");
  const [proofPreview, setProofPreview] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [uploadMode, setUploadMode] = useState<"file" | "link">("file");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  // Real-time polling
  const fetchLatestOrder = useCallback(async (manual = false) => {
    if (manual) setIsRefreshing(true);
    try {
      const res = await fetch(`/api/ecommerce/orders/${initialOrder.id}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setOrder(json.data);
        }
      }
    } catch (err) {
      console.error("Failed to refresh order", err);
    } finally {
      if (manual) setIsRefreshing(false);
    }
  }, [initialOrder.id]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchLatestOrder(false);
    }, 15000);
    return () => clearInterval(interval);
  }, [fetchLatestOrder]);

  // Revoke object URLs for preview to avoid memory leaks
  useEffect(() => {
    return () => {
      if (proofPreview && proofPreview.startsWith("blob:")) {
        URL.revokeObjectURL(proofPreview);
      }
    };
  }, [proofPreview]);

  const formatPrice = (price: number | string) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(Number(price) || 0);
  };

  const formatDateTime = (date: string | Date) => {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const copyToClipboard = (text: string, type: "number" | number) => {
    navigator.clipboard.writeText(text);
    if (type === "number") {
      setCopiedNumber(true);
      setTimeout(() => setCopiedNumber(false), 2000);
    } else {
      setCopiedBankIndex(type);
      setTimeout(() => setCopiedBankIndex(null), 2000);
    }
  };

  // Perform Cancel or Mark Received
  const handlePerformAction = async (action: "CANCEL" | "MARK_RECEIVED") => {
    if (action === "MARK_RECEIVED" && !canConfirmReceived) {
      setActionError(confirmBlockReason || "Pesanan belum dapat dikonfirmasi. Selesaikan pembayaran & tunggu pengiriman.");
      return;
    }
    setIsSubmittingAction(true);
    setActionError("");
    setActionSuccess("");

    try {
      const res = await fetch(`/api/ecommerce/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal memperbarui status pesanan");
      }

      setActionSuccess(json.message || "Berhasil memperbarui pesanan");
      await fetchLatestOrder(true);

      if (action === "CANCEL") setIsCancelModalOpen(false);
      if (action === "MARK_RECEIVED") setIsReceiveModalOpen(false);
    } catch (err: any) {
      setActionError(err.message || "Terjadi kendala saat memproses pesanan.");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Handle Image File Selection for Payment Proof — simplified & ultra-reliable
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputEl = e.target as HTMLInputElement;
    const file = inputEl.files?.[0];
    if (!file) return;

    setActionError("");
    setActionSuccess("");

    if (file.size > 10 * 1024 * 1024) {
      setActionError("Ukuran file maksimal 10MB. Coba kompres foto atau gunakan Tempel Link.");
      inputEl.value = "";
      setProofFile(null);
      setProofPreview(null);
      return;
    }

    if (!file.type.startsWith("image/")) {
      setActionError("File harus berupa gambar (JPG, PNG, WebP).");
      inputEl.value = "";
      setProofFile(null);
      setProofPreview(null);
      return;
    }

    // Instant preview via object URL — no async canvas/FileReader needed for preview
    // Keep original File for FormData upload (server will save and return short URL)
    if (proofPreview && proofPreview.startsWith("blob:")) {
      URL.revokeObjectURL(proofPreview);
    }
    const previewUrl = URL.createObjectURL(file);
    setProofFile(file);
    setProofPreview(previewUrl);
    // Do NOT set proofUrl for file mode — upload will use proofFile via FormData and get short URL
    // Keep proofUrl empty so link mode is separate
    inputEl.value = "";
  };

  // Handle Payment Proof Submit (robust: file via FormData → short URL)
  const handleUploadPaymentProof = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalProof = proofUrl.trim();

    // If file mode with actual File object, upload via FormData to get short URL (avoids large base64 JSON + TEXT limits)
    if (uploadMode === "file" && proofFile) {
      try {
        const formData = new FormData();
        formData.append("file", proofFile);
        const uploadRes = await fetch("/api/upload/payment-proof", {
          method: "POST",
          body: formData,
        });
        const uploadJson = await uploadRes.json();
        if (!uploadRes.ok) throw new Error(uploadJson.error || "Gagal mengunggah file ke server");
        if (uploadJson.url) finalProof = uploadJson.url;
      } catch (uploadErr: any) {
        console.warn("FormData upload failed, fallback to base64", uploadErr);
        // fallback: keep finalProof as base64 (already in proofUrl) if available
        if (!finalProof) {
          setActionError(uploadErr.message || "Gagal mengunggah file. Coba gunakan Tempel Link atau kompres foto.");
          return;
        }
      }
    }

    if (!finalProof) {
      setActionError("Silakan pilih file gambar atau masukkan tautan bukti transfer.");
      return;
    }

    setIsUploadingProof(true);
    setActionError("");
    setActionSuccess("");

    try {
      const res = await fetch(`/api/ecommerce/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPLOAD_PAYMENT_PROOF",
          proofUrl: finalProof,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal mengunggah bukti pembayaran");
      }

      setActionSuccess(json.message || "Bukti pembayaran berhasil dikirim!");
      setProofUrl("");
      setProofPreview(null);
      setProofFile(null);
      await fetchLatestOrder(true);
    } catch (err: any) {
      setActionError(err.message || "Terjadi kesalahan saat mengunggah bukti.");
    } finally {
      setIsUploadingProof(false);
    }
  };

  // Handle Re-order (Beli Lagi)
  const handleBuyAgain = () => {
    order.items.forEach((it) => {
      addToCart(
        {
          id: it.product.id,
          name: it.product.name,
          sku: it.product.sku,
          price: Number(it.unitSellPrice),
          imageUrl: it.product.imageUrl || undefined,
          unitName: it.unit.name,
        },
        Number(it.qty)
      );
    });
    router.push("/cart");
  };

  const statusMeta = statusConfig[order.status] || statusConfig.DRAFT;
  const isCancelled = order.status === "DIBATALKAN";
  const isCompleted = order.status === "SELESAI";
  const currentStep = statusMeta.stepIndex;

  // ─── Unified gating for Konfirmasi Pesanan Selesai (best-practice COD + prepaid) ───
  // - COD (CASH): paymentStatus must be LUNAS via admin/kurir before user can confirm (prevents self-approval of cash)
  // - Prepaid (TRANSFER_BANK/QRIS/Midtrans): must be LUNAS (via proof + admin validation or auto-LUNAS >=500k)
  // - Fulfillment must be at least SIAP_KIRIM / DALAM_PENGIRIMAN / TERKIRIM_MENUNGGU_TTD per state machine
  const primaryPaymentMethod = order.payments?.[0]?.method || null;
  const isCOD = primaryPaymentMethod === "CASH";
  const isPaymentSettled = order.paymentStatus === "LUNAS";
  const ELIGIBLE_STATUSES_FOR_RECEIVE = ["SIAP_KIRIM", "DALAM_PENGIRIMAN", "TERKIRIM_MENUNGGU_TTD"];
  // For PICKUP orders that go DIKONFIRMASI -> SELESAI without SIAP_KIRIM, also allow DIKONFIRMASI if payment settled
  const isFulfillmentEligible = ELIGIBLE_STATUSES_FOR_RECEIVE.includes(order.status) || (order.deliveryMethod === "PICKUP" && order.status === "DIKONFIRMASI" && isPaymentSettled);
  const canConfirmReceived = !isCancelled && !isCompleted && isPaymentSettled && isFulfillmentEligible;
  const confirmBlockReason = isCancelled || isCompleted
    ? null
    : !isPaymentSettled
      ? isCOD
        ? "Pembayaran COD belum dikonfirmasi kurir/admin. Tombol akan aktif setelah kurir verifikasi tunai di lokasi."
        : order.paymentStatus === "MENUNGGU_VALIDASI"
          ? "Pembayaran menunggu validasi admin. Tombol akan aktif setelah dana terverifikasi."
          : "Selesaikan pembayaran terlebih dahulu. Tombol akan aktif setelah status menjadi Lunas."
      : !isFulfillmentEligible
        ? "Pesanan belum siap dikirim. Menunggu admin memproses & mengirimkan pesanan."
        : null;

  const paymentStatusMap: Record<string, { label: string; bg: string; text: string; border: string }> = {
    BELUM_BAYAR: { label: "Belum Bayar", bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" },
    MENUNGGU_VALIDASI: { label: "Menunggu Validasi", bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200" },
    LUNAS: { label: "Lunas / Terverifikasi", bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200" },
    SEBAGIAN: { label: "Dibayar Sebagian", bg: "bg-slate-100", text: "text-slate-800", border: "border-slate-200" },
    DITOLAK: { label: "Bukti Ditolak", bg: "bg-rose-50", text: "text-rose-800", border: "border-rose-200" },
  };

  const currentPayMeta = paymentStatusMap[order.paymentStatus] || paymentStatusMap.BELUM_BAYAR;

  const bankAccounts = [
    {
      bank: "BANK BCA",
      number: "8830-1234-5678",
      rawNumber: "883012345678",
      holder: "a.n. PT Rizqi Mart Utama",
      branch: "KCP Mojokerto",
    },
    {
      bank: "BANK MANDIRI",
      number: "142-00-9876543-2",
      rawNumber: "1420098765432",
      holder: "a.n. PT Rizqi Mart Utama",
      branch: "KCP Mojokerto",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/70 pb-28 pt-4 sm:pb-20 sm:pt-6">
      <div className="mx-auto w-full max-w-5xl px-3.5 sm:px-6 space-y-5">
        
        {/* ── Breadcrumb & Top Bar ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-3.5">
          <div className="flex items-center gap-2 text-xs sm:text-sm">
            <Link
              href="/orders"
              className="inline-flex items-center gap-1.5 font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Pesanan Saya</span>
            </Link>
            <span className="text-slate-300">/</span>
            <span className="font-bold text-slate-900 truncate max-w-[140px] sm:max-w-none">
              {order.orderNumber}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchLatestOrder(true)}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors disabled:opacity-60"
              title="Perbarui Status Pesanan"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 text-slate-600 ${
                  isRefreshing ? "animate-spin text-slate-900" : ""
                }`}
              />
              <span className="hidden sm:inline">Perbarui</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
            >
              <Printer className="h-3.5 w-3.5 text-slate-500" />
              <span className="hidden sm:inline">Cetak Invoice</span>
            </button>

            <a
              href={`https://wa.me/6281234567890?text=${encodeURIComponent(
                `Halo Admin Rizqi Mart, saya ingin bertanya tentang pesanan: ${order.orderNumber}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800 shadow-xs hover:bg-emerald-100 transition-colors"
            >
              <MessageSquare className="h-3.5 w-3.5 text-emerald-600" />
              <span>Bantuan CS</span>
            </a>
          </div>
        </div>

        {/* ── Toast Alerts ── */}
        {actionSuccess && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs sm:text-sm font-semibold text-emerald-900 flex items-center justify-between shadow-xs animate-in fade-in duration-300">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button
              onClick={() => setActionSuccess("")}
              className="text-xs font-bold text-emerald-800 hover:underline ml-3"
            >
              Tutup
            </button>
          </div>
        )}

        {actionError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs sm:text-sm font-semibold text-rose-900 flex items-center justify-between shadow-xs animate-in fade-in duration-300">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="h-5 w-5 text-rose-600 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button
              onClick={() => setActionError("")}
              className="text-xs font-bold text-rose-800 hover:underline ml-3"
            >
              Tutup
            </button>
          </div>
        )}

        {/* ── HERO CARD: Order Overview (High Hierarchy & Contrast) ── */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Top Banner Bar */}
          <div className="bg-slate-900 px-4 sm:px-6 py-4 text-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                    No. Pesanan
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(order.orderNumber, "number")}
                    className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2 py-0.5 text-[11px] font-medium text-white hover:bg-white/20 transition-colors"
                    title="Salin nomor pesanan"
                  >
                    {copiedNumber ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-emerald-300 font-bold">Tersalin!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 text-slate-300" />
                        <span>Salin</span>
                      </>
                    )}
                  </button>
                </div>
                <h1 className="text-lg sm:text-2xl font-black font-mono tracking-tight text-white">
                  {order.orderNumber}
                </h1>
              </div>

              {/* Status Pill Badge with Live Pulse */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex items-center gap-2 rounded-xl bg-white/10 backdrop-blur-xs border border-white/20 px-3.5 py-2 text-xs sm:text-sm font-bold text-white shadow-xs">
                  {!isCancelled && !isCompleted && (
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400" />
                    </span>
                  )}
                  {isCompleted && <Sparkles className="h-4 w-4 text-emerald-300" />}
                  {isCancelled && <XCircle className="h-4 w-4 text-rose-300" />}
                  <span>{statusMeta.label}</span>
                </div>

                <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/30 px-3 py-2 text-xs sm:text-sm font-bold text-emerald-300">
                  <span>{currentPayMeta.label}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Meta Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-y sm:divide-y-0 divide-slate-100 bg-slate-50/60 p-3 sm:p-4 text-xs">
            <div className="p-2 space-y-0.5">
              <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block">
                Waktu Pemesanan
              </span>
              <span className="font-bold text-slate-800 block">
                {formatDateTime(order.createdAt)}
              </span>
            </div>

            <div className="p-2 space-y-0.5">
              <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block">
                Metode Pengiriman
              </span>
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                {order.deliveryMethod === "DELIVERY" ? (
                  <>
                    <Truck className="h-3.5 w-3.5 text-slate-600" />
                    <span>Kurir Toko Rizqi</span>
                  </>
                ) : (
                  <>
                    <Store className="h-3.5 w-3.5 text-slate-600" />
                    <span>Ambil di Toko</span>
                  </>
                )}
              </span>
            </div>

            <div className="p-2 space-y-0.5">
              <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block">
                Total Belanja
              </span>
              <span className="font-black text-slate-900 text-sm sm:text-base text-emerald-700">
                {formatPrice(order.totalAmount)}
              </span>
            </div>

            <div className="p-2 space-y-0.5">
              <span className="text-slate-400 font-bold uppercase text-[10px] tracking-wider block">
                Jumlah Barang
              </span>
              <span className="font-bold text-slate-800">
                {order.items.length} Macam Produk
              </span>
            </div>
          </div>
        </div>

        {/* ── STEPPER: Order Progress Tracking (Adaptive Mobile & Desktop) ── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-700" />
              <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700">
                Status Pelacakan Pesanan
              </h2>
            </div>
            <span className="text-xs font-semibold text-slate-500">
              {isCancelled ? "Status: Dibatalkan" : statusMeta.description}
            </span>
          </div>

          {isCancelled ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900 flex items-start gap-3">
              <XCircle className="h-5 w-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-sm text-rose-800">Pesanan Telah Dibatalkan</p>
                <p className="text-rose-700">
                  Transaksi untuk pesanan ini telah dihentikan. Anda dapat melakukan pemesanan ulang kapan saja.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Desktop / Tablet Stepper (>= sm) */}
              <div className="hidden sm:block pt-3 pb-2">
                <div className="relative flex items-center justify-between">
                  {/* Background Progress Bar */}
                  <div className="absolute left-6 right-6 top-[20px] -translate-y-1/2 h-1 bg-slate-100 rounded-full z-0" />
                  <div
                    className="absolute left-6 top-[20px] -translate-y-1/2 h-1 bg-slate-900 rounded-full transition-all duration-700 z-0"
                    style={{
                      width: `calc(${(Math.max(0, currentStep) / (ORDER_STEPS.length - 1)) * 100}% - 24px)`,
                    }}
                  />

                  {ORDER_STEPS.map((step, idx) => {
                    const isPassed = idx < currentStep;
                    const isCurrent = idx === currentStep;
                    const StepIcon = step.icon;

                    return (
                      <div key={idx} className="relative z-10 flex flex-col items-center flex-1">
                        <div
                          className={`flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 ${
                            isCurrent
                              ? "bg-slate-900 text-emerald-400 ring-4 ring-slate-900/15 shadow-md scale-110"
                              : isPassed
                              ? "bg-slate-900 text-white shadow-xs"
                              : "bg-slate-50 border border-slate-200 text-slate-400"
                          }`}
                        >
                          {isPassed ? (
                            <Check className="h-4 w-4 stroke-[3]" />
                          ) : (
                            <StepIcon className="h-4 w-4" />
                          )}
                        </div>

                        <span
                          className={`mt-2.5 text-xs font-bold text-center ${
                            isCurrent
                              ? "text-slate-900 font-extrabold"
                              : isPassed
                              ? "text-slate-800"
                              : "text-slate-400"
                          }`}
                        >
                          {step.label}
                        </span>
                        <span className="text-[10px] text-slate-400 text-center font-medium">
                          {step.desc}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Mobile Stepper Timeline (< sm, No Scroll Trap!) */}
              <div className="block sm:hidden space-y-3 pt-1">
                <div className="grid grid-cols-5 gap-1.5">
                  {ORDER_STEPS.map((step, idx) => {
                    const isPassed = idx < currentStep;
                    const isCurrent = idx === currentStep;
                    return (
                      <div key={idx} className="space-y-1">
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            isCurrent
                              ? "bg-emerald-500"
                              : isPassed
                              ? "bg-slate-900"
                              : "bg-slate-200"
                          }`}
                        />
                        <p
                          className={`text-[10px] font-bold text-center truncate ${
                            isCurrent
                              ? "text-slate-900"
                              : isPassed
                              ? "text-slate-700"
                              : "text-slate-400"
                          }`}
                        >
                          {step.label}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-3 flex items-center gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-emerald-400">
                    {(() => {
                      const StepIcon = (currentStep >= 0 && ORDER_STEPS[currentStep]) ? ORDER_STEPS[currentStep].icon : CheckCircle2;
                      return <StepIcon className="h-4 w-4" />;
                    })()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900">
                      {(currentStep >= 0 && ORDER_STEPS[currentStep]) ? ORDER_STEPS[currentStep].title : "Dalam Proses"}
                    </p>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      {statusMeta.description}
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── 2-COLUMN MAIN CONTENT ── */}
        <div className="grid gap-5 lg:grid-cols-3">
          
          {/* ── LEFT COLUMN: Items & Payment (Span 2) ── */}
          <div className="space-y-5 lg:col-span-2">
            
            {/* ── Payment Card (If Not Paid & Not Cancelled) ── */}
            {order.paymentStatus !== "LUNAS" && !isCancelled && (
              <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                {/* Header */}
                <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 sm:px-6 py-4">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white">
                      <Wallet className="h-4 w-4" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 leading-none">Instruksi Pembayaran</h3>
                      <p className="text-[11px] font-medium text-slate-500 leading-none mt-1">Transfer Bank • Konfirmasi Otomatis</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold border ${currentPayMeta.bg} ${currentPayMeta.text} ${currentPayMeta.border}`}>
                    <span className={`h-2 w-2 rounded-full ${order.paymentStatus === "MENUNGGU_VALIDASI" ? "bg-blue-500 animate-pulse" : order.paymentStatus === "BELUM_BAYAR" ? "bg-amber-500" : "bg-slate-400"}`} />
                    {currentPayMeta.label}
                  </span>
                </div>

                <div className="p-5 sm:p-6 space-y-5">
                  {/* Amount Due Hero */}
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 sm:p-5">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="space-y-1">
                        <p className="text-[11px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1.5">
                          <Info className="h-3.5 w-3.5" />
                          Total yang harus dibayar
                        </p>
                        <p className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
                          {formatPrice(order.totalAmount)}
                        </p>
                        <p className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                          <Copy className="h-3 w-3 text-slate-400" />
                          Salin nominal & transfer <span className="font-bold text-amber-700">tepat sesuai angka di atas</span> agar verifikasi otomatis.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(String(order.totalAmount), 99 as any)}
                        className="inline-flex h-fit shrink-0 items-center gap-1.5 rounded-xl border border-amber-200 bg-white px-3.5 py-2 text-xs font-bold text-amber-900 shadow-xs hover:bg-amber-50 transition-colors"
                      >
                        {copiedBankIndex === 99 ? <><Check className="h-3.5 w-3.5 text-emerald-600" /> Tersalin</> : <><Copy className="h-3.5 w-3.5" /> Salin Nominal</>}
                      </button>
                    </div>
                  </div>

                  {/* Bank Accounts — hidden for COD */}
                  {isCOD ? (
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white">
                        <Truck className="h-5 w-5" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-black text-emerald-900">Pesanan COD — Bayar Tunai ke Kurir</p>
                        <p className="text-xs font-medium leading-relaxed text-emerald-800">
                          Tidak perlu transfer. Siapkan uang pas <span className="font-black">{formatPrice(order.totalAmount)}</span> saat kurir Rizqi Mart tiba di alamat. Kurir akan verifikasi pembayaran dan admin akan ubah status menjadi <span className="font-bold">Lunas</span>.
                        </p>
                        <p className="text-[11px] font-medium text-emerald-700 flex items-center gap-1.5">
                          <Info className="h-3.5 w-3.5" />
                          Tombol “Konfirmasi Pesanan Selesai” baru aktif setelah kurir konfirmasi tunai.
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <p className="text-xs font-bold text-slate-800 mb-3 flex items-center gap-1.5">
                        <Landmark className="h-3.5 w-3.5 text-slate-500" />
                        Pilih rekening tujuan transfer
                      </p>
                      <div className="grid gap-3 sm:grid-cols-2">
                        {bankAccounts.map((b, idx) => (
                          <div
                            key={idx}
                            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xs hover:border-slate-300 hover:shadow-sm transition-all"
                          >
                            <div className="absolute right-0 top-0 h-16 w-16 -translate-y-4 translate-x-4 rounded-full bg-slate-50 group-hover:bg-slate-100 transition-colors" />
                            <div className="relative space-y-3">
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white text-[11px] font-black">
                                  {b.bank === "BANK BCA" ? "BCA" : "MDR"}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-black text-slate-900 leading-none">{b.bank}</p>
                                  <p className="text-[11px] font-medium text-slate-500 leading-none mt-1">{b.branch} • {b.holder}</p>
                                </div>
                              </div>
                              <div className="rounded-xl bg-slate-50 border border-slate-200 px-3 py-2.5 flex items-center justify-between gap-2">
                                <span className="font-mono text-[15px] sm:text-base font-black tracking-wide text-slate-900">{b.number}</span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(b.rawNumber, idx)}
                                  className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold transition-colors ${copiedBankIndex === idx ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-900 hover:text-white hover:border-slate-900"}`}
                                >
                                  {copiedBankIndex === idx ? <><Check className="h-3.5 w-3.5" /> Tersalin</> : <><Copy className="h-3.5 w-3.5" /> Salin</>}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <p className="mt-2.5 text-[11px] font-medium text-slate-500 flex items-start gap-1.5">
                        <Info className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                        <span>Simpan bukti transfer yang jelas (nama pengirim, nominal, tanggal) untuk mempercepat validasi admin.</span>
                      </p>
                    </div>
                  )}

                  {/* Upload Payment Proof — not for COD */}
                  {!isCOD && (
                  <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 sm:p-5 space-y-3.5">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white border border-slate-200 text-slate-700">
                          <Upload className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <p className="text-xs font-black text-slate-900 leading-none">Unggah Bukti Transfer</p>
                          <p className="text-[11px] font-medium text-slate-500 leading-none mt-1">Foto struk / screenshot m-banking</p>
                        </div>
                      </div>
                      <div className="inline-flex rounded-xl border border-slate-200 p-1 bg-white text-[11px] font-bold">
                        <button
                          type="button"
                          onClick={() => setUploadMode("file")}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${uploadMode === "file" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                        >
                          <ImageIcon className="h-3.5 w-3.5" />
                          Upload Foto
                        </button>
                        <button
                          type="button"
                          onClick={() => setUploadMode("link")}
                          className={`px-3 py-1.5 rounded-lg transition-all ${uploadMode === "link" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:text-slate-900"}`}
                        >
                          Tempel Link
                        </button>
                      </div>
                    </div>

                    <form onSubmit={handleUploadPaymentProof} className="space-y-3">
                      {uploadMode === "file" ? (
                        <div>
                          <input
                            ref={fileInputRef}
                            id="payment-proof-file"
                            type="file"
                            accept="image/*"
                            onChange={handleFileChange}
                            className="sr-only"
                          />
                          {proofPreview ? (
                            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                              <div className="flex items-center gap-3 p-3">
                                <button
                                  type="button"
                                  onClick={() => setIsPreviewOpen(true)}
                                  className="group relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 hover:border-slate-300 hover:shadow-sm transition-all cursor-zoom-in"
                                  title="Klik untuk perbesar"
                                >
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={proofPreview} alt="Bukti Transfer" className="h-full w-full object-cover" />
                                  <span className="absolute inset-0 flex items-center justify-center bg-slate-900/0 group-hover:bg-slate-900/30 transition-colors">
                                    <ZoomIn className="h-5 w-5 text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                                  </span>
                                </button>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-black text-slate-900">Foto siap dikirim {proofFile ? `• ${(proofFile.size/1024).toFixed(0)}KB` : ""}</p>
                                  <p className="text-[11px] font-medium text-emerald-600 flex items-center gap-1"><Check className="h-3 w-3" /> Akan dikirim ke admin untuk validasi</p>
                                  {proofFile && <p className="text-[10px] text-slate-500 truncate">{proofFile.name}</p>}
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (proofPreview && proofPreview.startsWith("blob:")) URL.revokeObjectURL(proofPreview);
                                    setProofPreview(null);
                                    setProofUrl("");
                                    setProofFile(null);
                                    if (fileInputRef.current) fileInputRef.current.value = "";
                                  }}
                                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-white"
                                >
                                  Ganti
                                </button>
                              </div>
                              <div className="border-t border-slate-100 bg-slate-50 px-3 py-2 text-[11px] font-medium text-slate-500">
                                Tip: Pastikan nominal, tanggal & nama pengirim terlihat jelas.
                              </div>
                            </div>
                          ) : (
                            <label
                              htmlFor="payment-proof-file"
                              onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("border-slate-900", "bg-slate-50"); }}
                              onDragLeave={(e) => { e.currentTarget.classList.remove("border-slate-900", "bg-slate-50"); }}
                              onDrop={(e) => {
                                e.preventDefault();
                                e.currentTarget.classList.remove("border-slate-900", "bg-slate-50");
                                const file = e.dataTransfer.files?.[0];
                                if (file) {
                                  const mockEvent = { target: { files: [file], value: "" } } as unknown as React.ChangeEvent<HTMLInputElement>;
                                  handleFileChange(mockEvent);
                                }
                              }}
                              className="group flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-white p-6 text-center hover:border-slate-400 hover:bg-slate-50 transition-colors"
                            >
                              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-900 text-white group-hover:scale-105 transition-transform">
                                <Upload className="h-5 w-5" />
                              </div>
                              <span className="text-sm font-black text-slate-900">Klik untuk pilih foto bukti transfer</span>
                              <span className="text-xs font-medium text-slate-500">Seret & lepas file di sini • JPG, PNG, WebP • Maks 10MB</span>
                              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">
                                <ImageIcon className="h-3.5 w-3.5" /> Pilih dari Galeri / Kamera
                              </span>
                            </label>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <div className="relative">
                            <input
                              type="url"
                              value={proofUrl}
                              onChange={(e) => {
                                setProofUrl(e.target.value);
                                setProofPreview(e.target.value.startsWith("http") ? e.target.value : null);
                              }}
                              placeholder="https://drive.google.com/... atau link gambar bukti"
                              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 pr-10 text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:outline-hidden focus:ring-2 focus:ring-slate-900/10"
                            />
                            <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                              <ImageIcon className="h-4 w-4" />
                            </div>
                          </div>
                          {proofPreview && proofPreview.startsWith("http") && (
                            <div className="rounded-xl border border-slate-200 bg-white p-2.5 flex items-center gap-3">
                              <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={proofPreview} alt="preview" className="h-full w-full object-cover" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
                              </div>
                              <p className="text-xs font-bold text-emerald-700 flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Link valid & pratinjau dimuat</p>
                            </div>
                          )}
                          <p className="text-[11px] font-medium text-slate-500">
                            Gunakan link publik (Google Drive dengan akses Anyone / Imgur / dll). Pastikan dapat dibuka admin.
                          </p>
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isUploadingProof || (uploadMode === "file" ? !proofFile : !proofUrl.trim())}
                        className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-sm font-black text-white shadow-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {isUploadingProof ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            <span>Mengirim Bukti...</span>
                          </>
                        ) : (
                          <>
                            <Upload className="h-4 w-4" />
                            <span>Kirim Bukti Pembayaran</span>
                          </>
                        )}
                      </button>
                    </form>
                  </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Order Items List ── */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              {/* Header */}
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 sm:px-6 py-4">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white">
                    <ShoppingBag className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 leading-none">Rincian Barang Belanja</h3>
                    <p className="text-[11px] font-medium text-slate-500 leading-none mt-1">{order.items.length} macam produk • Periksa jumlah & harga sebelum konfirmasi</p>
                  </div>
                </div>
                <span className="hidden sm:inline-flex items-center rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700">
                  {order.items.length} item
                </span>
              </div>

              {/* Table Head - Desktop only */}
              <div className="hidden sm:grid grid-cols-[1fr_110px_130px_120px] gap-3 border-b border-slate-100 bg-slate-50 px-6 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <span>Produk</span>
                <span className="text-right">Harga Satuan</span>
                <span className="text-center">Jumlah</span>
                <span className="text-right">Subtotal</span>
              </div>

              {/* Items */}
              <div className="divide-y divide-slate-100">
                {order.items.map((item) => {
                  const price = Number(item.unitSellPrice) || 0;
                  const qty = Number(item.qty) || 0;
                  const subtotal = Number(item.subtotalSell) || price * qty;

                  return (
                    <div
                      key={item.id}
                      className="group p-4 sm:px-6 sm:py-4 hover:bg-slate-50/50 transition-colors"
                    >
                      {/* Mobile layout */}
                      <div className="flex gap-3.5 sm:hidden">
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center">
                          {item.product?.imageUrl ? (
                            <Image
                              src={item.product.imageUrl}
                              alt={item.product.name}
                              width={80}
                              height={80}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Package className="h-7 w-7 text-slate-300" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <Link
                            href={`/products/${item.product?.id}`}
                            className="block text-[13px] font-bold leading-snug text-slate-900 line-clamp-2 group-hover:text-slate-700"
                          >
                            {item.product?.name}
                          </Link>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600">
                              {item.product?.sku}
                            </span>
                            <span className="rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                              {item.unit?.name}
                            </span>
                          </div>
                          <div className="flex items-end justify-between pt-1">
                            <div className="space-y-0.5">
                              <p className="text-[11px] font-medium text-slate-500">{formatPrice(price)} / {item.unit?.name}</p>
                              <p className="text-xs font-bold text-slate-900">
                                <span className="inline-flex items-center rounded-md border border-slate-200 bg-white px-1.5 py-0.5 text-xs font-black text-slate-900">{qty} ×</span>
                                <span className="ml-1.5">{formatPrice(price)}</span>
                              </p>
                            </div>
                            <p className="text-sm font-black text-slate-900">{formatPrice(subtotal)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Desktop grid layout */}
                      <div className="hidden sm:grid grid-cols-[1fr_110px_130px_120px] items-center gap-3">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center">
                            {item.product?.imageUrl ? (
                              <Image
                                src={item.product.imageUrl}
                                alt={item.product.name}
                                width={56}
                                height={56}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Package className="h-6 w-6 text-slate-300" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/products/${item.product?.id}`}
                              className="block text-sm font-bold leading-snug text-slate-900 line-clamp-2 group-hover:text-slate-700"
                            >
                              {item.product?.name}
                            </Link>
                            <div className="mt-1 flex items-center gap-1.5">
                              <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-600">
                                {item.product?.sku}
                              </span>
                              <span className="text-[11px] text-slate-400">•</span>
                              <span className="text-[11px] font-semibold text-slate-500">{item.unit?.name}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-700">{formatPrice(price)}</p>
                          <p className="text-[11px] font-medium text-slate-400">per {item.unit?.name}</p>
                        </div>
                        <div className="flex justify-center">
                          <span className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-900 shadow-xs">
                            {qty} {item.unit?.name}
                          </span>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-slate-900">{formatPrice(subtotal)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Financial Breakdown - More readable */}
              <div className="border-t border-slate-200 bg-slate-50 p-4 sm:p-5">
                <div className="mx-auto max-w-md sm:ml-auto sm:mr-0 space-y-2.5">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-slate-600">Subtotal Produk</span>
                    <span className="font-bold text-slate-900">{formatPrice(order.subtotal)}</span>
                  </div>

                  {Number(order.discountAmount || 0) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="font-medium text-emerald-700 flex items-center gap-1.5">
                        <Sparkles className="h-3.5 w-3.5" />
                        Potongan Diskon / Promo
                      </span>
                      <span className="font-black text-emerald-700">− {formatPrice(order.discountAmount || 0)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm">
                    <span className="font-medium text-slate-600 flex items-center gap-1.5">
                      <Truck className="h-3.5 w-3.5 text-slate-500" />
                      Ongkos Kirim
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-black text-emerald-700">
                      <Check className="h-3 w-3" />
                      GRATIS • Mojokerto
                    </span>
                  </div>

                  <div className="my-3 border-t border-dashed border-slate-300" />

                  <div className="flex items-center justify-between gap-4 rounded-2xl bg-slate-900 px-4 py-3.5 text-white shadow-sm">
                    <div className="space-y-0.5">
                      <p className="text-xs font-bold uppercase tracking-wider text-slate-300">Total Tagihan</p>
                      <p className="text-[11px] font-medium text-slate-400">Sudah termasuk kemasan & penanganan</p>
                    </div>
                    <p className="text-xl sm:text-2xl font-black tracking-tight">{formatPrice(order.totalAmount)}</p>
                  </div>

                  <p className="text-center text-[11px] font-medium text-slate-500">
                    Pembayaran diverifikasi admin • Hubungi CS jika nominal tidak sesuai.
                  </p>
                </div>
              </div>
            </div>

            {/* ── Status History Log (Collapsible) ── */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm space-y-3">
              <button
                type="button"
                onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                className="w-full flex items-center justify-between text-left cursor-pointer"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-slate-700" />
                  <h3 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-700">
                    Riwayat Perubahan Status Log
                  </h3>
                </div>
                <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                  <span>{isHistoryExpanded ? "Sembunyikan" : "Lihat Semua"}</span>
                  {isHistoryExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </button>

              {isHistoryExpanded && (
                <div className="border-t border-slate-100 pt-3">
                  <div className="relative border-l-2 border-slate-200 ml-3 space-y-4 pl-4 pt-1">
                    {order.statusHistory && order.statusHistory.length > 0 ? (
                      order.statusHistory.map((h, i) => {
                        const st = statusConfig[h.toStatus] || statusConfig.DRAFT;
                        return (
                          <div key={i} className="relative">
                            <span className="absolute -left-[23px] top-1 flex h-3 w-3 items-center justify-center rounded-full bg-slate-900 ring-4 ring-white">
                              <span className="h-1 w-1 rounded-full bg-white" />
                            </span>
                            <div className="space-y-0.5">
                              <div className="text-xs font-bold text-slate-900">
                                {st.label}
                              </div>
                              {h.note && (
                                <p className="text-xs text-slate-600 leading-relaxed">
                                  {h.note}
                                </p>
                              )}
                              <time className="text-[10px] text-slate-400 font-semibold block pt-0.5">
                                {formatDateTime(h.changedAt)}
                              </time>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="relative">
                        <span className="absolute -left-[23px] top-1 flex h-3 w-3 items-center justify-center rounded-full bg-slate-900 ring-4 ring-white">
                          <span className="h-1 w-1 rounded-full bg-white" />
                        </span>
                        <div className="space-y-0.5">
                          <div className="text-xs font-bold text-slate-900">
                            {statusMeta.label}
                          </div>
                          <p className="text-xs text-slate-600">Pesanan telah dicatat dalam sistem.</p>
                          <time className="text-[10px] text-slate-400 font-semibold block pt-0.5">
                            {formatDateTime(order.createdAt)}
                          </time>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT COLUMN: Customer, Address & Actions (Span 1) ── */}
          <div className="space-y-5 lg:col-span-1">
            
            {/* ── Recipient / Buyer Card ── */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <Building2 className="h-4 w-4 text-slate-700" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Data Penerima
                </h3>
              </div>

              <div className="space-y-2.5 text-xs sm:text-sm">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                    Nama Pemesan
                  </span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {order.customer?.name || "Pelanggan Retail"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                    Nomor Kontak / WhatsApp
                  </span>
                  <span className="font-bold text-slate-800">
                    {order.customer?.phone || "-"}
                  </span>
                </div>

                {order.customer?.email && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">
                      Email
                    </span>
                    <span className="font-medium text-slate-700">
                      {order.customer.email}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* ── Shipping Destination Card ── */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                <MapPin className="h-4 w-4 text-slate-700" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Alamat Pengiriman
                </h3>
              </div>

              <div className="space-y-2 text-xs sm:text-sm">
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-800 border border-slate-200">
                  {order.deliveryMethod === "DELIVERY" ? (
                    <>
                      <Truck className="h-3.5 w-3.5 text-slate-700" />
                      <span>Kurir Toko Rizqi Mart</span>
                    </>
                  ) : (
                    <>
                      <Store className="h-3.5 w-3.5 text-slate-700" />
                      <span>Ambil Mandiri di Toko</span>
                    </>
                  )}
                </div>

                {order.deliveryMethod === "DELIVERY" && (
                  <p className="text-slate-700 font-medium leading-relaxed pt-1">
                    {order.deliveryAddressText || "Alamat tercatat di sistem Toko Rizqi Mart."}
                  </p>
                )}
              </div>
            </div>

            {/* ── Primary Action Panel (Desktop View) ── */}
            <div className="hidden sm:block rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2.5">
                Aksi Pesanan
              </h3>

              <div className="space-y-2.5">
                {/* Complete Order Button — gated by LUNAS + eligible fulfillment (COD requires admin LUNAS) */}
                {!isCancelled && !isCompleted && (
                  <>
                    {canConfirmReceived ? (
                      <button
                        type="button"
                        onClick={() => setIsReceiveModalOpen(true)}
                        className="w-full rounded-xl bg-slate-900 py-3 text-xs sm:text-sm font-black text-white hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                      >
                        <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                        <span>Konfirmasi Pesanan Selesai</span>
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <button
                          type="button"
                          disabled
                          title={confirmBlockReason || "Belum dapat dikonfirmasi"}
                          className="w-full rounded-xl bg-slate-200 py-3 text-xs sm:text-sm font-black text-slate-500 flex items-center justify-center gap-2 cursor-not-allowed border border-slate-200"
                        >
                          <Clock className="h-4 w-4 text-slate-400" />
                          <span>Konfirmasi Pesanan Selesai</span>
                        </button>
                        {confirmBlockReason && (
                          <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-semibold leading-relaxed text-amber-900 flex items-start gap-1.5">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-600 shrink-0 mt-0.5" />
                            <span>{confirmBlockReason}</span>
                          </p>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* Re-order (Beli Lagi) Button */}
                {(isCompleted || isCancelled) && (
                  <button
                    type="button"
                    onClick={handleBuyAgain}
                    className="w-full rounded-xl bg-slate-900 py-3 text-xs sm:text-sm font-black text-white hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                  >
                    <RotateCcw className="h-4 w-4 text-emerald-400" />
                    <span>Beli Lagi Barang Ini</span>
                  </button>
                )}

                {/* Cancel Order Button */}
                {!isCancelled && !isCompleted && (order.status === "DRAFT" || order.status === "MENUNGGU_KONFIRMASI") && (
                  <button
                    type="button"
                    onClick={() => setIsCancelModalOpen(true)}
                    className="w-full rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <XCircle className="h-4 w-4 text-rose-600" />
                    <span>Batalkan Pesanan Ini</span>
                  </button>
                )}

                {/* WhatsApp CS Button */}
                <a
                  href={`https://wa.me/6281234567890?text=${encodeURIComponent(
                    `Halo Admin Rizqi Mart, saya ingin bertanya tentang pesanan: ${order.orderNumber}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
                >
                  <MessageSquare className="h-4 w-4 text-slate-600" />
                  <span>Hubungi Penjual via WA</span>
                </a>
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* ── MOBILE STICKY BOTTOM ACTION BAR ── */}
      <div className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 shadow-lg">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
              Total Pembayaran
            </span>
            <span className="text-sm font-black text-slate-900">
              {formatPrice(order.totalAmount)}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!isCancelled && !isCompleted && (
              <>
                {canConfirmReceived ? (
                  <button
                    type="button"
                    onClick={() => setIsReceiveModalOpen(true)}
                    className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white shadow-xs hover:bg-slate-800 flex items-center gap-1.5"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>Terima Pesanan</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled
                    title={confirmBlockReason || "Belum dapat dikonfirmasi"}
                    className="rounded-xl bg-slate-200 px-4 py-2.5 text-xs font-black text-slate-500 border border-slate-200 flex items-center gap-1.5 cursor-not-allowed"
                  >
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span>Terima</span>
                  </button>
                )}
              </>
            )}

            {(isCompleted || isCancelled) && (
              <button
                type="button"
                onClick={handleBuyAgain}
                className="rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-black text-white shadow-xs hover:bg-slate-800 flex items-center gap-1.5"
              >
                <RotateCcw className="h-4 w-4 text-emerald-400" />
                <span>Beli Lagi</span>
              </button>
            )}

            <a
              href={`https://wa.me/6281234567890?text=${encodeURIComponent(
                `Halo Admin Rizqi Mart, saya ingin bertanya tentang pesanan: ${order.orderNumber}`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-slate-700"
              title="Hubungi CS"
            >
              <MessageSquare className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>

      {/* ── MODAL: Confirm Receive Order ── */}
      {isReceiveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-slate-900">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shrink-0">
                <CheckCircle2 className="h-7 w-7 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Konfirmasi Pesanan Diterima?
                </h3>
                <p className="text-xs text-slate-500">
                  Pastikan semua barang belanjaan telah sampai dan sesuai sebelum mengonfirmasi.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setIsReceiveModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmittingAction}
                onClick={() => handlePerformAction("MARK_RECEIVED")}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-black text-white hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-xs"
              >
                {isSubmittingAction && (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                )}
                Ya, Pesanan Diterima
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Cancel Order ── */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 shrink-0">
                <AlertTriangle className="h-7 w-7" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">
                  Batalkan Pesanan Ini?
                </h3>
                <p className="text-xs text-slate-500">
                  Pesanan nomor <strong className="font-mono text-slate-800">{order.orderNumber}</strong> akan dibatalkan secara permanen.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Kembali
              </button>
              <button
                type="button"
                disabled={isSubmittingAction}
                onClick={() => handlePerformAction("CANCEL")}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-black text-white hover:bg-rose-700 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-xs"
              >
                {isSubmittingAction && (
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                )}
                Ya, Batalkan Pesanan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Preview Bukti Transfer (smooth) ── */}
      {isPreviewOpen && proofPreview && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-200"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw] overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative bg-slate-100 flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={proofPreview}
                alt="Preview Bukti Transfer"
                className="max-h-[75vh] max-w-[90vw] object-contain"
              />
              <button
                type="button"
                onClick={() => setIsPreviewOpen(false)}
                className="absolute right-3 top-3 rounded-full bg-slate-900/80 p-2.5 text-white backdrop-blur-sm hover:bg-slate-900 transition-colors shadow-lg"
                title="Tutup preview"
              >
                <X className="h-5 w-5" />
              </button>
              <span className="absolute bottom-3 left-3 rounded-full bg-slate-900/80 px-3 py-1 text-xs font-bold text-white backdrop-blur-sm">
                <ZoomIn className="mr-1 inline h-3.5 w-3.5" />
                Preview • Klik di luar untuk tutup
              </span>
            </div>
            <div className="border-t bg-white p-4">
              <p className="text-sm font-black text-slate-900 truncate">{proofFile?.name || "Bukti Transfer"}</p>
              <p className="text-xs font-medium text-slate-500">
                {proofFile ? `${(proofFile.size / 1024).toFixed(0)}KB • ` : ""}
                {proofFile?.type || "image"} • Maks 10MB
              </p>
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsPreviewOpen(false)}
                  className="flex-1 rounded-xl border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsPreviewOpen(false);
                    setProofPreview(null);
                    setProofUrl("");
                    setProofFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="flex-1 rounded-xl bg-slate-900 py-2.5 text-xs font-black text-white hover:bg-slate-800 transition-colors"
                >
                  Ganti Foto
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
