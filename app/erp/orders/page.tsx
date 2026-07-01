import Link from "next/link";
import { Plus } from "lucide-react";
import { OrderStatus, OrderType } from "@prisma/client";
import StatusBadge from "@/components/erp/StatusBadge";
import FilterTabs from "@/components/erp/FilterTabs";
import { PageHeader } from "@/components/erp/Panel";
import { Table, THead, TH, TBody, TR, TD, EmptyRow } from "@/components/erp/Table";
import { formatCurrency } from "@/lib/utils/decimal";
import { formatDate } from "@/lib/utils/date";
import { getSalesOrders } from "@/lib/services/sales-order.service";

export const dynamic = "force-dynamic";

const statusTabs = [
  { label: "Semua", value: "ALL" },
  { label: "Menunggu Konfirmasi", value: OrderStatus.MENUNGGU_KONFIRMASI },
  { label: "Dikonfirmasi", value: OrderStatus.DIKONFIRMASI },
  { label: "Pengadaan", value: OrderStatus.MENUNGGU_PENGADAAN },
  { label: "Siap Kirim", value: OrderStatus.SIAP_KIRIM },
  { label: "Dalam Pengiriman", value: OrderStatus.DALAM_PENGIRIMAN },
  { label: "Selesai", value: OrderStatus.SELESAI },
];

type OrderRow = {
  id: string;
  orderNumber: string;
  orderType: OrderType;
  status: OrderStatus;
  paymentStatus: string;
  totalAmount: { toString: () => string };
  createdAt: Date;
  customer: { name: string } | null;
  institution: { name: string } | null;
  items: unknown[];
};

async function loadOrders(status?: OrderStatus) {
  try {
    const { orders, total } = await getSalesOrders({
      status,
      limit: 100,
    });
    return { orders: orders as unknown as OrderRow[], total, error: false };
  } catch {
    return { orders: [] as OrderRow[], total: 0, error: true };
  }
}

export default async function ErpOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  const statusParam = searchParams.status as OrderStatus | undefined;
  const { orders, total, error } = await loadOrders(statusParam);

  return (
    <div>
      <PageHeader
        title="Manajemen Pesanan"
        description={`${total} pesanan${statusParam ? " (terfilter)" : ""}`}
        action={
          <Link
            href="/erp/orders/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Buat Pesanan
          </Link>
        }
      />

      <div className="mb-4">
        <FilterTabs
          tabs={statusTabs}
          activeValue={statusParam ?? "ALL"}
          paramName="status"
          basePath="/erp/orders"
        />
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          Database belum terhubung — daftar pesanan kosong.
        </div>
      )}

      <Table>
        <THead>
          <tr>
            <TH>No. Order</TH>
            <TH>Tipe</TH>
            <TH>Pelanggan</TH>
            <TH>Tanggal</TH>
            <TH className="text-right">Total</TH>
            <TH>Pembayaran</TH>
            <TH>Status</TH>
          </tr>
        </THead>
        <TBody>
          {orders.length === 0 ? (
            <EmptyRow colSpan={7} message="Tidak ada pesanan" />
          ) : (
            orders.map((o) => (
              <TR key={o.id}>
                <TD>
                  <Link
                    href={`/erp/orders/${o.id}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {o.orderNumber}
                  </Link>
                </TD>
                <TD>
                  <span className="text-xs font-medium text-gray-500">
                    {o.orderType === OrderType.B2B_GROSIR ? "B2B" : "B2C"}
                  </span>
                </TD>
                <TD>{o.customer?.name ?? o.institution?.name ?? "Walk-in"}</TD>
                <TD>{formatDate(o.createdAt)}</TD>
                <TD className="text-right font-medium">
                  {formatCurrency(o.totalAmount.toString())}
                </TD>
                <TD>
                  <StatusBadge status={o.paymentStatus} />
                </TD>
                <TD>
                  <StatusBadge status={o.status} />
                </TD>
              </TR>
            ))
          )}
        </TBody>
      </Table>
    </div>
  );
}
