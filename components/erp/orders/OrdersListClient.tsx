"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Eye, Pencil, Trash2, Search, ArrowUpDown, ChevronLeft, ChevronRight,
  Loader2, AlertCircle, Calendar, Clock, X, Save, CheckCircle
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { formatCurrency } from "@/lib/utils/decimal";

type OrderItem = {
  id: string;
  orderNumber: string;
  orderType: string;
  channel: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  deliveryAddressText: string | null;
  requestedDeliveryDate: string | null;
  requestedDeliveryTime: string | null;
  deliveryTimeSlot: string | null;
  customerNote: string | null;
  createdAt: string;
  customerName: string;
  institutionName: string;
  parentInstitutionName: string;
  itemCount: number;
};

const STATUS_TABS = [
  { label: "Semua", value: "ALL" },
  { label: "Draft", value: "DRAFT" },
  { label: "Review", value: "MENUNGGU_KONFIRMASI" },
  { label: "Dikonfirmasi", value: "DIKONFIRMASI" },
  { label: "Pengadaan", value: "MENUNGGU_PENGADAAN" },
  { label: "Siap Kirim", value: "SIAP_KIRIM" },
  { label: "Kirim", value: "DALAM_PENGIRIMAN" },
  { label: "Selesai", value: "SELESAI" },
];

const ORDER_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: "Draft", color: "bg-gray-100 text-gray-700 border-gray-200" },
  MENUNGGU_KONFIRMASI: { label: "Menunggu Review", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  DIKONFIRMASI: { label: "Dikonfirmasi", color: "bg-blue-50 text-blue-700 border-blue-200" },
  MENUNGGU_PENGADAAN: { label: "Pengadaan", color: "bg-purple-50 text-purple-700 border-purple-200" },
  SIAP_KIRIM: { label: "Siap Kirim", color: "bg-green-50 text-green-700 border-green-200" },
  DALAM_PENGIRIMAN: { label: "Kirim", color: "bg-orange-50 text-orange-700 border-orange-200" },
  SELESAI: { label: "Selesai", color: "bg-green-100 text-green-800 border-green-300" },
  DIBATALKAN: { label: "Batal", color: "bg-red-50 text-red-700 border-red-200" },
};

const PAYMENT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  BELUM_BAYAR: { label: "Belum Bayar", color: "bg-red-50 text-red-700 border-red-200" },
  SEBAGIAN: { label: "Sebagian", color: "bg-yellow-50 text-yellow-700 border-yellow-200" },
  MENUNGGU_VALIDASI: { label: "Validasi", color: "bg-orange-50 text-orange-700 border-orange-200" },
  LUNAS: { label: "Lunas", color: "bg-green-50 text-green-700 border-green-200" },
  DITOLAK: { label: "Ditolak", color: "bg-red-100 text-red-800 border-red-300" },
};

export default function OrdersListClient({ initialOrders }: { initialOrders: OrderItem[] }) {
  const router = useRouter();
  const [orders, setOrders] = useState<OrderItem[]>(initialOrders);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");

  // Sorting
  const [sortField, setSortField] = useState<keyof OrderItem>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Edit Modal State
  const [editingOrder, setEditingOrder] = useState<OrderItem | null>(null);
  const [editForm, setEditForm] = useState({
    deliveryAddressText: "",
    requestedDeliveryDate: "",
    deliveryTimeSlot: "",
    requestedDeliveryTime: "",
    customerNote: "",
    status: "",
    paymentStatus: "",
  });
  const [savingEdit, setSavingEdit] = useState(false);

  // Delete Modal State
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deletingOrderNumber, setDeletingOrderNumber] = useState("");
  const [deleting, setDeleting] = useState(false);

  const [notification, setNotification] = useState<{ message: string; type: "success" | "error" } | null>(null);

  function triggerNotification(message: string, type: "success" | "error" = "success") {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  }

  // Handle Sort
  function handleSort(field: keyof OrderItem) {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
    setCurrentPage(1);
  }

  // Handle Edit Click
  function handleEditClick(order: OrderItem) {
    setEditingOrder(order);
    setEditForm({
      deliveryAddressText: order.deliveryAddressText || "",
      requestedDeliveryDate: order.requestedDeliveryDate ? order.requestedDeliveryDate.split("T")[0] : "",
      deliveryTimeSlot: order.deliveryTimeSlot || "",
      requestedDeliveryTime: order.requestedDeliveryTime || "",
      customerNote: order.customerNote || "",
      status: order.status,
      paymentStatus: order.paymentStatus,
    });
  }

  // Handle Edit Save
  async function handleSaveEdit() {
    if (!editingOrder) return;
    setSavingEdit(true);
    try {
      const res = await fetch(`/api/orders/${editingOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          deliveryAddressText: editForm.deliveryAddressText || null,
          requestedDeliveryDate: editForm.requestedDeliveryDate ? new Date(editForm.requestedDeliveryDate).toISOString() : null,
          deliveryTimeSlot: editForm.deliveryTimeSlot || null,
          requestedDeliveryTime: editForm.requestedDeliveryTime || null,
          customerNote: editForm.customerNote || null,
          status: editForm.status,
          paymentStatus: editForm.paymentStatus,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal mengubah pesanan");

      setOrders((prev) =>
        prev.map((o) =>
          o.id === editingOrder.id
            ? {
                ...o,
                deliveryAddressText: editForm.deliveryAddressText || null,
                requestedDeliveryDate: editForm.requestedDeliveryDate ? new Date(editForm.requestedDeliveryDate).toISOString() : null,
                deliveryTimeSlot: editForm.deliveryTimeSlot || null,
                requestedDeliveryTime: editForm.requestedDeliveryTime || null,
                customerNote: editForm.customerNote || null,
                status: editForm.status,
                paymentStatus: editForm.paymentStatus,
              }
            : o
        )
      );

      setEditingOrder(null);
      triggerNotification(`Pesanan ${editingOrder.orderNumber} berhasil diupdate!`);
    } catch (err: any) {
      triggerNotification(err.message || "Gagal mengubah pesanan", "error");
    } finally {
      setSavingEdit(false);
    }
  }

  // Handle Delete Click
  function handleDeleteClick(id: string, orderNumber: string) {
    setDeletingId(id);
    setDeletingOrderNumber(orderNumber);
  }

  // Handle Delete Confirm
  async function handleConfirmDelete() {
    if (!deletingId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/orders/${deletingId}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Gagal menghapus pesanan");

      setOrders((prev) => prev.filter((o) => o.id !== deletingId));
      setDeletingId(null);
      triggerNotification(`Pesanan ${deletingOrderNumber} berhasil dihapus!`);
    } catch (err: any) {
      triggerNotification(err.message || "Gagal menghapus pesanan", "error");
    } finally {
      setDeleting(false);
    }
  }

  // Filters logic
  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      !search ||
      order.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      order.customerName.toLowerCase().includes(search.toLowerCase()) ||
      order.institutionName.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || order.status === statusFilter;
    const matchesType = typeFilter === "ALL" || order.orderType === typeFilter;
    const matchesPayment = paymentFilter === "ALL" || order.paymentStatus === paymentFilter;

    return matchesSearch && matchesStatus && matchesType && matchesPayment;
  });

  // Sort logic
  const sortedOrders = [...filteredOrders].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (sortField === "createdAt" || sortField === "requestedDeliveryDate") {
      valA = valA ? new Date(valA).getTime() : 0;
      valB = valB ? new Date(valB).getTime() : 0;
    }

    if (valA === null || valA === undefined) return sortOrder === "asc" ? -1 : 1;
    if (valB === null || valB === undefined) return sortOrder === "asc" ? 1 : -1;

    if (typeof valA === "string" && typeof valB === "string") {
      return sortOrder === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }

    return sortOrder === "asc"
      ? (valA as number) - (valB as number)
      : (valB as number) - (valA as number);
  });

  // Pagination logic
  const totalItems = sortedOrders.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedOrders = sortedOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className={cn(
          "fixed top-4 right-4 z-50 flex items-center gap-2 rounded-lg border px-4 py-3 shadow-lg transition-all animate-in fade-in slide-in-from-top-4 duration-300",
          notification.type === "success" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-800"
        )}>
          <CheckCircle className="h-4 w-4 shrink-0" />
          <span className="text-sm font-medium">{notification.message}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6 overflow-x-auto">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value);
                setCurrentPage(1);
              }}
              className={cn(
                "whitespace-nowrap pb-3 text-sm font-medium border-b-2 transition-all",
                statusFilter === tab.value
                  ? "border-primary text-primary"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              {tab.label}
              {statusFilter === tab.value && (
                <span className="ml-1.5 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary font-bold">
                  {totalItems}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Filters & Actions Panel */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-xl border">
        {/* Search */}
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Cari order, pelanggan..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full rounded-lg border border-gray-300 pl-9 pr-4 py-1.5 text-sm focus:border-primary focus:outline-none"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-end">
          {/* Tipe Filter */}
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
          >
            <option value="ALL">Semua Tipe</option>
            <option value="B2B_GROSIR">B2B Grosir</option>
            <option value="B2C_ECER">B2C Ecer</option>
          </select>

          {/* Payment Filter */}
          <select
            value={paymentFilter}
            onChange={(e) => {
              setPaymentFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
          >
            <option value="ALL">Semua Pembayaran</option>
            <option value="BELUM_BAYAR">Belum Bayar</option>
            <option value="SEBAGIAN">Sebagian</option>
            <option value="MENUNGGU_VALIDASI">Validasi</option>
            <option value="LUNAS">Lunas</option>
            <option value="DITOLAK">Ditolak</option>
          </select>

          {/* Page size select */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
          >
            <option value={10}>10 Baris</option>
            <option value={25}>25 Baris</option>
            <option value={50}>50 Baris</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/50 text-left text-gray-500 font-semibold">
                <th className="px-4 py-3">
                  <button onClick={() => handleSort("orderNumber")} className="flex items-center gap-1 hover:text-gray-700">
                    No. Order <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button onClick={() => handleSort("orderType")} className="flex items-center gap-1 hover:text-gray-700">
                    Tipe <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button onClick={() => handleSort("customerName")} className="flex items-center gap-1 hover:text-gray-700">
                    Pelanggan <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button onClick={() => handleSort("createdAt")} className="flex items-center gap-1 hover:text-gray-700">
                    Tanggal <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-right">
                  <button onClick={() => handleSort("totalAmount")} className="flex items-center gap-1 hover:text-gray-700 justify-end ml-auto">
                    Total <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button onClick={() => handleSort("paymentStatus")} className="flex items-center gap-1 hover:text-gray-700">
                    Pembayaran <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3">
                  <button onClick={() => handleSort("status")} className="flex items-center gap-1 hover:text-gray-700">
                    Status <ArrowUpDown className="h-3 w-3" />
                  </button>
                </th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedOrders.map((o) => {
                const status = ORDER_STATUS_LABELS[o.status] || { label: o.status, color: "bg-gray-100 text-gray-700 border-gray-200" };
                const payment = PAYMENT_STATUS_LABELS[o.paymentStatus] || { label: o.paymentStatus, color: "bg-gray-100 text-gray-700 border-gray-200" };
                return (
                  <tr key={o.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/erp/orders/${o.id}`} className="font-semibold text-primary hover:underline">
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        "rounded px-1.5 py-0.5 text-xs font-semibold uppercase border",
                        o.orderType === "B2B_GROSIR" ? "bg-indigo-50 text-indigo-700 border-indigo-100" : "bg-teal-50 text-teal-700 border-teal-100"
                      )}>
                        {o.orderType === "B2B_GROSIR" ? "B2B" : "B2C"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">
                        {o.institutionName || o.customerName || "Walk-in"}
                      </div>
                      {o.parentInstitutionName && (
                        <div className="text-[10px] text-gray-400">🏢 {o.parentInstitutionName}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {new Date(o.createdAt).toLocaleDateString("id-ID", {
                        day: "numeric", month: "short", year: "numeric"
                      })}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-gray-900">
                      {formatCurrency(o.totalAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full border px-2 py-0.5 text-xs font-semibold leading-relaxed", payment.color)}>
                        {payment.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("rounded-full border px-2 py-0.5 text-xs font-semibold leading-relaxed", status.color)}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Link
                          href={`/erp/orders/${o.id}`}
                          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                        >
                          <Eye className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleEditClick(o)}
                          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClick(o.id, o.orderNumber)}
                          className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {totalItems === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400 font-medium bg-gray-50/50">
                    Tidak ada pesanan ditemukan
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        {totalItems > 0 && (
          <div className="border-t bg-gray-50/50 px-4 py-3 flex items-center justify-between text-xs">
            <span className="text-gray-500 font-medium">
              Menampilkan {Math.min(totalItems, (currentPage - 1) * pageSize + 1)}-{Math.min(totalItems, currentPage * pageSize)} dari {totalItems} baris
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(currentPage - 1)}
                className="rounded border border-gray-300 bg-white p-1 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: totalPages }).map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={cn(
                    "h-6 w-6 rounded border font-semibold transition-colors",
                    currentPage === i + 1
                      ? "border-primary bg-primary text-white"
                      : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50"
                  )}
                >
                  {i + 1}
                </button>
              ))}
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(currentPage + 1)}
                className="rounded border border-gray-300 bg-white p-1 text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-gray-100 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b pb-3 mb-4">
              <h3 className="text-lg font-bold text-gray-950">Edit Detail Pesanan</h3>
              <button onClick={() => setEditingOrder(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Status Pesanan</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full rounded border border-gray-300 px-3 py-1.5 focus:border-primary focus:outline-none"
                  >
                    <option value="DRAFT">Draft</option>
                    <option value="MENUNGGU_KONFIRMASI">Menunggu Review</option>
                    <option value="DIKONFIRMASI">Dikonfirmasi</option>
                    <option value="MENUNGGU_PENGADAAN">Pengadaan</option>
                    <option value="SIAP_KIRIM">Siap Kirim</option>
                    <option value="DALAM_PENGIRIMAN">Kirim</option>
                    <option value="SELESAI">Selesai</option>
                    <option value="DIBATALKAN">Batal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Status Pembayaran</label>
                  <select
                    value={editForm.paymentStatus}
                    onChange={(e) => setEditForm({ ...editForm, paymentStatus: e.target.value })}
                    className="w-full rounded border border-gray-300 px-3 py-1.5 focus:border-primary focus:outline-none"
                  >
                    <option value="BELUM_BAYAR">Belum Bayar</option>
                    <option value="SEBAGIAN">Sebagian</option>
                    <option value="MENUNGGU_VALIDASI">Validasi</option>
                    <option value="LUNAS">Lunas</option>
                    <option value="DITOLAK">Ditolak</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Tanggal Pengiriman</label>
                <input
                  type="date"
                  value={editForm.requestedDeliveryDate}
                  onChange={(e) => setEditForm({ ...editForm, requestedDeliveryDate: e.target.value })}
                  className="w-full rounded border border-gray-300 px-3 py-1.5 focus:border-primary focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Slot Waktu</label>
                  <select
                    value={editForm.deliveryTimeSlot}
                    onChange={(e) => setEditForm({ ...editForm, deliveryTimeSlot: e.target.value })}
                    className="w-full rounded border border-gray-300 px-3 py-1.5 focus:border-primary focus:outline-none"
                  >
                    <option value="">Pilih Slot...</option>
                    <option value="PAGI">Pagi (08:00 - 12:00)</option>
                    <option value="SIANG">Siang (12:00 - 17:00)</option>
                    <option value="SORE">Sore (17:00 - 20:00)</option>
                    <option value="CUSTOM">Custom Waktu</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Waktu Custom</label>
                  <input
                    type="time"
                    disabled={editForm.deliveryTimeSlot !== "CUSTOM"}
                    value={editForm.requestedDeliveryTime}
                    onChange={(e) => setEditForm({ ...editForm, requestedDeliveryTime: e.target.value })}
                    className="w-full rounded border border-gray-300 px-3 py-1.5 focus:border-primary focus:outline-none disabled:bg-gray-100"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Alamat Pengiriman</label>
                <textarea
                  value={editForm.deliveryAddressText}
                  onChange={(e) => setEditForm({ ...editForm, deliveryAddressText: e.target.value })}
                  rows={2}
                  className="w-full rounded border border-gray-300 px-3 py-1.5 focus:border-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Catatan Customer</label>
                <textarea
                  value={editForm.customerNote}
                  onChange={(e) => setEditForm({ ...editForm, customerNote: e.target.value })}
                  rows={2}
                  className="w-full rounded border border-gray-300 px-3 py-1.5 focus:border-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6 border-t pt-4">
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={savingEdit}
                className="flex-1 rounded-lg bg-primary text-white py-2 text-sm font-semibold hover:bg-primary/95 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Simpan
              </button>
              <button
                type="button"
                onClick={() => setEditingOrder(null)}
                className="flex-1 rounded-lg border border-gray-300 bg-white text-gray-700 py-2 text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-xl border border-gray-100 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600 mb-3">
                <Trash2 className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-gray-950">Hapus Pesanan?</h3>
              <p className="text-xs text-gray-500 mt-1 max-w-xs leading-relaxed">
                Apakah Anda yakin ingin menghapus pesanan <span className="font-semibold text-gray-800">{deletingOrderNumber}</span>? Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>

            <div className="flex gap-3 mt-6 border-t pt-4">
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex-1 rounded-lg bg-red-600 text-white py-2 text-sm font-semibold hover:bg-red-700 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
              >
                {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
                Hapus
              </button>
              <button
                type="button"
                onClick={() => setDeletingId(null)}
                className="flex-1 rounded-lg border border-gray-300 bg-white text-gray-700 py-2 text-sm font-semibold hover:bg-gray-50 transition-colors"
              >
                Batal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
