"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Store,
  ShieldCheck,
  Package,
  Truck,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  MapPin,
  ShoppingBag,
  RotateCcw,
  Eye,
  CreditCard,
} from "lucide-react";
import { useCart } from "./CartContext";
import { useRouter } from "next/navigation";

export type HistoryOrderItem = {
  id: string;
  qty: number;
  unitSellPrice: number;
  subtotalSell: number;
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

export type HistoryOrder = {
  id: string;
  orderNumber: string;
  createdAt: string;
  status: string;
  fulfillmentStatus: string;
  paymentStatus: string;
  deliveryMethod: string;
  deliveryAddressText?: string | null;
  subtotal: number;
  discountAmount: number;
  totalAmount: number;
  itemCount: number;
  items: HistoryOrderItem[];
};

const statusConfig: Record<string, { label: string; dot?: string; pill: string }> = {
  DRAFT: { label: "Draft", pill: "bg-slate-100 text-slate-700 border-slate-200" },
  MENUNGGU_KONFIRMASI: { label: "Menunggu Konfirmasi", dot: "bg-amber-500", pill: "bg-amber-50 text-amber-800 border-amber-200" },
  DIKONFIRMASI: { label: "Dikonfirmasi", dot: "bg-slate-900", pill: "bg-slate-900 text-white border-slate-900" },
  SIAP_KIRIM: { label: "Siap Kirim", dot: "bg-slate-900", pill: "bg-slate-900 text-white border-slate-900" },
  DALAM_PENGIRIMAN: { label: "Dalam Pengiriman", dot: "bg-slate-900", pill: "bg-slate-900 text-white border-slate-900" },
  TERKIRIM_MENUNGGU_TTD: { label: "Terkirim", dot: "bg-slate-900", pill: "bg-slate-900 text-white border-slate-900" },
  SELESAI: { label: "Selesai", pill: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  DIBATALKAN: { label: "Dibatalkan", pill: "bg-white text-slate-600 border-slate-200" },
};

const paymentConfig: Record<string, { label: string; pill: string }> = {
  BELUM_BAYAR: { label: "Belum Bayar", pill: "bg-white text-slate-700 border-slate-200" },
  MENUNGGU_VALIDASI: { label: "Menunggu Validasi", pill: "bg-amber-50 text-amber-800 border-amber-200" },
  LUNAS: { label: "Lunas", pill: "bg-emerald-50 text-emerald-800 border-emerald-200" },
  SEBAGIAN: { label: "Sebagian", pill: "bg-slate-100 text-slate-700 border-slate-200" },
  DITOLAK: { label: "Ditolak", pill: "bg-rose-50 text-rose-700 border-rose-200" },
};

export default function OrderHistoryCard({
  order,
  isHighlighted,
}: {
  order: HistoryOrder;
  isHighlighted?: boolean;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState<null | "CANCEL" | "RECEIVE">(null);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const { addToCart } = useCart();
  const router = useRouter();

  const statusMeta = statusConfig[order.status] || statusConfig.DRAFT;
  const payMeta = paymentConfig[order.paymentStatus] || null;
  const isCancelled = order.status === "DIBATALKAN";
  const isDone = order.status === "SELESAI";

  const visibleItems = isExpanded ? order.items : order.items.slice(0, 2);
  const hiddenCount = order.items.length - visibleItems.length;

  const formatPrice = (price: number | string) =>
    new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", minimumFractionDigits: 0 }).format(Number(price) || 0);

  const formatDate = (date: string) =>
    new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(date));

  const formatShortDate = (date: string) =>
    new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date));

  const copyNumber = () => {
    navigator.clipboard.writeText(order.orderNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

  const handleAction = async (action: "CANCEL" | "MARK_RECEIVED") => {
    const map: Record<string, "CANCEL" | "RECEIVE"> = { CANCEL: "CANCEL", MARK_RECEIVED: "RECEIVE" };
    setIsActionLoading(map[action]);
    setMsg(null);
    try {
      const res = await fetch(`/api/ecommerce/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal");
      setMsg({ type: "success", text: json.message || "Berhasil memperbarui pesanan" });
      router.refresh();
      setTimeout(() => window.location.reload(), 700);
    } catch (e: any) {
      setMsg({ type: "error", text: e.message || "Gagal memproses aksi" });
    } finally {
      setIsActionLoading(null);
    }
  };

  return (
    <div
      id={`order-${order.id}`}
      className={`overflow-hidden rounded-2xl border bg-white shadow-sm transition-colors ${
        isHighlighted ? "border-slate-900 ring-1 ring-slate-900/10" : "border-slate-200 hover:border-slate-300"
      }`}
    >
      {isHighlighted && (
        <div className="flex items-center justify-between bg-slate-900 px-5 py-2">
          <span className="flex items-center gap-2 text-sm font-medium tracking-wide text-white">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            Pesanan terbaru
          </span>
          <span className="hidden text-sm text-slate-300 sm:inline">{formatShortDate(order.createdAt)}</span>
        </div>
      )}

      {/* Shop header */}
      <div className="flex flex-col gap-4 border-b border-slate-100 bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-sm font-bold text-white">R</div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold tracking-tight text-slate-900 sm:text-[15px]">Rizqi Mart</span>
              <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
                <ShieldCheck className="h-3.5 w-3.5 text-slate-500" />
                Official Store
              </span>
              <span className="hidden sm:inline text-xs text-slate-400">Mojokerto</span>
              <Link
                href="/products"
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-900 hover:text-white hover:border-slate-900"
              >
                <Store className="h-3.5 w-3.5" />
                Kunjungi Toko
              </Link>
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-600 sm:text-[13px]">
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-slate-500" />
                {formatDate(order.createdAt)}
              </span>
              <span className="hidden sm:inline text-slate-300">•</span>
              <span className="inline-flex items-center gap-1.5">
                <Package className="h-3.5 w-3.5 text-slate-500" />
                {order.itemCount} unit • {order.items.length} produk
              </span>
              <span className="hidden sm:inline text-slate-300">•</span>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600">
                {order.deliveryMethod === "DELIVERY" ? <Truck className="h-3.5 w-3.5" /> : <Store className="h-3.5 w-3.5" />}
                {order.deliveryMethod === "DELIVERY" ? "Kurir Toko" : "Ambil di Toko"}
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold sm:text-sm ${statusMeta.pill}`}>
            {statusMeta.dot && !isCancelled && !isDone && <span className={`h-2 w-2 rounded-full ${statusMeta.dot}`} />}
            {isCancelled ? <XCircle className="h-4 w-4" /> : isDone ? <CheckCircle2 className="h-4 w-4" /> : null}
            {statusMeta.label}
          </span>
          {payMeta && (
            <span className={`inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium sm:text-sm ${payMeta.pill}`}>{payMeta.label}</span>
          )}
        </div>
      </div>

      {/* Order number */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-5 py-3 sm:px-6 sm:py-3.5">
        <div className="flex items-center gap-3 min-w-0">
          <span className="hidden text-xs font-semibold uppercase tracking-wider text-slate-500 sm:inline">No. Pesanan</span>
          <span className="font-mono text-sm font-semibold tracking-tight text-slate-900 truncate sm:text-[15px]">{order.orderNumber}</span>
          <button
            onClick={copyNumber}
            className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 transition-colors hover:bg-slate-900 hover:text-white hover:border-slate-900"
            title="Salin nomor pesanan"
            type="button"
          >
            {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
          </button>
        </div>
        <Link
          href={`/orders/${order.id}`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 sm:px-3.5 sm:py-2"
        >
          <Eye className="h-4 w-4" />
          Lihat Detail
        </Link>
      </div>

      {/* Items */}
      <div className="divide-y divide-slate-100 bg-white">
        {visibleItems.map((item) => {
          const qty = Number(item.qty) || 0;
          const price = Number(item.unitSellPrice) || 0;
          const subtotal = Number(item.subtotalSell) || price * qty;
          return (
            <div key={item.id} className="flex gap-4 px-5 py-4 sm:px-6 sm:py-5">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 sm:h-[84px] sm:w-[84px]">
                {item.product.imageUrl ? (
                  <Image src={item.product.imageUrl} alt={item.product.name} fill sizes="84px" className="object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-300">
                    <ShoppingBag className="h-6 w-6" />
                  </div>
                )}
              </div>
              <div className="min-w-0 flex-1 py-0.5">
                <Link href={`/products/${item.product.id}`} className="line-clamp-2 text-sm font-semibold leading-snug text-slate-900 hover:text-slate-700 sm:text-[15px] sm:leading-6">
                  {item.product.name}
                </Link>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-xs font-medium text-slate-600">SKU {item.product.sku}</span>
                  <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600">{item.unit.name}</span>
                </div>
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <span className="text-sm text-slate-600">
                    <span className="font-medium text-slate-900">{qty} {item.unit.name}</span>
                    <span className="text-slate-400"> × </span>
                    <span className="font-medium text-slate-700">{formatPrice(price)}</span>
                  </span>
                  <span className="text-sm font-semibold text-slate-900 sm:text-[15px]">{formatPrice(subtotal)}</span>
                </div>
              </div>
            </div>
          );
        })}

        {hiddenCount > 0 && !isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            className="flex w-full items-center justify-center gap-2 border-t border-slate-100 bg-white px-5 py-3.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            type="button"
          >
            <ChevronDown className="h-4 w-4" />
            Lihat {hiddenCount} produk lainnya
          </button>
        )}
        {isExpanded && order.items.length > 2 && (
          <button
            onClick={() => setIsExpanded(false)}
            className="flex w-full items-center justify-center gap-2 border-t border-slate-100 bg-white px-5 py-3.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
            type="button"
          >
            <ChevronUp className="h-4 w-4" />
            Sembunyikan
          </button>
        )}
      </div>

      {/* Delivery */}
      {order.deliveryMethod === "DELIVERY" && order.deliveryAddressText && (
        <div className="flex items-start gap-2.5 border-t border-slate-100 bg-slate-50 px-5 py-3.5 text-sm sm:px-6">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
          <span className="leading-relaxed text-slate-600">
            <span className="font-semibold text-slate-900">Alamat kirim:</span> {order.deliveryAddressText}
          </span>
        </div>
      )}

      {msg && (
        <div className={`mx-5 mt-4 rounded-xl border px-4 py-3 text-sm font-medium sm:mx-6 ${msg.type === "success" ? "border-slate-900 bg-slate-900 text-white" : "border-rose-200 bg-rose-50 text-rose-800"}`}>
          {msg.text}
        </div>
      )}

      {/* Totals + Actions */}
      <div className="border-t border-slate-100 bg-white px-5 py-5 sm:px-6 sm:py-6 space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-slate-600">
            <span>
              Subtotal <span className="font-semibold text-slate-900">{formatPrice(order.subtotal)}</span>
            </span>
            {order.discountAmount > 0 && (
              <span>
                Diskon <span className="font-semibold text-slate-900">-{formatPrice(order.discountAmount)}</span>
              </span>
            )}
            <span className="inline-flex items-center gap-2">
              Ongkir <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700">GRATIS</span>
            </span>
          </div>
          <div className="text-left sm:text-right">
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Total Pesanan</span>
            <span className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">{formatPrice(order.totalAmount)}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
          <a
            href={`https://wa.me/6281234567890?text=${encodeURIComponent(`Halo Rizqi Mart, saya ingin tanya pesanan ${order.orderNumber}`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            <MessageSquare className="h-4 w-4" />
            Hubungi Penjual
          </a>

          {!isCancelled && !isDone && (order.status === "DALAM_PENGIRIMAN" || order.status === "TERKIRIM_MENUNGGU_TTD" || order.status === "SIAP_KIRIM") && (
            <button
              onClick={() => handleAction("MARK_RECEIVED")}
              disabled={!!isActionLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
              type="button"
            >
              <CheckCircle2 className="h-4 w-4" />
              {isActionLoading === "RECEIVE" ? "Memproses..." : "Pesanan Diterima"}
            </button>
          )}

          {!isCancelled && !isDone && (order.status === "DRAFT" || order.status === "MENUNGGU_KONFIRMASI") && (
            <>
              <Link
                href={`/orders/${order.id}`}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <CreditCard className="h-4 w-4" />
                Bayar
              </Link>
              <button
                onClick={() => handleAction("CANCEL")}
                disabled={!!isActionLoading}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50"
                type="button"
              >
                <XCircle className="h-4 w-4" />
                {isActionLoading === "CANCEL" ? "Memproses..." : "Batalkan"}
              </button>
            </>
          )}

          {isDone && (
            <button
              onClick={handleBuyAgain}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-900 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition-colors hover:bg-slate-900 hover:text-white"
              type="button"
            >
              <RotateCcw className="h-4 w-4" />
              Beli Lagi
            </button>
          )}

          {isCancelled && (
            <button
              onClick={handleBuyAgain}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
              type="button"
            >
              <ShoppingBag className="h-4 w-4" />
              Pesan Lagi
            </button>
          )}

          <Link
            href={`/orders/${order.id}`}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-800 transition-colors hover:bg-slate-50"
          >
            Lihat Detail
            <ChevronDown className="h-4 w-4 rotate-[-90deg]" />
          </Link>
        </div>
      </div>
    </div>
  );
}
