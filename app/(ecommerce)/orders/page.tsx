import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import Link from "next/link";
import { Package, Clock, CheckCircle, XCircle } from "lucide-react";

// Mock orders data - in production, fetch from database
const mockOrders = [
  {
    id: "order-1",
    orderNumber: "SO/VVS/2026/07/0001",
    createdAt: new Date("2026-06-28"),
    status: "SELESAI",
    paymentStatus: "LUNAS",
    totalAmount: 248000,
    itemCount: 2,
  },
  {
    id: "order-2",
    orderNumber: "SO/VVS/2026/07/0002",
    createdAt: new Date("2026-06-30"),
    status: "DALAM_PENGIRIMAN",
    paymentStatus: "LUNAS",
    totalAmount: 450000,
    itemCount: 3,
  },
];

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-800", icon: Clock },
  MENUNGGU_KONFIRMASI: { label: "Menunggu Konfirmasi", color: "bg-yellow-100 text-yellow-800", icon: Clock },
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

  const orders = mockOrders; // In production: fetch from database filtered by user

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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <h1 className="mb-8 text-3xl font-bold">Pesanan Saya</h1>

        {searchParams.status === "success" && (
          <div className="mb-6 rounded-lg bg-green-50 p-4 border border-green-200">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <p className="font-medium text-green-900">
                Pesanan berhasil dibuat! Kami akan segera memprosesnya.
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
                  className="block rounded-lg bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
                    {/* Order Info */}
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <Package className="h-5 w-5 text-gray-400" />
                        <div>
                          <div className="font-semibold text-gray-900">
                            {order.orderNumber}
                          </div>
                          <div className="text-sm text-gray-600">
                            {formatDate(order.createdAt)} • {order.itemCount} produk
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center space-x-4">
                      <div
                        className={`inline-flex items-center space-x-2 rounded-full px-3 py-1 text-sm font-medium ${statusInfo.color}`}
                      >
                        <StatusIcon className="h-4 w-4" />
                        <span>{statusInfo.label}</span>
                      </div>

                      {/* Total */}
                      <div className="text-right">
                        <div className="text-sm text-gray-600">Total Belanja</div>
                        <div className="font-bold text-primary">
                          {formatPrice(order.totalAmount)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Payment Status */}
                  {order.paymentStatus === "LUNAS" && (
                    <div className="mt-3 inline-flex items-center space-x-1 text-sm text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      <span>Pembayaran Lunas</span>
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="rounded-lg bg-white p-12 text-center shadow-sm">
            <Package className="mx-auto h-24 w-24 text-gray-400" />
            <h2 className="mt-4 text-xl font-semibold text-gray-900">
              Belum Ada Pesanan
            </h2>
            <p className="mt-2 text-gray-600">
              Anda belum pernah melakukan pemesanan
            </p>
            <Link
              href="/products"
              className="mt-6 inline-block rounded-lg bg-primary px-6 py-3 font-medium text-white hover:bg-primary/90"
            >
              Mulai Belanja
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
