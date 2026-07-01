import Link from "next/link";
import { Boxes, Layers, History, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/erp/Panel";
import { Table, THead, TH, TBody, TR, TD, EmptyRow } from "@/components/erp/Table";
import { formatDateTime } from "@/lib/utils/date";
import { getRecentMovements } from "@/lib/services/inventory-dashboard.service";

export const dynamic = "force-dynamic";

async function loadMovements() {
  try {
    return { movements: await getRecentMovements(100), error: false };
  } catch {
    return { movements: [], error: true };
  }
}

const subNav = [
  { label: "Stok Produk", href: "/erp/inventory", icon: Boxes, active: false },
  { label: "Batch", href: "/erp/inventory/batches", icon: Layers, active: false },
  { label: "Pergerakan", href: "/erp/inventory/movements", icon: History, active: true },
];

const movementLabels: Record<string, string> = {
  MASUK_PEMBELIAN: "Masuk - Pembelian",
  MASUK_RETUR: "Masuk - Retur",
  MASUK_PENYESUAIAN: "Masuk - Penyesuaian",
  KELUAR_PENJUALAN: "Keluar - Penjualan",
  KELUAR_RETUR: "Keluar - Retur",
  KELUAR_PENYESUAIAN: "Keluar - Penyesuaian",
  KELUAR_KADALUWARSA: "Keluar - Kadaluwarsa",
};

export default async function MovementsPage() {
  const { movements, error } = await loadMovements();

  return (
    <div>
      <PageHeader
        title="Riwayat Pergerakan Stok"
        description="Ledger audit immutable (100 terbaru)"
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {subNav.map((n) => (
          <Link
            key={n.href}
            href={n.href}
            className={
              n.active
                ? "inline-flex items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-white"
                : "inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
            }
          >
            <n.icon className="h-4 w-4" />
            {n.label}
          </Link>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Database belum terhubung — data pergerakan kosong.
        </div>
      )}

      <Table>
        <THead>
          <tr>
            <TH>Waktu</TH>
            <TH>Produk</TH>
            <TH>Tipe</TH>
            <TH>Batch</TH>
            <TH className="text-right">Qty</TH>
            <TH>Catatan</TH>
          </tr>
        </THead>
        <TBody>
          {movements.length === 0 ? (
            <EmptyRow colSpan={6} message="Tidak ada pergerakan" />
          ) : (
            movements.map((m) => {
              const isOut = m.qtyBase.toNumber() < 0;
              return (
                <TR key={m.id}>
                  <TD className="whitespace-nowrap text-xs text-gray-500">
                    {formatDateTime(m.createdAt)}
                  </TD>
                  <TD className="font-medium">{m.product.name}</TD>
                  <TD>
                    <span className="text-xs text-gray-600">
                      {movementLabels[m.type] ?? m.type}
                    </span>
                  </TD>
                  <TD className="font-mono text-xs">
                    {m.stockBatch?.batchCode ?? "—"}
                  </TD>
                  <TD className="text-right">
                    <span
                      className={
                        isOut
                          ? "inline-flex items-center gap-1 font-medium text-red-600"
                          : "inline-flex items-center gap-1 font-medium text-green-600"
                      }
                    >
                      {isOut ? (
                        <ArrowDownRight className="h-3 w-3" />
                      ) : (
                        <ArrowUpRight className="h-3 w-3" />
                      )}
                      {m.qtyBase.toString()}
                    </span>
                  </TD>
                  <TD className="max-w-xs truncate text-xs text-gray-400">
                    {m.notes ?? "—"}
                  </TD>
                </TR>
              );
            })
          )}
        </TBody>
      </Table>
    </div>
  );
}
