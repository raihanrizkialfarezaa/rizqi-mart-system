"use client";

import Link from "next/link";
import { CheckCircle2, Package, ArrowRight, Copy, Check, Info } from "lucide-react";
import { useState, useEffect } from "react";

type Props = {
  orderId: string;
  orderNumber?: string | null;
  totalAmount?: number | null;
};

export default function OrderSuccessBanner({ orderId, orderNumber, totalAmount }: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const el = document.getElementById(`order-${orderId}`);
    if (el) {
      setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "center" }), 400);
    }
  }, [orderId]);

  const copy = () => {
    if (!orderNumber) return;
    navigator.clipboard.writeText(orderNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm border-l-4 border-l-emerald-500">
      <div className="p-6 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex gap-4">
            <div className="hidden sm:flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-900 text-white">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex sm:hidden h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white">
                  <CheckCircle2 className="h-5 w-5" />
                </span>
                <h2 className="text-base sm:text-[17px] font-semibold tracking-tight text-slate-900">Pesanan berhasil dibuat</h2>
                {orderNumber && (
                  <span className="hidden sm:inline-flex rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                    {orderNumber.slice(-6)}
                  </span>
                )}
              </div>
              <p className="text-sm leading-relaxed text-slate-600 max-w-[60ch]">
                Pesanan kamu sudah tercatat dan sedang diproses untuk alokasi stok. Pesanan terbaru ditandai di daftar bawah.
              </p>

              {orderNumber && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Nomor Pesanan</span>
                  <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 font-mono text-sm font-medium text-slate-900">
                    <Package className="h-4 w-4 text-slate-500" />
                    <span>{orderNumber}</span>
                    <button
                      onClick={copy}
                      className="ml-1 rounded-lg border border-transparent p-1.5 text-slate-500 transition-colors hover:border-slate-200 hover:bg-white hover:text-slate-900"
                      title="Salin nomor pesanan"
                      type="button"
                    >
                      {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>
                  {typeof totalAmount === "number" && (
                    <span className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white">
                      {formatPrice(totalAmount)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-row gap-3 sm:flex-col sm:items-stretch">
            <Link
              href={`/orders/${orderId}`}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 sm:w-[190px]"
            >
              <span>Lihat Detail</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/products"
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 sm:w-[190px]"
            >
              Lanjut Belanja
            </Link>
          </div>
        </div>
      </div>
      <div className="border-t border-slate-100 bg-slate-50 px-6 py-3 sm:px-7 flex items-start gap-2.5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
        <p className="text-sm leading-relaxed text-slate-600">
          Setelah kurir mengantar, tap <span className="font-semibold text-slate-900">Pesanan Diterima</span> pada kartu pesanan agar status berubah menjadi Selesai.
        </p>
      </div>
    </div>
  );
}
