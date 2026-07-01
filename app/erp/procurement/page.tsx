import Link from "next/link";
import { SourcingStatus } from "@prisma/client";
import { Truck, Package } from "lucide-react";
import StatusBadge from "@/components/erp/StatusBadge";
import FilterTabs from "@/components/erp/FilterTabs";
import { PageHeader } from "@/components/erp/Panel";
import { Table, THead, TH, TBody, TR, TD, EmptyRow } from "@/components/erp/Table";
import { formatDate } from "@/lib/utils/date";
import { getSourcingRequests } from "@/lib/services/procurement.service";

export const dynamic = "force-dynamic";

const statusTabs = [
  { label: "Semua", value: "ALL" },
  { label: "Dibutuhkan", value: SourcingStatus.DIBUTUHKAN },
  { label: "Dibandingkan", value: SourcingStatus.SEDANG_DIBANDINGKAN },
  { label: "Diputuskan", value: SourcingStatus.DIPUTUSKAN },
  { label: "Dibeli", value: SourcingStatus.DIBELI },
];

const subNav = [
  { label: "Sourcing", href: "/erp/procurement", icon: Package, active: true },
  { label: "Purchase Order", href: "/erp/procurement/purchase-orders", icon: Truck, active: false },
];

async function loadSourcing(status?: SourcingStatus) {
  try {
    const requests = await getSourcingRequests({ status, limit: 100 });
    return { requests, error: false };
  } catch {
    return { requests: [], error: true };
  }
}

export default async function ProcurementPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const statusParam = searchParams.status as SourcingStatus | undefined;
  const { requests, error } = await loadSourcing(statusParam);

  return (
    <div>
      <PageHeader
        title="Pengadaan (Sourcing)"
        description="Permintaan pengadaan untuk item B2B yang tidak ready stok."
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

      <div className="mb-4">
        <FilterTabs
          tabs={statusTabs}
          activeValue={statusParam ?? "ALL"}
          paramName="status"
          basePath="/erp/procurement"
        />
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Database belum terhubung — data sourcing kosong.
        </div>
      )}

      <Table>
        <THead>
          <tr>
            <TH>Produk</TH>
            <TH>Order</TH>
            <TH>Institusi</TH>
            <TH className="text-right">Qty Dibutuhkan</TH>
            <TH>Deadline</TH>
            <TH className="text-center">Quote</TH>
            <TH>Status</TH>
          </tr>
        </THead>
        <TBody>
          {requests.length === 0 ? (
            <EmptyRow colSpan={7} message="Tidak ada permintaan pengadaan" />
          ) : (
            requests.map((r) => (
              <TR key={r.id}>
                <TD>
                  <Link
                    href={`/erp/procurement/${r.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {r.product.name}
                  </Link>
                </TD>
                <TD className="text-xs text-gray-500">
                  {r.salesOrderItem.salesOrder.orderNumber}
                </TD>
                <TD>{r.salesOrderItem.salesOrder.institution?.name ?? "—"}</TD>
                <TD className="text-right">
                  {r.qtyNeeded.toString()} {r.unit.code}
                </TD>
                <TD>{formatDate(r.deadline)}</TD>
                <TD className="text-center">{r.priceQuotes.length}</TD>
                <TD>
                  <StatusBadge status={r.status} />
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>
    </div>
  );
}
