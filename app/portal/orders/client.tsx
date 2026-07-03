"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Plus } from "lucide-react";
import { formatCurrency } from "@/lib/utils/decimal";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-700" },
  MENUNGGU_KONFIRMASI: { label: "Review", color: "bg-yellow-100 text-yellow-700" },
  DIKONFIRMASI: { label: "Dikonfirmasi", color: "bg-blue-100 text-blue-700" },
  MENUNGGU_PENGADAAN: { label: "Pengadaan", color: "bg-purple-100 text-purple-700" },
  SIAP_KIRIM: { label: "Siap Kirim", color: "bg-green-100 text-green-700" },
  DALAM_PENGIRIMAN: { label: "Kirim", color: "bg-orange-100 text-orange-700" },
  SELESAI: { label: "Selesai", color: "bg-green-100 text-green-700" },
  DIBATALKAN: { label: "Batal", color: "bg-red-100 text-red-700" },
};

type OrderItem = {
  id: string;
  orderNumber: string;
  status: string;
  customerStatus: string | null;
  totalAmount: number;
  requestedDeliveryDate: string | null;
  createdAt: string;
  _count: { items: number };
};

export default function PortalOrdersClient({
  displayName,
  orders,
}: {
  displayName: string;
  orders: OrderItem[];
}) {
  const router = useRouter();

  return (
    <div className="px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-500">{displayName}</p>
          <h1 className="text-lg font-bold text-gray-900">Pesanan</h1>
        </div>
        <button
          onClick={() => router.push("/portal/orders/new")}
          className="flex items-center gap-1 rounded-xl bg-primary px-4 py-2 text-xs font-medium text-white active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" /> Baru
        </button>
      </div>

      {orders.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center">
          <p className="text-sm text-gray-400">Belum ada pesanan</p>
          <button
            onClick={() => router.push("/portal/orders/new")}
            className="mt-3 text-sm font-medium text-primary"
          >
            Buat pesanan pertama →
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((order) => {
            const status = STATUS_LABELS[order.customerStatus || order.status] || { label: order.status, color: "bg-gray-100 text-gray-700" };
            return (
              <button
                key={order.id}
                onClick={() => router.push(`/portal/orders/${order.id}`)}
                className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white p-4 text-left active:scale-[0.98]"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900">{order.orderNumber}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {order._count.items} item •{" "}
                    {new Date(order.createdAt).toLocaleDateString("id-ID", {
                      day: "numeric", month: "short",
                    })}
                    {order.requestedDeliveryDate && ` → ${new Date(order.requestedDeliveryDate).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}`}
                  </p>
                </div>
                <div className="ml-3 flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${status.color}`}>
                    {status.label}
                  </span>
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(order.totalAmount)}
                  </span>
                  <ArrowRight className="h-4 w-4 text-gray-300" />
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white">
        <div className="mx-auto flex max-w-lg">
          <button onClick={() => router.push("/portal/dashboard")} className="flex flex-1 flex-col items-center py-2 text-gray-400">
            <ArrowLeft className="h-5 w-5" />
            <span className="mt-0.5 text-xs">Beranda</span>
          </button>
          <button className="flex flex-1 flex-col items-center py-2 text-primary">
            <Plus className="h-5 w-5" />
            <span className="mt-0.5 text-xs font-medium">Pesanan</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
