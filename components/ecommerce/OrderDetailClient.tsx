"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowLeft,
  Package,
  MapPin,
  CreditCard,
  Clock,
  CheckCircle2,
  Phone,
  XCircle,
  Copy,
  Check,
  Printer,
  RefreshCw,
  Upload,
  ChevronRight,
  Truck,
  Store,
  Building2,
  FileText,
  ShieldCheck,
  Sparkles,
  AlertTriangle,
  MessageSquare,
} from "lucide-react";

// ─── Types ───

type OrderItem = {
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

type StatusHistory = {
  id?: string;
  fromStatus?: string | null;
  toStatus: string;
  changedAt: string | Date;
  note?: string | null;
};

type Payment = {
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

// ─── Status Config (Unified Clean Slate Theme - No Rainbow Colors) ───

const statusConfig: Record<
  string,
  { label: string; bg: string; text: string; border: string; desc: string }
> = {
  DRAFT: {
    label: "Draft",
    bg: "bg-slate-100",
    text: "text-slate-800",
    border: "border-slate-200",
    desc: "Pesanan baru dibuat dan belum dikonfirmasi.",
  },
  MENUNGGU_KONFIRMASI: {
    label: "Menunggu Konfirmasi",
    bg: "bg-slate-900",
    text: "text-white",
    border: "border-slate-900",
    desc: "Pesanan Anda sedang diverifikasi oleh admin toko.",
  },
  DIKONFIRMASI: {
    label: "Pesanan Dikonfirmasi",
    bg: "bg-slate-900",
    text: "text-white",
    border: "border-slate-900",
    desc: "Pesanan telah dikonfirmasi dan sedang disiapkan.",
  },
  SIAP_KIRIM: {
    label: "Siap Dikirim / Dikemas",
    bg: "bg-slate-900",
    text: "text-white",
    border: "border-slate-900",
    desc: "Barang sudah rapi dikemas dan siap diantar kurir.",
  },
  DALAM_PENGIRIMAN: {
    label: "Dalam Pengiriman",
    bg: "bg-slate-900",
    text: "text-white",
    border: "border-slate-900",
    desc: "Kurir toko Rizqi Mart sedang menuju lokasi Anda.",
  },
  TERKIRIM_MENUNGGU_TTD: {
    label: "Terkirim",
    bg: "bg-slate-900",
    text: "text-white",
    border: "border-slate-900",
    desc: "Pesanan tiba di lokasi tujuan.",
  },
  SELESAI: {
    label: "Pesanan Selesai",
    bg: "bg-emerald-50",
    text: "text-emerald-800",
    border: "border-emerald-200",
    desc: "Pesanan telah selesai dan diterima dengan baik.",
  },
  DIBATALKAN: {
    label: "Pesanan Dibatalkan",
    bg: "bg-rose-50",
    text: "text-rose-800",
    border: "border-rose-200",
    desc: "Pesanan ini telah dibatalkan.",
  },
};

const WORKFLOW_STEPS = [
  { key: "DRAFT", label: "Dibuat", icon: FileText, desc: "Pesanan dibuat" },
  { key: "MENUNGGU_KONFIRMASI", label: "Verifikasi", icon: ShieldCheck, desc: "Verifikasi admin" },
  { key: "DIKONFIRMASI", label: "Dikonfirmasi", icon: CheckCircle2, desc: "Pesanan disetujui" },
  { key: "SIAP_KIRIM", label: "Dikemas", icon: Package, desc: "Siap dikirim" },
  { key: "DALAM_PENGIRIMAN", label: "Dikirim", icon: Truck, desc: "Kurir menuju lokasi" },
  { key: "SELESAI", label: "Selesai", icon: Sparkles, desc: "Pesanan diterima" },
];

function getStepIndex(status: string): number {
  switch (status) {
    case "DRAFT":
      return 0;
    case "MENUNGGU_KONFIRMASI":
      return 1;
    case "DIKONFIRMASI":
      return 2;
    case "MENUNGGU_PENGADAAN":
    case "SIAP_KIRIM":
      return 3;
    case "DALAM_PENGIRIMAN":
    case "TERKIRIM_MENUNGGU_TTD":
      return 4;
    case "SELESAI":
      return 5;
    default:
      return 0;
  }
}

export default function OrderDetailClient({
  initialOrder,
}: {
  initialOrder: OrderDetailData;
}) {
  const [order, setOrder] = useState<OrderDetailData>(initialOrder);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [copiedNumber, setCopiedNumber] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);

  // Modal / Action states
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);
  const [actionError, setActionError] = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  // Payment proof state
  const [proofUrl, setProofUrl] = useState("");
  const [isUploadingProof, setIsUploadingProof] = useState(false);

  // Real-time polling
  const fetchLatestOrder = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch(`/api/ecommerce/orders/${initialOrder.id}`);
      if (res.ok) {
        const json = await res.json();
        if (json.data) {
          setOrder(json.data);
        }
      }
    } catch (err) {
      console.error("Failed to refresh order status", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [initialOrder.id]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchLatestOrder();
    }, 12000);
    return () => clearInterval(interval);
  }, [fetchLatestOrder]);

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

  const copyToClipboard = (text: string, type: "number" | "bank") => {
    navigator.clipboard.writeText(text);
    if (type === "number") {
      setCopiedNumber(true);
      setTimeout(() => setCopiedNumber(false), 2000);
    } else {
      setCopiedBank(true);
      setTimeout(() => setCopiedBank(false), 2000);
    }
  };

  // Perform Cancel or Mark Received
  const handlePerformAction = async (action: "CANCEL" | "MARK_RECEIVED") => {
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
      await fetchLatestOrder();

      if (action === "CANCEL") setIsCancelModalOpen(false);
      if (action === "MARK_RECEIVED") setIsReceiveModalOpen(false);
    } catch (err: any) {
      setActionError(err.message || "Terjadi kesalahan");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Handle Payment Proof Submit
  const handleUploadPaymentProof = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proofUrl.trim()) return;

    setIsUploadingProof(true);
    setActionError("");
    setActionSuccess("");

    try {
      const res = await fetch(`/api/ecommerce/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "UPLOAD_PAYMENT_PROOF",
          proofUrl: proofUrl.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Gagal mengunggah bukti pembayaran");
      }

      setActionSuccess(json.message || "Bukti pembayaran telah dikirim");
      setProofUrl("");
      await fetchLatestOrder();
    } catch (err: any) {
      setActionError(err.message || "Terjadi kesalahan");
    } finally {
      setIsUploadingProof(false);
    }
  };

  const statusMeta = statusConfig[order.status] || statusConfig.DRAFT;
  const isCancelled = order.status === "DIBATALKAN";
  const currentStepIdx = getStepIndex(order.status);
  const primaryPayment = order.payments && order.payments[0];

  const paymentMethodLabel = primaryPayment
    ? primaryPayment.method === "TRANSFER_BANK"
      ? "Transfer Bank BCA / Mandiri"
      : primaryPayment.method === "QRIS"
      ? "QRIS Pembayaran Digital"
      : "Cash on Delivery (COD)"
    : "Transfer Bank / COD";

  return (
    <div className="min-h-screen bg-slate-50/60 pb-16 pt-6">
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
          <Link
            href="/orders"
            className="inline-flex items-center gap-2 rounded-xl bg-white border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-all shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Kembali ke Pesanan Saya</span>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={fetchLatestOrder}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors shadow-sm"
              title="Perbarui Status Real-time"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 text-slate-600 ${
                  isRefreshing ? "animate-spin" : ""
                }`}
              />
              <span className="hidden sm:inline">Refresh Realtime</span>
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors shadow-sm"
            >
              <Printer className="h-3.5 w-3.5 text-slate-500" />
              <span className="hidden sm:inline">Cetak Invoice</span>
            </button>
          </div>
        </div>

        {/* Action alerts */}
        {actionSuccess && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-900 flex items-center justify-between shadow-sm">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              {actionSuccess}
            </span>
            <button
              onClick={() => setActionSuccess("")}
              className="text-emerald-800 hover:underline"
            >
              Tutup
            </button>
          </div>
        )}

        {actionError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-900 flex items-center justify-between shadow-sm">
            <span className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-rose-600" />
              {actionError}
            </span>
            <button
              onClick={() => setActionError("")}
              className="text-rose-800 hover:underline"
            >
              Tutup
            </button>
          </div>
        )}

        {/* ── Top Header Card (Clean Slate Theme) ── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-wider block">
                Nomor Pesanan
              </span>
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 font-mono">
                  {order.orderNumber}
                </h1>
                <button
                  type="button"
                  onClick={() => copyToClipboard(order.orderNumber, "number")}
                  className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  title="Salin Nomor Pesanan"
                >
                  {copiedNumber ? (
                    <Check className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>
              </div>
              <p className="text-xs font-medium text-slate-500">
                Dipesan pada {formatDateTime(order.createdAt)} • {statusMeta.desc}
              </p>
            </div>

            {/* Status Pill Badge */}
            <div className="shrink-0 space-y-1.5">
              <div
                className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold shadow-xs ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}
              >
                {!isCancelled && order.status !== "SELESAI" && (
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                )}
                <span>{statusMeta.label}</span>
              </div>
              <div className="text-[11px] font-semibold text-slate-500 block">
                Metode:{" "}
                <span className="text-slate-900 font-bold">
                  {order.deliveryMethod === "DELIVERY"
                    ? "Kurir Toko Rizqi Mart"
                    : "Ambil di Toko Pusat"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Progress Stepper ── */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2">
              <Clock className="h-4 w-4 text-slate-700" />
              <span>Progres Pelacakan Pesanan</span>
            </h2>
            <span className="text-[11px] font-bold text-slate-400">
              {isCancelled ? "Status: Dibatalkan" : `Tahap ${currentStepIdx + 1} dari 6`}
            </span>
          </div>

          {!isCancelled ? (
            <div className="py-3 overflow-x-auto">
              <div className="min-w-[600px] px-2">
                <div className="relative flex items-center justify-between">
                  {/* Progress Line */}
                  <div className="absolute left-6 right-6 top-[20px] -translate-y-1/2 h-1 bg-slate-100 rounded-full z-0" />
                  <div
                    className="absolute left-6 top-[20px] -translate-y-1/2 h-1 bg-slate-900 rounded-full transition-all duration-700 z-0"
                    style={{
                      width: `calc(${(currentStepIdx / (WORKFLOW_STEPS.length - 1)) * 100}% - 24px)`,
                    }}
                  />

                  {/* Steps */}
                  {WORKFLOW_STEPS.map((step, idx) => {
                    const isPassed = idx < currentStepIdx;
                    const isCurrent = idx === currentStepIdx;
                    const StepIcon = step.icon;

                    return (
                      <div
                        key={step.key}
                        className="relative z-10 flex flex-col items-center group"
                      >
                        <div
                          className={`relative flex h-10 w-10 items-center justify-center rounded-xl transition-all duration-300 ${
                            isCurrent
                              ? "bg-slate-900 text-emerald-400 ring-4 ring-slate-900/15 shadow-md scale-110"
                              : isPassed
                              ? "bg-slate-900 text-white shadow-xs"
                              : "bg-slate-50 border border-slate-200 text-slate-400"
                          }`}
                        >
                          <StepIcon className={`h-4 w-4 ${isCurrent ? "stroke-[2.2]" : "stroke-[1.8]"}`} />
                          
                          {/* Small Check indicator for passed steps */}
                          {isPassed && (
                            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500 text-white ring-2 ring-white">
                              <Check className="h-2.5 w-2.5 stroke-[3]" />
                            </span>
                          )}

                          {/* Active Pulsing Indicator */}
                          {isCurrent && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 ring-2 ring-white" />
                            </span>
                          )}
                        </div>

                        <span
                          className={`mt-2 text-[11px] font-extrabold transition-colors ${
                            isCurrent
                              ? "text-slate-900"
                              : isPassed
                              ? "text-slate-800"
                              : "text-slate-400"
                          }`}
                        >
                          {step.label}
                        </span>
                        <span className="text-[9px] text-slate-400 font-medium hidden sm:block">
                          {step.desc}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-xs text-rose-900 space-y-1">
              <div className="font-bold flex items-center gap-2 text-rose-800">
                <XCircle className="h-4 w-4" />
                <span>Pesanan telah dibatalkan</span>
              </div>
              <p className="text-rose-700/80">
                Proses transaksi untuk nomor pesanan ini telah dihentikan.
              </p>
            </div>
          )}
        </div>

        {/* ── Main 2-Column Grid ── */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Left Column (Items + Timeline) */}
          <div className="space-y-6 lg:col-span-2">
            {/* Payment Proof / Upload Card */}
            {order.paymentStatus !== "LUNAS" && !isCancelled && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5 text-slate-700" />
                    <h3 className="text-sm font-extrabold text-slate-900">
                      Konfirmasi Pembayaran ({paymentMethodLabel})
                    </h3>
                  </div>
                  <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-800 border border-slate-200">
                    {order.paymentStatus === "MENUNGGU_VALIDASI"
                      ? "Menunggu Validasi Admin"
                      : "Belum Dibayar"}
                  </span>
                </div>

                {/* Bank details info */}
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-3 text-xs">
                  <div className="text-slate-600 font-medium">
                    Silakan lakukan transfer sebesar{" "}
                    <strong className="text-slate-900 font-extrabold text-sm">
                      {formatPrice(order.totalAmount)}
                    </strong>{" "}
                    ke rekening resmi toko:
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        <span>BANK BCA</span>
                        <span>Mojokerto</span>
                      </div>
                      <div className="flex items-center justify-between font-mono font-extrabold text-sm text-slate-900">
                        <span>8830-1234-5678</span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard("883012345678", "bank")}
                          className="text-xs text-slate-900 hover:underline font-sans font-bold"
                        >
                          {copiedBank ? "Tersalin!" : "Salin"}
                        </button>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        a.n. PT Rizqi Mart Utama
                      </div>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-1">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        <span>BANK MANDIRI</span>
                        <span>Mojokerto</span>
                      </div>
                      <div className="flex items-center justify-between font-mono font-extrabold text-sm text-slate-900">
                        <span>142-00-9876543-2</span>
                      </div>
                      <div className="text-[11px] text-slate-500">
                        a.n. PT Rizqi Mart Utama
                      </div>
                    </div>
                  </div>
                </div>

                {/* Upload proof form */}
                {order.paymentStatus === "BELUM_BAYAR" && (
                  <form onSubmit={handleUploadPaymentProof} className="space-y-2.5 pt-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Unggah Bukti Transfer / Resi Pembayaran
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={proofUrl}
                        onChange={(e) => setProofUrl(e.target.value)}
                        placeholder="Tempelkan link foto / gambar bukti transfer..."
                        className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-900 focus:border-slate-800 focus:bg-white focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={isUploadingProof || !proofUrl.trim()}
                        className="shrink-0 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                      >
                        {isUploadingProof ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Upload className="h-3.5 w-3.5" />
                        )}
                        Kirim Bukti
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Masukkan link foto bukti transfer untuk verifikasi admin toko.
                    </p>
                  </form>
                )}
              </div>
            )}

            {/* Itemized Shopping List Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                  <Package className="h-4 w-4 text-slate-700" />
                  <span>Rincian Barang Belanja ({order.items.length} Produk)</span>
                </h3>
              </div>

              <div className="divide-y divide-slate-100">
                {order.items.map((item) => {
                  const price = Number(item.unitSellPrice) || 0;
                  const qty = Number(item.qty) || 0;
                  const subtotal = price * qty;

                  return (
                    <div
                      key={item.id}
                      className="flex items-start gap-4 py-3.5 first:pt-0 last:pb-0"
                    >
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-center">
                        {item.product?.imageUrl ? (
                          <Image
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            width={64}
                            height={64}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Package className="h-6 w-6 text-slate-300 stroke-[1.25]" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0 space-y-1">
                        <h4 className="font-bold text-xs text-slate-900 line-clamp-2">
                          {item.product?.name}
                        </h4>
                        <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-400 font-medium">
                          <span>SKU: {item.product?.sku}</span>
                          <span>•</span>
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-600 font-semibold">
                            Satuan: {item.unit?.name}
                          </span>
                        </div>

                        <div className="flex items-center justify-between pt-1 text-xs">
                          <span className="font-semibold text-slate-500">
                            {qty} {item.unit?.name} × {formatPrice(price)}
                          </span>
                          <span className="font-extrabold text-slate-900">
                            {formatPrice(subtotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Totals Summary */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="flex justify-between text-xs font-medium text-slate-600">
                  <span>Subtotal Produk</span>
                  <span className="font-bold text-slate-800">
                    {formatPrice(order.subtotal)}
                  </span>
                </div>

                {Number(order.discountAmount || 0) > 0 && (
                  <div className="flex justify-between text-xs font-medium text-slate-700">
                    <span>Diskon Voucher Promo</span>
                    <span className="font-bold">
                      -{formatPrice(order.discountAmount || 0)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-xs font-medium text-slate-600">
                  <span>Ongkos Kirim Area Mojokerto</span>
                  <span className="font-bold text-emerald-700">GRATIS</span>
                </div>

                <div className="border-t border-slate-200 pt-2 flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-900">
                    Total Pembayaran
                  </span>
                  <span className="text-base font-black text-slate-900">
                    {formatPrice(order.totalAmount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Status History Log Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-2 border-b border-slate-100 pb-3">
                <FileText className="h-4 w-4 text-slate-700" />
                <span>Riwayat Perubahan Status Log</span>
              </h3>

              <div className="relative border-l-2 border-slate-200 ml-3 space-y-5 pl-4 pt-1">
                {order.statusHistory && order.statusHistory.length > 0 ? (
                  order.statusHistory.map((h, i) => {
                    const st = statusConfig[h.toStatus] || statusConfig.DRAFT;
                    return (
                      <div key={i} className="relative">
                        <span className="absolute -left-[23px] top-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-slate-900 ring-4 ring-white">
                          <span className="h-1 w-1 rounded-full bg-white" />
                        </span>
                        <div className="space-y-0.5">
                          <div className="text-xs font-extrabold text-slate-900">
                            {st.label}
                          </div>
                          {h.note && (
                            <p className="text-xs text-slate-600">{h.note}</p>
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
                    <span className="absolute -left-[23px] top-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-slate-900 ring-4 ring-white">
                      <span className="h-1 w-1 rounded-full bg-white" />
                    </span>
                    <div className="space-y-0.5">
                      <div className="text-xs font-extrabold text-slate-900">
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
          </div>

          {/* Right Column (Customer, Shipping & Actions) */}
          <div className="space-y-6 lg:col-span-1">
            {/* Recipient & Customer Info Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-3 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-slate-700" />
                <span>Informasi Pembeli / Penerima</span>
              </h3>

              <div className="space-y-2.5 text-xs">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-0.5">
                    Nama Lengkap
                  </span>
                  <span className="font-extrabold text-slate-900 text-sm">
                    {order.customer?.name || "Pelanggan Retail"}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-0.5">
                    Nomor WhatsApp / HP
                  </span>
                  <span className="font-bold text-slate-800">
                    {order.customer?.phone || "-"}
                  </span>
                </div>

                {order.customer?.email && (
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block mb-0.5">
                      Email
                    </span>
                    <span className="font-bold text-slate-800">
                      {order.customer.email}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Delivery Address Card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-slate-700" />
                <span>Alamat Tujuan Pengiriman</span>
              </h3>

              <div className="space-y-2 text-xs">
                <div className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-800 border border-slate-200">
                  {order.deliveryMethod === "DELIVERY" ? (
                    <>
                      <Truck className="h-3.5 w-3.5 text-slate-700" />
                      <span>Kirim Langsung (Kurir Toko)</span>
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
                    {order.deliveryAddressText || "Alamat lokasi Mojokerto"}
                  </p>
                )}
              </div>
            </div>

            {/* Interactive Customer Actions */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-3">
                Aksi Pesanan
              </h3>

              {/* Mark Received Button */}
              {!isCancelled &&
                (order.status === "DALAM_PENGIRIMAN" ||
                  order.status === "TERKIRIM_MENUNGGU_TTD" ||
                  order.status === "SIAP_KIRIM") && (
                  <button
                    type="button"
                    onClick={() => setIsReceiveModalOpen(true)}
                    className="w-full rounded-xl bg-slate-900 py-3 text-xs font-extrabold text-white hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span>Konfirmasi Pesanan Diterima</span>
                  </button>
                )}

              {/* Cancel Button */}
              {!isCancelled &&
                (order.status === "DRAFT" ||
                  order.status === "MENUNGGU_KONFIRMASI") && (
                  <button
                    type="button"
                    onClick={() => setIsCancelModalOpen(true)}
                    className="w-full rounded-xl border border-rose-200 bg-rose-50 py-3 text-xs font-bold text-rose-700 hover:bg-rose-100 transition-all flex items-center justify-center gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    <span>Batalkan Pesanan Ini</span>
                  </button>
                )}

              {/* Customer Service WhatsApp */}
              <a
                href={`https://wa.me/6281234567890?text=${encodeURIComponent(
                  `Halo Rizqi Mart, saya ingin bertanya tentang pesanan nomor: ${order.orderNumber}`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 text-xs font-bold text-slate-800 hover:bg-slate-100 transition-all flex items-center justify-center gap-2"
              >
                <MessageSquare className="h-4 w-4 text-slate-600" />
                <span>Hubungi CS via WhatsApp</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ── Confirm Receive Modal ── */}
      {isReceiveModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-slate-900">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Konfirmasi Pesanan Diterima?
                </h3>
                <p className="text-xs text-slate-500">
                  Apakah Anda sudah menerima seluruh barang belanjaan dengan kondisi baik?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setIsReceiveModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isSubmittingAction}
                onClick={() => handlePerformAction("MARK_RECEIVED")}
                className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50 flex items-center gap-2"
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

      {/* ── Cancel Order Modal ── */}
      {isCancelModalOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <AlertTriangle className="h-8 w-8" />
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">
                  Yakin Membatalkan Pesanan?
                </h3>
                <p className="text-xs text-slate-500">
                  Pesanan nomor {order.orderNumber} akan dibatalkan secara permanen.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={() => setIsCancelModalOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100"
              >
                Kembali
              </button>
              <button
                type="button"
                disabled={isSubmittingAction}
                onClick={() => handlePerformAction("CANCEL")}
                className="rounded-xl bg-rose-600 px-5 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50 flex items-center gap-2"
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
    </div>
  );
}
