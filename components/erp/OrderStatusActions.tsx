"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OrderStatus } from "@prisma/client";
import { Loader2, ChevronDown } from "lucide-react";

/**
 * Tombol aksi transisi status pesanan.
 * Menampilkan hanya transisi valid sesuai state machine (Section 7.1).
 */

const validTransitions: Record<OrderStatus, OrderStatus[]> = {
  DRAFT: ["MENUNGGU_KONFIRMASI", "DIBATALKAN"],
  MENUNGGU_KONFIRMASI: ["DIKONFIRMASI", "DIBATALKAN"],
  DIKONFIRMASI: ["MENUNGGU_PENGADAAN", "SIAP_KIRIM", "DIBATALKAN"],
  MENUNGGU_PENGADAAN: ["SIAP_KIRIM"],
  SIAP_KIRIM: ["DALAM_PENGIRIMAN"],
  DALAM_PENGIRIMAN: ["TERKIRIM_MENUNGGU_TTD", "SELESAI"],
  TERKIRIM_MENUNGGU_TTD: ["SELESAI"],
  SELESAI: [],
  DIBATALKAN: [],
};

const labels: Record<OrderStatus, string> = {
  DRAFT: "Draft",
  MENUNGGU_KONFIRMASI: "Menunggu Konfirmasi",
  DIKONFIRMASI: "Konfirmasi",
  MENUNGGU_PENGADAAN: "Menunggu Pengadaan",
  SIAP_KIRIM: "Tandai Siap Kirim",
  DALAM_PENGIRIMAN: "Mulai Pengiriman",
  TERKIRIM_MENUNGGU_TTD: "Terkirim (Menunggu TTD)",
  SELESAI: "Selesaikan",
  DIBATALKAN: "Batalkan",
};

export default function OrderStatusActions({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: OrderStatus;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<OrderStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const nextStatuses = validTransitions[currentStatus] ?? [];

  async function transition(status: OrderStatus) {
    setLoading(status);
    setError(null);
    try {
      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Gagal update");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal update status");
    } finally {
      setLoading(null);
      setOpen(false);
    }
  }

  if (nextStatuses.length === 0) {
    return (
      <span className="text-sm text-gray-400">Tidak ada aksi tersedia</span>
    );
  }

  const primary = nextStatuses[0];
  const rest = nextStatuses.slice(1);

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <button
          onClick={() => transition(primary)}
          disabled={loading !== null}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60"
        >
          {loading === primary && <Loader2 className="h-4 w-4 animate-spin" />}
          {labels[primary]}
        </button>

        {rest.length > 0 && (
          <div className="relative">
            <button
              onClick={() => setOpen((v) => !v)}
              disabled={loading !== null}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Lainnya <ChevronDown className="h-4 w-4" />
            </button>
            {open && (
              <div className="absolute right-0 z-10 mt-1 w-52 rounded-lg border bg-white py-1 shadow-lg">
                {rest.map((s) => (
                  <button
                    key={s}
                    onClick={() => transition(s)}
                    disabled={loading !== null}
                    className="block w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {labels[s]}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
