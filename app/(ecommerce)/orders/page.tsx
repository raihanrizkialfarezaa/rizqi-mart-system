import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import Link from "next/link";
import { Package, Clock, CheckCircle, XCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-800", icon: Clock },
  MENUNGGU_KONFIRMASI: { label: "Menunggu Konfirmasi", color: "bg-yellow-100 text-yellow-850 bg-yellow-50 text-yellow-800", icon: Clock },
  DIKONFIRMASI: { label: "Dikonfirmasi", color: "bg-blue-100 text-blue-800", icon: CheckCircle },
  SIAP_KIRIM: { label: "Siap Kirim", color: "bg-purple-100 text-purple-800", icon: Package },
  DALAM_PENGIRIMAN: { label: "Dalam Pengiriman", color: "bg-indigo-100 text-indigo-800", icon: Package },
  SELESAI: { label: "Selesai", color: "bg-green-100 text-green-800", icon: CheckCircle },
  DIBATALKAN: { label: "Dibatalkan", color: "bg-red-100 text-red-800", icon: XCircle },
};

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const user = await getSession();

  if (!user) {
    redirect("/sign-in");
  }

  // Fetch e-commerce B2C sales orders from database
  const dbOrders = await prisma.salesOrder.findMany({
    where: {
      channel: "ECOMMERCE",
    },
    include: {
      items: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Map db records to page display data
  const orders = dbOrders.map((order) => {
    const itemCount = order.items.reduce((sum, item) => sum + Number(item.qty), 0);
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      status: order.status,
      paymentStatus: order.paymentStatus,
      totalAmount: Number(order.totalAmount),
      itemCount,
    };
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  };

  return (
    <div className="min-h-screen bg-slate-50/50 py-12">
      <div className="page-container">
        
        {/* Breadcrumb */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors"
          >
            Kembali ke Beranda
          </Link>
        </div>

        <h1 className="mb-8 text-2xl font-bold tracking-tight text-slate-900">Pesanan Saya</h1>

        {searchParams.status === "success" && (
          <div className="mb-8 rounded-xl bg-emerald-50 border border-emerald-200/60 p-4">
            <div className="flex items-center space-x-2.5">
              <CheckCircle className="h-5 w-5 text-emerald-600" />
              <p className="text-xs font-semibold text-emerald-900">
                Pesanan berhasil dibuat! Kami sedang memproses alokasi stok untuk pengiriman.
              </p>
            </div>
          </div>
        )}

        {orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => {
              const statusInfo = statusConfig[order.status] || statusConfig.DRAFT;
              const StatusIcon = statusInfo.icon;

              return (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="block rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:border-slate-350 hover:shadow"
                >
                  <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                    {/* Order Info */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <Package className="h-5 w-5 text-slate-400" />
                        <div>
                          <div className="font-semibold text-slate-805 text-slate-850 text-slate-900">
                            {order.orderNumber}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            {formatDate(order.createdAt)} • {order.itemCount} unit produk
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status & Total */}
                    <div className="flex flex-wrap items-center gap-4">
                      <div
                        className={`inline-flex items-center space-x-2 rounded-lg px-2.5 py-1 text-xs font-semibold ${statusInfo.color}`}
                      >
                        <StatusIcon className="h-3.5 w-3.5" />
                        <span>{statusInfo.label}</span>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 block font-bold uppercase tracking-wider">Total Belanja</span>
                        <span className="text-sm font-bold text-slate-900">
                          {formatPrice(order.totalAmount)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-16 text-center shadow-sm">
            <Package className="mx-auto h-12 w-12 text-slate-300 stroke-[1.25]" />
            <h3 className="mt-4 text-base font-semibold text-slate-900">Belum ada pesanan</h3>
            <p className="mt-2 text-xs text-slate-500">
              Keranjang belanja Anda kosong atau belum ada pembelian yang terekam.
            </p>
            <Link
              href="/products"
              className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-2.5 text-[12px] font-semibold text-white transition-colors hover:bg-slate-700"
            >
              Belanja Sekarang
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
