"use client";

import { useState, useEffect } from "react";
import { Building2, Package, ShoppingCart, LogOut, ArrowRight, Bell } from "lucide-react";
import { formatCurrency } from "@/lib/utils/decimal";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils/cn";

type IdentityData = {
  id: string;
  displayName: string;
  primaryContact: string;
  institution: {
    id: string;
    name: string;
    parentInstitution: { id: string; name: string } | null;
  };
  orders: Array<{
    id: string;
    orderNumber: string;
    status: string;
    customerStatus: string | null;
    totalAmount: number;
    createdAt: string;
  }>;
};

const CUSTOMER_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  PENDING_REVIEW: { label: "Menunggu Review", color: "bg-yellow-100 text-yellow-700" },
  CONFIRMED: { label: "Dikonfirmasi", color: "bg-blue-100 text-blue-700" },
  SOURCING: { label: "Dicari Barang", color: "bg-purple-100 text-purple-700" },
  READY_TO_SHIP: { label: "Siap Kirim", color: "bg-green-100 text-green-700" },
  ON_DELIVERY: { label: "Dalam Pengiriman", color: "bg-orange-100 text-orange-700" },
  DELIVERED: { label: "Terkirim", color: "bg-green-100 text-green-700" },
  CANCELLED: { label: "Dibatalkan", color: "bg-red-100 text-red-700" },
};

const ORDER_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-700" },
  MENUNGGU_KONFIRMASI: { label: "Menunggu Konfirmasi", color: "bg-yellow-100 text-yellow-700" },
  DIKONFIRMASI: { label: "Dikonfirmasi", color: "bg-blue-100 text-blue-700" },
  MENUNGGU_PENGADAAN: { label: "Menunggu Pengadaan", color: "bg-purple-100 text-purple-700" },
  SIAP_KIRIM: { label: "Siap Kirim", color: "bg-green-100 text-green-700" },
  DALAM_PENGIRIMAN: { label: "Dalam Pengiriman", color: "bg-orange-100 text-orange-700" },
  SELESAI: { label: "Selesai", color: "bg-green-100 text-green-700" },
  DIBATALKAN: { label: "Dibatalkan", color: "bg-red-100 text-red-700" },
};

export default function DapurDashboardClient({
  identity,
  totalOrders,
}: {
  identity: IdentityData;
  totalOrders: number;
}) {
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetch("/api/notifications?dapurIdentityId=current&unread=true")
      .then((r) => r.json())
      .then((res) => setUnreadCount(res.unreadCount || 0))
      .catch(() => {});
  }, []);

  async function handleLogout() {
    await fetch("/portal/api/session", { method: "DELETE" });
    window.location.href = "/portal";
  }

  return (
    <div className="px-4 py-6">
      {/* Header */}
      <div className="mb-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-primary">Selamat datang,</p>
          <h1 className="text-lg font-bold text-gray-900">{identity.displayName}</h1>
          {identity.institution.parentInstitution && (
            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
              <Building2 className="h-3.5 w-3.5 text-gray-400" />
              {identity.institution.parentInstitution.name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/portal/notifications")}
            className="relative rounded-lg p-2 text-gray-400 hover:bg-gray-100"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs text-gray-400 hover:bg-red-50 hover:text-red-600"
          >
            <LogOut className="h-3.5 w-3.5" /> Ganti
          </button>
        </div>
      </div>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-1 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <ShoppingCart className="h-4 w-4 text-primary" />
          </div>
          <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
          <p className="text-xs text-gray-500">Total Pesanan</p>
        </div>
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <div className="mb-1 flex h-8 w-8 items-center justify-center rounded-lg bg-green-100">
            <Package className="h-4 w-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900">
            {identity.orders.filter((o) => o.status === "SELESAI" || o.status === "DIKIRIM").length}
          </p>
          <p className="text-xs text-gray-500">Selesai</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6">
        <button
          onClick={() => router.push("/portal/orders/new")}
          className="flex w-full items-center justify-between rounded-xl bg-primary p-4 text-white shadow-sm active:scale-[0.98]"
        >
          <div className="text-left">
            <p className="text-sm font-semibold">Buat Pesanan Baru</p>
            <p className="text-xs text-white/70">Order kebutuhan dapur Anda</p>
          </div>
          <ArrowRight className="h-5 w-5" />
        </button>
      </div>

      {/* Recent Orders */}
      <div>
        <h2 className="mb-3 text-sm font-semibold text-gray-700">Pesanan Terbaru</h2>
        {identity.orders.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 p-6 text-center">
            <p className="text-sm text-gray-400">Belum ada pesanan</p>
          </div>
        ) : (
          <div className="space-y-2">
            {identity.orders.map((order) => {
              const statusInfo =
                (order.customerStatus && CUSTOMER_STATUS_LABELS[order.customerStatus]) ||
                ORDER_STATUS_LABELS[order.status] ||
                { label: order.status, color: "bg-gray-100 text-gray-700" };

              return (
                <button
                  key={order.id}
                  onClick={() => router.push(`/portal/orders/${order.id}`)}
                  className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-white p-4 text-left active:scale-[0.98]"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">{order.orderNumber}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(order.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${statusInfo.color}`}>
                      {statusInfo.label}
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
      </div>

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white">
        <div className="mx-auto flex max-w-lg">
          <button className="flex flex-1 flex-col items-center py-2 text-primary" onClick={() => router.push("/portal/dashboard")}>
            <Building2 className="h-5 w-5" />
            <span className="mt-0.5 text-xs font-medium">Beranda</span>
          </button>
          <button className="flex flex-1 flex-col items-center py-2 text-gray-400" onClick={() => router.push("/portal/orders")}>
            <Package className="h-5 w-5" />
            <span className="mt-0.5 text-xs">Pesanan</span>
          </button>
          <button className="flex flex-1 flex-col items-center py-2 text-gray-400 relative" onClick={() => router.push("/portal/notifications")}>
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1/4 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white">{unreadCount > 9 ? "9+" : unreadCount}</span>
            )}
            <span className="mt-0.5 text-xs">Notif</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
