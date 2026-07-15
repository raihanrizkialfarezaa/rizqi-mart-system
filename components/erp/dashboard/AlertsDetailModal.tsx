"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { X, AlertTriangle, Clock, Banknote, FileSignature, Search, Download, ExternalLink } from "lucide-react";
import { formatCurrency } from "@/lib/utils/decimal";
import { formatDate } from "@/lib/utils/date";
import type { DashboardAlertsDetail } from "@/lib/services/dashboard.service";

export type AlertType = "lowStock" | "expiring" | "pendingPayments" | "pendingSignatures" | null;

type SortDir = "asc" | "desc";

type AlertsDetailModalProps = {
  isOpen: boolean;
  onClose: () => void;
  type: AlertType;
  data: DashboardAlertsDetail;
};

const titles: Record<Exclude<AlertType, null>, string> = {
  lowStock: "Detail Stok Menipis",
  expiring: "Detail Produk Akan Kadaluwarsa",
  pendingPayments: "Detail Validasi Pembayaran",
  pendingSignatures: "Detail Menunggu TTD Surat Jalan",
};

const icons: Record<Exclude<AlertType, null>, typeof AlertTriangle> = {
  lowStock: AlertTriangle,
  expiring: Clock,
  pendingPayments: Banknote,
  pendingSignatures: FileSignature,
};

function csvEscape(value: string | number) {
  const text = String(value ?? "");
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename: string, rows: Array<Record<string, string | number>>) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AlertsDetailModal({ isOpen, onClose, type, data }: AlertsDetailModalProps) {
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setSearch("");
    setSortDir("asc");
    window.setTimeout(() => searchRef.current?.focus(), 0);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose, type]);

  const filteredRows = useMemo(() => {
    if (!type) return [];
    const q = search.toLowerCase().trim();

    if (type === "lowStock") {
      return data.lowStock
        .filter((item) => `${item.sku} ${item.name}`.toLowerCase().includes(q))
        .sort((a, b) => {
          const diff = Number(a.totalStock) - Number(b.totalStock);
          return sortDir === "asc" ? diff : -diff;
        });
    }

    if (type === "expiring") {
      return data.expiring
        .filter((item) => `${item.batchNumber} ${item.productName} ${item.productSku}`.toLowerCase().includes(q))
        .sort((a, b) => {
          const diff = new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
          return sortDir === "asc" ? diff : -diff;
        });
    }

    if (type === "pendingPayments") {
      return data.pendingPayments
        .filter((item) => `${item.paymentNumber} ${item.orderNumber} ${item.customerName} ${item.method}`.toLowerCase().includes(q))
        .sort((a, b) => {
          const diff = a.amount - b.amount;
          return sortDir === "asc" ? diff : -diff;
        });
    }

    return data.pendingSignatures
      .filter((item) => `${item.deliveryNoteNumber} ${item.orderNumber} ${item.institutionName} ${item.status}`.toLowerCase().includes(q))
      .sort((a, b) => {
        const diff = a.deliveryNoteNumber.localeCompare(b.deliveryNoteNumber);
        return sortDir === "asc" ? diff : -diff;
      });
  }, [data, search, sortDir, type]);

  if (!isOpen || !type) return null;

  const HeaderIcon = icons[type];
  const sortLabel = type === "lowStock" ? "Stok" : type === "expiring" ? "Expiry" : type === "pendingPayments" ? "Nominal" : "Dokumen";

  const handleExport = () => {
    if (type === "lowStock") {
      downloadCsv("stok-menipis.csv", filteredRows.map((item: any) => ({ sku: item.sku, produk: item.name, stok_b2c: item.totalStock, minimum: item.minStockAlert, satuan: item.baseUnitCode })));
    } else if (type === "expiring") {
      downloadCsv("stok-kadaluwarsa.csv", filteredRows.map((item: any) => ({ batch: item.batchNumber, produk: item.productName, sku: item.productSku, sisa: item.qtyRemaining, expiry: formatDate(item.expiryDate) })));
    } else if (type === "pendingPayments") {
      downloadCsv("validasi-pembayaran.csv", filteredRows.map((item: any) => ({ payment: item.paymentNumber, order: item.orderNumber, pelanggan: item.customerName, metode: item.method, jumlah: item.amount })));
    } else {
      downloadCsv("ttd-surat-jalan.csv", filteredRows.map((item: any) => ({ surat_jalan: item.deliveryNoteNumber, order: item.orderNumber, institusi: item.institutionName, status: item.status })));
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-alert-modal-title"
        className="relative w-full max-w-4xl rounded-xl border border-gray-150 bg-white p-5 shadow-2xl animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="flex flex-col gap-4 border-b border-gray-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <HeaderIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 id="dashboard-alert-modal-title" className="text-lg font-bold text-gray-900">
                {titles[type]}
              </h3>
              <p className="text-xs text-gray-500">{filteredRows.length} item ditampilkan. Tekan Esc untuk menutup.</p>
            </div>
          </div>
          <button onClick={onClose} className="self-start rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700" aria-label="Tutup modal">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              ref={searchRef}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Cari SKU, batch, order, pelanggan..."
              className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <button
            onClick={() => setSortDir((prev) => (prev === "asc" ? "desc" : "asc"))}
            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
          >
            Sort {sortLabel}: {sortDir === "asc" ? "Naik" : "Turun"}
          </button>
          <button
            onClick={handleExport}
            disabled={filteredRows.length === 0}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            CSV
          </button>
        </div>

        <div className="mt-4 max-h-[420px] overflow-auto rounded-lg border border-gray-200">
          <table className="w-full text-left text-sm">
            {type === "lowStock" && (
              <>
                <thead className="sticky top-0 bg-gray-50 text-xs uppercase text-gray-600">
                  <tr><th className="px-4 py-3">SKU</th><th className="px-4 py-3">Produk</th><th className="px-4 py-3 text-right">Stok B2C</th><th className="px-4 py-3 text-right">Minimum</th><th className="px-4 py-3 text-center">Aksi</th></tr>
                </thead>
                <tbody className="divide-y">
                  {(filteredRows as DashboardAlertsDetail["lowStock"]).map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50"><td className="px-4 py-3 font-mono text-xs text-gray-500">{item.sku}</td><td className="px-4 py-3 font-medium text-gray-900">{item.name}</td><td className="px-4 py-3 text-right font-bold text-red-600">{item.totalStock} {item.baseUnitCode}</td><td className="px-4 py-3 text-right text-gray-600">{item.minStockAlert} {item.baseUnitCode}</td><td className="px-4 py-3 text-center"><Link href={item.href} className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-xs font-semibold text-primary"><ExternalLink className="h-3 w-3" /> Buka</Link></td></tr>
                  ))}
                </tbody>
              </>
            )}

            {type === "expiring" && (
              <>
                <thead className="sticky top-0 bg-gray-50 text-xs uppercase text-gray-600">
                  <tr><th className="px-4 py-3">Batch</th><th className="px-4 py-3">Produk</th><th className="px-4 py-3 text-right">Sisa</th><th className="px-4 py-3 text-right">Expiry</th><th className="px-4 py-3 text-center">Aksi</th></tr>
                </thead>
                <tbody className="divide-y">
                  {(filteredRows as DashboardAlertsDetail["expiring"]).map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50"><td className="px-4 py-3 font-mono text-xs text-gray-500">{item.batchNumber}</td><td className="px-4 py-3 font-medium text-gray-900">{item.productName}<span className="block text-[10px] text-gray-400">{item.productSku}</span></td><td className="px-4 py-3 text-right font-medium text-gray-700">{item.qtyRemaining}</td><td className="px-4 py-3 text-right font-bold text-amber-600">{formatDate(item.expiryDate)}</td><td className="px-4 py-3 text-center"><Link href={item.href} className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-xs font-semibold text-primary"><ExternalLink className="h-3 w-3" /> Buka</Link></td></tr>
                  ))}
                </tbody>
              </>
            )}

            {type === "pendingPayments" && (
              <>
                <thead className="sticky top-0 bg-gray-50 text-xs uppercase text-gray-600">
                  <tr><th className="px-4 py-3">Payment</th><th className="px-4 py-3">Order</th><th className="px-4 py-3">Pelanggan</th><th className="px-4 py-3">Metode</th><th className="px-4 py-3 text-right">Jumlah</th><th className="px-4 py-3 text-center">Aksi</th></tr>
                </thead>
                <tbody className="divide-y">
                  {(filteredRows as DashboardAlertsDetail["pendingPayments"]).map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50"><td className="px-4 py-3 font-mono text-xs text-gray-500">{item.paymentNumber}</td><td className="px-4 py-3 font-semibold text-primary">{item.orderNumber}</td><td className="px-4 py-3 text-gray-700">{item.customerName}</td><td className="px-4 py-3 text-xs font-semibold text-gray-600">{item.method}</td><td className="px-4 py-3 text-right font-bold text-green-700">{formatCurrency(item.amount)}</td><td className="px-4 py-3 text-center"><Link href={item.href} className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-xs font-semibold text-primary"><ExternalLink className="h-3 w-3" /> Buka</Link></td></tr>
                  ))}
                </tbody>
              </>
            )}

            {type === "pendingSignatures" && (
              <>
                <thead className="sticky top-0 bg-gray-50 text-xs uppercase text-gray-600">
                  <tr><th className="px-4 py-3">Surat Jalan</th><th className="px-4 py-3">Order</th><th className="px-4 py-3">Institusi</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-center">Aksi</th></tr>
                </thead>
                <tbody className="divide-y">
                  {(filteredRows as DashboardAlertsDetail["pendingSignatures"]).map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50"><td className="px-4 py-3 font-mono text-xs text-gray-500">{item.deliveryNoteNumber}</td><td className="px-4 py-3 font-semibold text-primary">{item.orderNumber}</td><td className="px-4 py-3 text-gray-700">{item.institutionName}</td><td className="px-4 py-3"><span className="rounded bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">{item.status}</span></td><td className="px-4 py-3 text-center"><Link href={item.href} className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-xs font-semibold text-primary"><ExternalLink className="h-3 w-3" /> Buka</Link></td></tr>
                  ))}
                </tbody>
              </>
            )}
          </table>

          {filteredRows.length === 0 && (
            <div className="px-4 py-10 text-center text-sm text-gray-400">Tidak ada data yang sesuai filter.</div>
          )}
        </div>
      </div>
    </div>
  );
}
