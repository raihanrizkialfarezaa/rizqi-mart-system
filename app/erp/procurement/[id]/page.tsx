import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Award } from "lucide-react";
import StatusBadge from "@/components/erp/StatusBadge";
import { Panel, PanelHeader } from "@/components/erp/Panel";
import { Table, THead, TH, TBody, TR, TD, EmptyRow } from "@/components/erp/Table";
import { formatCurrency } from "@/lib/utils/decimal";
import { formatDate, formatDateTime } from "@/lib/utils/date";
import { getSourcingRequestById } from "@/lib/services/procurement.service";

export const dynamic = "force-dynamic";

export default async function SourcingDetailPage({
  params,
}: {
  params: { id: string };
}) {
  let req;
  try {
    req = await getSourcingRequestById(params.id);
  } catch {
    req = null;
  }
  if (!req) notFound();

  const quotes = req.priceQuotes;
  const cheapest = quotes.length > 0 ? quotes[0].price.toString() : null;

  return (
    <div>
      <Link
        href="/erp/procurement"
        className="mb-4 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" /> Kembali ke daftar sourcing
      </Link>

      <div className="mb-6 flex items-center gap-3">
        <h2 className="text-xl font-bold text-gray-900">{req.product.name}</h2>
        <StatusBadge status={req.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel>
            <PanelHeader
              title="Perbandingan Harga Supplier"
              description="Diurutkan dari harga termurah"
            />
            <Table>
              <THead>
                <tr>
                  <TH>Supplier</TH>
                  <TH className="text-right">Harga</TH>
                  <TH>Promo</TH>
                  <TH>Dicek</TH>
                  <TH>Berlaku s/d</TH>
                </tr>
              </THead>
              <TBody>
                {quotes.length === 0 ? (
                  <EmptyRow colSpan={5} message="Belum ada quote harga" />
                ) : (
                  quotes.map((q, i) => (
                    <TR key={q.id}>
                      <TD className="font-medium">
                        <span className="flex items-center gap-2">
                          {q.supplierProduct.supplier.name}
                          {i === 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                              <Award className="h-3 w-3" /> Termurah
                            </span>
                          )}
                        </span>
                      </TD>
                      <TD className="text-right font-semibold">
                        {formatCurrency(q.price.toString())}
                      </TD>
                      <TD>
                        {q.isPromo ? (
                          <span className="text-xs font-medium text-purple-600">
                            Promo
                          </span>
                        ) : (
                          "—"
                        )}
                      </TD>
                      <TD className="text-xs text-gray-500">
                        {formatDateTime(q.checkedAt)}
                      </TD>
                      <TD className="text-xs text-gray-500">
                        {q.validUntil ? formatDate(q.validUntil) : "—"}
                      </TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel>
            <PanelHeader title="Detail Permintaan" />
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Qty Dibutuhkan</dt>
                <dd className="font-medium">
                  {req.qtyNeeded.toString()} {req.unit.code}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Deadline</dt>
                <dd className="font-medium">{formatDate(req.deadline)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Order</dt>
                <dd className="font-medium">
                  <Link
                    href={`/erp/orders/${req.salesOrderItem.salesOrder.id}`}
                    className="text-primary hover:underline"
                  >
                    {req.salesOrderItem.salesOrder.orderNumber}
                  </Link>
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Institusi</dt>
                <dd className="font-medium">
                  {req.salesOrderItem.salesOrder.institution?.name ?? "—"}
                </dd>
              </div>
              {cheapest && (
                <div className="flex justify-between border-t pt-2">
                  <dt className="text-gray-500">Harga Termurah</dt>
                  <dd className="font-semibold text-green-600">
                    {formatCurrency(cheapest)}
                  </dd>
                </div>
              )}
            </dl>
          </Panel>

          {req.chosenSupplierProduct && (
            <Panel>
              <PanelHeader title="Keputusan" />
              <div className="space-y-2 text-sm">
                <p className="font-medium">
                  {req.chosenSupplierProduct.supplier.name}
                </p>
                {req.decisionReason && (
                  <p className="text-gray-600">{req.decisionReason}</p>
                )}
                {req.decidedAt && (
                  <p className="text-xs text-gray-400">
                    Diputuskan {formatDateTime(req.decidedAt)}
                  </p>
                )}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
