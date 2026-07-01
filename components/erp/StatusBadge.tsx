import { cn } from "@/lib/utils/cn";

/**
 * Generic status badge untuk ERP.
 * Warna dipetakan dari nama status (OrderStatus, PaymentStatus, DocumentStatus, dll).
 */

type Tone = "gray" | "blue" | "green" | "amber" | "red" | "purple" | "indigo";

const toneStyles: Record<Tone, string> = {
  gray: "bg-gray-100 text-gray-700",
  blue: "bg-blue-100 text-blue-700",
  green: "bg-green-100 text-green-700",
  amber: "bg-amber-100 text-amber-700",
  red: "bg-red-100 text-red-700",
  purple: "bg-purple-100 text-purple-700",
  indigo: "bg-indigo-100 text-indigo-700",
};

// Peta status -> tone. Nilai default gray untuk yang tak dikenal.
const statusToneMap: Record<string, Tone> = {
  // OrderStatus
  DRAFT: "gray",
  MENUNGGU_KONFIRMASI: "amber",
  DIKONFIRMASI: "blue",
  MENUNGGU_PENGADAAN: "purple",
  SIAP_KIRIM: "indigo",
  DALAM_PENGIRIMAN: "blue",
  TERKIRIM_MENUNGGU_TTD: "amber",
  SELESAI: "green",
  DIBATALKAN: "red",
  // FulfillmentStatus
  BELUM_DIPROSES: "gray",
  SEBAGIAN: "amber",
  LENGKAP: "green",
  // PaymentStatus
  BELUM_BAYAR: "gray",
  MENUNGGU_VALIDASI: "amber",
  LUNAS: "green",
  DITOLAK: "red",
  // DocumentStatus
  DITERBITKAN: "blue",
  DITANDATANGANI_DAPUR: "indigo",
  DITANDATANGANI_KANTOR_PUSAT: "purple",
  // SourcingStatus
  DIBUTUHKAN: "amber",
  SEDANG_DIBANDINGKAN: "blue",
  DIPUTUSKAN: "indigo",
  DIBELI: "green",
  // Disbursement
  BELUM_CAIR: "amber",
  SUDAH_CAIR: "green",
};

export default function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const tone = statusToneMap[status] ?? "gray";
  const label = status
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        toneStyles[tone],
        className
      )}
    >
      {label}
    </span>
  );
}
