import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Package, MapPin, CreditCard, Clock, CheckCircle, Phone, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  DRAFT: { label: "Draft", color: "bg-slate-100 text-slate-800", icon: Clock },
  MENUNGGU_KONFIRMASI: { label: "Menunggu Konfirmasi", color: "bg-yellow-100 text-yellow-800", icon: Clock },
  DIKONFIRMASI: { label: "Dikonfirmasi", color: "bg-blue-100 text-blue-800", icon: CheckCircle },
  SIAP_KIRIM: { label: "Siap Kirim", color: "bg-purple-100 text-purple-800", icon: Package },
  DALAM_PENGIRIMAN: { label: "Dalam Pengiriman", color: "bg-indigo-100 text-indigo-800", icon: Package },
  SELESAI: { label: "Selesai", color: "bg-emerald-100 text-emerald-800", icon: CheckCircle },
  DIBATALKAN: { label: "Dibatalkan", color: "bg-rose-100 text-rose-800", icon: XCircle },
};

async function getOrderFromDb(id: string) {
  const order = await prisma.salesOrder.findUnique({
    where: { id },
    include: {
      items: {
        include: {
          product: true,
          unit: true,
        },
      },
      customer: true,
      statusHistory: {
        orderBy: {
          changedAt: "asc",
        },
      },
      payments: {
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  return order;
}

export default async function OrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const order = await getOrderFromDb(params.id);

  if (!order) {
    notFound();
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDateTime = (date: Date) => {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  };

  const statusInfo = statusConfig[order.status] || statusConfig.DRAFT;
  const StatusIcon = statusInfo.icon;

  // Resolve timeline: if database history is empty, construct a basic logical timeline
  const timeline = order.statusHistory.length > 0
    ? order.statusHistory.map((h) => ({
        status: h.toStatus,
        timestamp: h.changedAt,
        note: h.note || `Status berubah menjadi ${statusConfig[h.toStatus]?.label || h.toStatus}`,
      }))
    : [
        { status: "DRAFT", timestamp: order.createdAt, note: "Pesanan berhasil dibuat" },
        ...(order.status !== "DRAFT" ? [
          { status: order.status, timestamp: order.updatedAt, note: `Pesanan saat ini: ${statusConfig[order.status]?.label || order.status}` }
        ] : []),
      ];

  // Resolve payment details
  const primaryPayment = order.payments[0];
  const paymentMethodText = primaryPayment
    ? primaryPayment.method === "TRANSFER_BANK" ? "Transfer Bank" : primaryPayment.method === "QRIS" ? "QRIS" : "Cash on Delivery (COD)"
    : "Belum memilih metode";

  return (
    <div className="min-h-screen bg-slate-50/50 py-12">
      <div className="page-container">
        
        {/* Back Button */}
        <div className="mb-8">
          <Link
            href="/orders"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Kembali ke Pesanan Saya</span>
          </Link>
        </div>

        {/* Order Header */}
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col justify-between space-y-4 md:flex-row md:items-center md:space-y-0">
            <div>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block mb-1">
                Nomor Pesanan
              </span>
              <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">{order.orderNumber}</h1>
              <p className="mt-1.5 text-xs font-medium text-slate-500">
                Dipesan pada {formatDateTime(order.createdAt)}
              </p>
            </div>
            <div className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold ${statusInfo.color} h-fit w-fit`}>
              <StatusIcon className="h-4 w-4" />
              <span>{statusInfo.label}</span>
            </div>
          </div>
        </div>

        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-6 lg:col-span-2">
            
            {/* Order Items */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-sm font-bold uppercase tracking-wider text-slate-400">
                Daftar Belanja
              </h2>
              
              <div className="divide-y divide-slate-100">
                {order.items.map((item) => {
                  const itemPrice = Number(item.unitSellPrice);
                  const itemSubtotal = itemPrice * Number(item.qty);

                  return (
                    <div key={item.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-slate-150 bg-slate-50 relative flex items-center justify-center">
                        {item.product.imageUrl ? (
                          <Image
                            src={item.product.imageUrl}
                            alt={item.product.name}
                            width={80}
                            height={80}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <Package className="h-8 w-8 text-slate-300 stroke-[1.25]" />
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-xs text-slate-800 line-clamp-1">{item.product.name}</h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">SKU: {item.product.sku}</p>
                        
                        <div className="mt-2.5 flex items-center justify-between gap-4">
                          <span className="text-xs font-medium text-slate-500">
                            {Number(item.qty)} {item.unit.name} × {formatPrice(itemPrice)}
                          </span>
                          <span className="text-xs font-bold text-slate-900">
                            {formatPrice(itemSubtotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Totals Summary */}
              <div className="mt-6 space-y-3 border-t border-slate-150 pt-5">
                <div className="flex justify-between text-xs font-semibold text-slate-500">
                  <span>Subtotal</span>
                  <span>{formatPrice(Number(order.subtotal))}</span>
                </div>
                <div className="flex justify-between text-xs font-semibold text-slate-500">
                  <span>Ongkos Kirim</span>
                  <span className="text-emerald-600">GRATIS</span>
                </div>
                <div className="flex justify-between border-t border-slate-150 pt-3">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">Total Pembayaran</span>
                  <span className="text-lg font-extrabold text-slate-900">
                    {formatPrice(Number(order.totalAmount))}
                  </span>
                </div>
              </div>
            </div>

            {/* Status Timeline */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-6 text-sm font-bold uppercase tracking-wider text-slate-400">
                Riwayat Status Pesanan
              </h2>
              <div className="relative border-l border-slate-150 pl-5 ml-2.5 space-y-6">
                {timeline.map((event, index) => {
                  const evConfig = statusConfig[event.status] || statusConfig.DRAFT;
                  return (
                    <div key={index} className="relative">
                      {/* Node indicator */}
                      <span className="absolute -left-[27px] top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white ring-2 ring-slate-200">
                        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                      </span>
                      
                      <div>
                        <div className="text-xs font-bold text-slate-800">
                          {evConfig.label}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{event.note}</p>
                        <time className="text-[10px] text-slate-400 font-medium mt-1.5 block">
                          {formatDateTime(event.timestamp)}
                        </time>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6 lg:col-span-1">
            {/* Customer Info */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">
                Penerima
              </h2>
              <div className="space-y-3 text-xs text-slate-600">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">Nama Lengkap</span>
                  <span className="font-semibold text-slate-800">{order.customer?.name || "Pelanggan Retail"}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">Telepon</span>
                  <span className="font-semibold text-slate-800">{order.customer?.phone || "-"}</span>
                </div>
                {order.customer?.email && (
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">Email</span>
                    <span className="font-semibold text-slate-800">{order.customer.email}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Delivery Info */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span>Alamat Kirim</span>
              </h2>
              <div className="space-y-2 text-xs text-slate-650 text-slate-600">
                <div className="font-semibold text-slate-800">
                  {order.deliveryMethod === "DELIVERY" ? "Kirim ke Alamat" : "Ambil di Toko"}
                </div>
                {order.deliveryMethod === "DELIVERY" && (
                  <div className="leading-relaxed">
                    {order.deliveryAddressText}
                  </div>
                )}
              </div>
            </div>

            {/* Payment Info */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <CreditCard className="h-4 w-4 text-slate-400" />
                <span>Info Pembayaran</span>
              </h2>
              <div className="space-y-4 text-xs text-slate-600">
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">Metode Pembayaran</span>
                  <span className="font-semibold text-slate-800">{paymentMethodText}</span>
                </div>
                <div>
                  <span className="text-[10px] font-semibold text-slate-400 block mb-0.5">Status</span>
                  <div className="inline-flex items-center gap-1 font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    <CheckCircle className="h-3.5 w-3.5" />
                    <span>{order.paymentStatus}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Support Contact */}
            <a
              href={`https://wa.me/6281234567890?text=Halo%20Rizqi%20Mart%2C%20saya%20ingin%20bertanya%20mengenai%20pesanan%20saya%20dengan%20nomor%3A%20${encodeURIComponent(order.orderNumber)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 shadow-sm"
            >
              <Phone className="h-4 w-4" />
              <span>Hubungi CS Toko</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
