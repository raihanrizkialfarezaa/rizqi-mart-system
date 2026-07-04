import Link from "next/link";
import { Boxes, Layers, History, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/erp/Panel";
import { Table, THead, TH, TBody, TR, TD, EmptyRow } from "@/components/erp/Table";
import { formatDate } from "@/lib/utils/date";
import { getProductStockLevels } from "@/lib/services/inventory-dashboard.service";

export const dynamic = "force-dynamic";

async function loadStock() {
  try {
    return { rows: await getProductStockLevels(), error: false };
  } catch {
    return { rows: [], error: true };
  }
}

const subNav = [
  { label: "Stok Produk", href: "/erp/inventory", icon: Boxes, active: true },
  { label: "Batch", href: "/erp/inventory/batches", icon: Layers, active: false },
  { label: "Pergerakan", href: "/erp/inventory/movements", icon: History, active: false },
];

export default async function InventoryPage() {
  const { rows, error } = await loadStock();
  const lowCount = rows.filter((r) => r.isLow).length;

  return (
    <div>
      <PageHeader
        title="Inventori"
        description={`${rows.length} produk aktif • ${lowCount} stok menipis`}
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
          Database belum terhubung — data stok kosong.
        </div>
      )}

      <Table>
        <THead>
          <tr>
            <TH>SKU</TH>
            <TH>Produk</TH>
            <TH>Kategori</TH>
            <TH className="text-right">Stok Fisik</TH>
            <TH className="text-right">Booking B2B</TH>
            <TH className="text-right">Stok B2C</TH>
            <TH className="text-right">Min. Alert</TH>
            <TH className="text-center">Batch</TH>
            <TH>Expiry Terdekat</TH>
          </tr>
        </THead>
        <TBody>
          {rows.length === 0 ? (
            <EmptyRow colSpan={9} message="Tidak ada produk" />
          ) : (
            rows.map((r) => (
              <TR key={r.id}>
                <TD className="font-mono text-xs">{r.sku}</TD>
                <TD className="font-medium">
                  <span className="flex items-center gap-2">
                    {r.name}
                    {r.isLow && (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                  </span>
                </TD>
                <TD>{r.categoryName}</TD>
                <TD className="text-right font-medium text-gray-900">
                  {r.totalStock} {r.baseUnitCode}
                </TD>
                <TD className="text-right font-semibold text-blue-600">
                  {Number(r.bookedStock) > 0 ? (
                    <span className="rounded bg-blue-50 px-1.5 py-0.5 border border-blue-100 text-xs">
                      {r.bookedStock} {r.baseUnitCode}
                    </span>
                  ) : "—"}
                </TD>
                <TD className="text-right font-semibold">
                  <span className={r.isLow ? "text-red-600 font-bold" : "text-green-600"}>
                    {r.b2cStock} {r.baseUnitCode}
                  </span>
                </TD>
                <TD className="text-right text-gray-500">{r.minStockAlert}</TD>
                <TD className="text-center">{r.batchCount}</TD>
                <TD>
                  {r.nearestExpiry ? formatDate(r.nearestExpiry) : "—"}
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>
    </div>
  );
}
