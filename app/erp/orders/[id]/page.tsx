import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  User,
  Building2,
  MapPin,
  FileText,
  Receipt,
} from "lucide-react";
import StatusBadge from "@/components/erp/StatusBadge";
import { Panel, PanelHeader } from "@/components/erp/Panel";
import { Table, THead, TH, TBody, TR, TD } from "@/components/erp/Table";
import { formatCurrency } from "@/lib/utils/decimal";
import { formatDateTime } from "@/lib/utils/date";
import { getSalesOrderById } from "@/lib/services/sales-order.service";
import OrderStatusActions from "@/components/erp/OrderStatusActions";

export const dynamic = "force-dynamic";

export default async function ErpOrderDetailPage({
  params,
}: {
  params: { id: string };
}) {
  let order;
  try {
    order = await getSalesOrderById(params.id);
  } catch {
    order = null;
  }

  if (!order) notFound();

  const customerName =
    order.customer?.name ?? order.institution?.name ?? "Walk-in";
  const isB2B = order.orderType === "B2B_GROSIR";

  return (
    <div>
      <Link
        href="/erp/orders"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke daftar pesanan
      </Link>

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">
              {order.orderNumber}
            </h2>
            <StatusBadge status={order.status} />
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Dibuat {formatDateTime(order.createdAt)} • {isB2B ? "B2B Grosir" : "B2C Ecer"}
          </p>
        </div>
        <OrderStatusActions
          orderId={order.id}
          currentStatus={order.status}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-6 lg:col-span-2">
          <Panel>
            <PanelHeader title="Item Pesanan" />
            <Table>
              <THead>
                <tr>
                  <TH>Produk</TH>
                  <TH className="text-right">Qty</TH>
                  <TH className="text-right">Harga</TH>
                  <TH className="text-right">Subtotal</TH>
                  <TH>Stok</TH>
                </tr>
              </THead>
              <TBody>
                {order.items.map((item) => (
                  <TR key={item.id}>
                    <TD className="font-medium">{item.product.name}</TD>
                    <TD className="text-right">
                      {item.qty.toString()} {item.unit.code}
                    </TD>
                    <TD className="text-right">
                      {formatCurrency(item.unitSellPrice.toString())}
                    </TD>
                    <TD className="text-right font-medium">
                      {formatCurrency(item.subtotalSell.toString())}
                    </TD>
                    <TD>
                      {item.isAvailableFromStock ? (
                        <span className="text-xs font-medium text-green-600">
                          Ready
                        </span>
                      ) : (
                        <span className="text-xs font-medium text-amber-600">
                          Sourcing
                        </span>
                      )}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>

            <div className="mt-4 space-y-1.5 border-t pt-4 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Subtotal</span>
                <span>{formatCurrency(order.subtotal.toString())}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Diskon</span>
                <span>- {formatCurrency(order.discountAmount.toString())}</span>
              </div>
              <div className="flex justify-between text-base font-bold">
                <span>Total</span>
                <span>{formatCurrency(order.totalAmount.toString())}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-400">
                <span>Margin (est.)</span>
                <span>{formatCurrency(order.totalMarginAmount.toString())}</span>
              </div>
            </div>
          </Panel>

          {/* Status timeline */}
          <Panel>
            <PanelHeader title="Riwayat Status" />
            <ol className="relative space-y-4 border-l border-gray-200 pl-6">
              {order.statusHistory.map((h) => (
                <li key={h.id} className="relative">
                  <span className="absolute -left-[27px] top-1 h-3 w-3 rounded-full bg-primary" />
                  <div className="flex items-center gap-2">
                    <StatusBadge status={h.toStatus} />
                    <span className="text-xs text-gray-400">
                      {formatDateTime(h.changedAt)}
                    </span>
                  </div>
                  {h.note && (
                    <p className="mt-1 text-sm text-gray-500">{h.note}</p>
                  )}
                </li>
              ))}
              {order.statusHistory.length === 0 && (
                <li className="text-sm text-gray-400">Belum ada riwayat.</li>
              )}
            </ol>
          </Panel>
        </div>

        {/* Side column */}
        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Pelanggan" />
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">
                {isB2B ? (
                  <Building2 className="h-4 w-4 text-gray-400" />
                ) : (
                  <User className="h-4 w-4 text-gray-400" />
                )}
                <span className="font-medium">{customerName}</span>
              </div>
              {order.deliveryAddressText && (
                <div className="flex items-start gap-2">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-gray-400" />
                  <span className="text-gray-600">
                    {order.deliveryAddressText}
                  </span>
                </div>
              )}
              <div className="text-xs text-gray-400">
                Metode: {order.deliveryMethod}
                {order.isFreeDelivery && " • Gratis Ongkir"}
              </div>
            </div>
          </Panel>

          <Panel>
            <PanelHeader title="Pembayaran" />
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Status</span>
                <StatusBadge status={order.paymentStatus} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-500">Fulfillment</span>
                <StatusBadge status={order.fulfillmentStatus} />
              </div>
            </div>
          </Panel>

          {isB2B && (
            <Panel>
              <PanelHeader title="Dokumen" />
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-gray-600">
                    <FileText className="h-4 w-4" /> Surat Jalan
                  </span>
                  {order.deliveryNote ? (
                    <StatusBadge status={order.deliveryNote.status} />
                  ) : (
                    <span className="text-xs text-gray-400">Belum dibuat</span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2 text-gray-600">
                    <Receipt className="h-4 w-4" /> Nota
                  </span>
                  {order.invoice ? (
                    <StatusBadge status={order.invoice.status} />
                  ) : (
                    <span className="text-xs text-gray-400">Belum dibuat</span>
                  )}
                </div>
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
