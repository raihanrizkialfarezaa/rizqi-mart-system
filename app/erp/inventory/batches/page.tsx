import Link from "next/link";
import { Boxes, Layers, History } from "lucide-react";
import { PageHeader } from "@/components/erp/Panel";
import { Table, THead, TH, TBody, TR, TD, EmptyRow } from "@/components/erp/Table";
import { formatCurrency } from "@/lib/utils/decimal";
import { formatDate } from "@/lib/utils/date";
import { getAllBatches } from "@/lib/services/inventory-dashboard.service";

export const dynamic = "force-dynamic";

async function loadBatches() {
  try {
    return { batches: await getAllBatches(), error: false };
  } catch {
    return { batches: [], error: true };
  }
}

const subNav = [
  { label: "Stok Produk", href: "/erp/inventory", icon: Boxes, active: false },
  { label: "Batch", href: "/erp/inventory/batches", icon: Layers, active: true },
  { label: "Pergerakan", href: "/erp/inventory/movements", icon: History, active: false },
];

function expiryTone(date: Date | null): string {
  if (!date) return "text-gray-400";
  const days = Math.ceil((date.getTime() - Date.now()) / 86400000);
  if (days < 0) return "text-red-600 font-medium";
  if (days <= 7) return "text-amber-600 font-medium";
  return "text-gray-700";
}

export default async function BatchesPage() {
  const { batches, error } = await loadBatches();

  return (
    <div>
      <PageHeader
        title="Manajemen Batch"
        description={`${batches.length} batch aktif dengan sisa stok`}
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
          Database belum terhubung — data batch kosong.
        </div>
      )}

      <Table>
        <THead>
          <tr>
            <TH>Kode Batch</TH>
            <TH>Produk</TH>
            <TH className="text-right">Sisa / Diterima</TH>
            <TH className="text-right">HPP/unit</TH>
            <TH>Diterima</TH>
            <TH>Kadaluwarsa</TH>
          </tr>
        </THead>
        <TBody>
          {batches.length === 0 ? (
            <EmptyRow colSpan={6} message="Tidak ada batch" />
          ) : (
            batches.map((b) => (
              <TR key={b.id}>
                <TD className="font-mono text-xs">{b.batchCode}</TD>
                <TD className="font-medium">
                  {b.product.name}
                  <span className="ml-1 text-xs text-gray-400">
                    ({b.product.baseUnit.code})
                  </span>
                </TD>
                <TD className="text-right">
                  {b.qtyRemainingBase.toString()} / {b.qtyReceivedBase.toString()}
                </TD>
                <TD className="text-right">
                  {formatCurrency(b.unitCostBase.toString())}
                </TD>
                <TD>{formatDate(b.receivedAt)}</TD>
                <TD className={expiryTone(b.expiryDate)}>
                  {b.expiryDate ? formatDate(b.expiryDate) : "—"}
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>
    </div>
  );
}
