import Link from "next/link";
import { Truck, Package } from "lucide-react";
import { PageHeader } from "@/components/erp/Panel";
import StatusBadge from "@/components/erp/StatusBadge";
import { Table, THead, TH, TBody, TR, TD, EmptyRow } from "@/components/erp/Table";
import { formatCurrency } from "@/lib/utils/decimal";
import { formatDate } from "@/lib/utils/date";
import { getPurchaseOrders } from "@/lib/services/procurement.service";

export const dynamic = "force-dynamic";

const subNav = [
  { label: "Sourcing", href: "/erp/procurement", icon: Package, active: false },
  { label: "Purchase Order", href: "/erp/procurement/purchase-orders", icon: Truck, active: true },
];

async function loadPOs() {
  try {
    return { pos: await getPurchaseOrders(100), error: false };
  } catch {
    return { pos: [], error: true };
  }
}

export default async function PurchaseOrdersPage() {
  const { pos, error } = await loadPOs();

  return (
    <div>
      <PageHeader
        title="Purchase Order"
        description={`${pos.length} PO tercatat`}
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
          Database belum terhubung — data PO kosong.
        </div>
      )}

      <Table>
        <THead>
          <tr>
            <TH>No. PO</TH>
            <TH>Supplier</TH>
            <TH>Tujuan</TH>
            <TH className="text-center">Item</TH>
            <TH className="text-right">Total</TH>
            <TH>Tanggal</TH>
            <TH>Status</TH>
          </tr>
        </THead>
        <TBody>
          {pos.length === 0 ? (
            <EmptyRow colSpan={7} message="Tidak ada purchase order" />
          ) : (
            pos.map((po) => (
              <TR key={po.id}>
                <TD className="font-medium">{po.poNumber}</TD>
                <TD>{po.supplier.name}</TD>
                <TD className="max-w-xs truncate text-gray-600">{po.purpose}</TD>
                <TD className="text-center">{po.items.length}</TD>
                <TD className="text-right font-medium">
                  {formatCurrency(po.totalAmount.toString())}
                </TD>
                <TD>{formatDate(po.createdAt)}</TD>
                <TD>
                  <StatusBadge status={po.status} />
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>
    </div>
  );
}
