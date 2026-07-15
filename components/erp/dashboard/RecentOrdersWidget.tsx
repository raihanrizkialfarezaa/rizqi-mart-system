"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search, ArrowUpDown, ArrowRight, Eye, RefreshCw, Calendar
} from "lucide-react";
import StatusBadge from "@/components/erp/StatusBadge";
import { formatCurrency } from "@/lib/utils/decimal";
import { formatDate } from "@/lib/utils/date";
import type { RecentOrderRow } from "@/lib/services/dashboard.service";

type RecentOrdersWidgetProps = {
  initialOrders: RecentOrderRow[];
};

export default function RecentOrdersWidget({ initialOrders }: RecentOrdersWidgetProps) {
  const router = useRouter();
  const [orders] = useState<RecentOrderRow[]>(initialOrders);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(false);

  // Filter & Search logic
  const filteredOrders = orders.filter((o) => {
    const customerName = o.customer?.name ?? o.institution?.name ?? "Walk-in";
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      customerName.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || o.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  // Sort logic
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return sortOrder === "asc" ? timeA - timeB : timeB - timeA;
  });

  const toggleSort = () => {
    setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
  };

  const handleRefresh = async () => {
    setLoading(true);
    router.refresh();
    setTimeout(() => setLoading(false), 700);
  };

  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Pesanan Terbaru</h3>
          <p className="text-xs text-gray-500">Monitoring status pesanan B2C & B2B secara real-time.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="p-2 border rounded-lg hover:bg-gray-50 text-gray-500 transition-colors"
            title="Muat Ulang Data"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <Link
            href="/erp/orders"
            className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            Lihat semua <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center mb-4">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Cari No. Order / Pelanggan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 py-1.5 pl-9 pr-4 text-xs focus:border-primary focus:outline-none"
          />
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-gray-400" />
        </div>

        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 py-1.5 px-3 text-xs bg-white text-gray-700 focus:border-primary focus:outline-none"
          >
            <option value="ALL">Semua Status</option>
            <option value="DRAFT">Draft</option>
            <option value="MENUNGGU_KONFIRMASI">Menunggu Review</option>
            <option value="DIKONFIRMASI">Dikonfirmasi</option>
            <option value="MENUNGGU_PENGADAAN">Pengadaan</option>
            <option value="SIAP_KIRIM">Siap Kirim</option>
            <option value="DALAM_PENGIRIMAN">Dalam Pengiriman</option>
            <option value="TERKIRIM_MENUNGGU_TTD">Menunggu TTD</option>
            <option value="SELESAI">Selesai</option>
            <option value="DIBATALKAN">Batal</option>
          </select>

          <button
            onClick={toggleSort}
            className="flex items-center gap-1.5 rounded-lg border border-gray-300 py-1.5 px-3 text-xs hover:bg-gray-50 text-gray-700 font-medium"
            title="Urutkan berdasarkan Tanggal"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            Tanggal ({sortOrder === "asc" ? "Lama" : "Baru"})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200">
        <table className="w-full text-left text-sm text-gray-500">
          <thead className="bg-gray-50 text-xs uppercase text-gray-700 border-b">
            <tr>
              <th className="px-4 py-3">No. Order</th>
              <th className="px-4 py-3">Pelanggan</th>
              <th className="px-4 py-3">Tanggal Pembuatan</th>
              <th className="px-4 py-3 text-right">Total Nominal</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedOrders.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">
                  Tidak ada pesanan yang sesuai filter.
                </td>
              </tr>
            ) : (
              sortedOrders.map((o) => {
                const customerName = o.customer?.name ?? o.institution?.name ?? "Walk-in";
                return (
                  <tr key={o.id} className="bg-white hover:bg-gray-50 text-gray-900 transition-colors">
                    <td className="px-4 py-3 font-semibold text-primary">
                      <Link href={`/erp/orders/${o.id}`} className="hover:underline">
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 max-w-[150px] truncate" title={customerName}>
                      {customerName}
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5 text-gray-400" />
                        {formatDate(o.createdAt)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {formatCurrency(o.totalAmount.toString())}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Link
                        href={`/erp/orders/${o.id}`}
                        className="inline-flex items-center gap-1 rounded bg-primary/5 hover:bg-primary/10 text-primary text-xs font-semibold px-2 py-1 transition-colors"
                      >
                        <Eye className="h-3 w-3" />
                        Detail
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
