import Link from "next/link";
import {
  Banknote,
  TrendingUp,
  ShoppingBag,
  AlertTriangle,
  Clock,
  PackageX,
  FileSignature,
  Wallet,
  ArrowRight,
} from "lucide-react";
import StatCard from "@/components/erp/StatCard";
import StatusBadge from "@/components/erp/StatusBadge";
import { Panel, PanelHeader, PageHeader } from "@/components/erp/Panel";
import { Table, THead, TH, TBody, TR, TD, EmptyRow } from "@/components/erp/Table";
import { formatCurrency } from "@/lib/utils/decimal";
import { formatDate } from "@/lib/utils/date";
import {
  getDashboardMetrics,
  getRecentOrders,
  getTopProducts,
  type DashboardMetrics,
} from "@/lib/services/dashboard.service";

export const dynamic = "force-dynamic";

const EMPTY_METRICS: DashboardMetrics = {
  salesToday: "0",
  salesTodayCount: 0,
  revenueMonth: "0",
  marginMonth: "0",
  pendingOrders: 0,
  lowStockCount: 0,
  expiringSoonCount: 0,
  pendingPaymentValidations: 0,
  pendingSignatures: 0,
  unpaidReceivables: "0",
};

async function loadData() {
  try {
    const [metrics, recentOrders, topProducts] = await Promise.all([
      getDashboardMetrics(),
      getRecentOrders(8),
      getTopProducts(5),
    ]);
    return { metrics, recentOrders, topProducts, error: false };
  } catch {
    return {
      metrics: EMPTY_METRICS,
      recentOrders: [],
      topProducts: [],
      error: true,
    };
  }
}

export default async function ErpDashboardPage() {
  const { metrics, recentOrders, topProducts, error } = await loadData();

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Ringkasan operasional & keuangan toko hari ini."
      />

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4" />
          Database belum terhubung — menampilkan nilai kosong. Jalankan migrasi &
          seed untuk data live.
        </div>
      )}

      {/* Primary metrics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Penjualan Hari Ini"
          value={formatCurrency(metrics.salesToday)}
          subtitle={`${metrics.salesTodayCount} transaksi`}
          icon={Banknote}
          accent="green"
        />
        <StatCard
          title="Omzet Bulan Ini"
          value={formatCurrency(metrics.revenueMonth)}
          icon={TrendingUp}
          accent="blue"
        />
        <StatCard
          title="Margin Bulan Ini"
          value={formatCurrency(metrics.marginMonth)}
          icon={Wallet}
          accent="purple"
        />
        <StatCard
          title="Pesanan Berjalan"
          value={String(metrics.pendingOrders)}
          subtitle="belum selesai"
          icon={ShoppingBag}
          accent="amber"
        />
      </div>

      {/* Alerts row */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Stok Menipis"
          value={String(metrics.lowStockCount)}
          subtitle="di bawah minimum"
          icon={PackageX}
          accent="red"
        />
        <StatCard
          title="Akan Kadaluwarsa"
          value={String(metrics.expiringSoonCount)}
          subtitle="dalam 7 hari"
          icon={Clock}
          accent="amber"
        />
        <StatCard
          title="Validasi Pembayaran"
          value={String(metrics.pendingPaymentValidations)}
          subtitle="menunggu approval"
          icon={AlertTriangle}
          accent="red"
        />
        <StatCard
          title="Menunggu TTD"
          value={String(metrics.pendingSignatures)}
          subtitle="surat jalan"
          icon={FileSignature}
          accent="blue"
        />
      </div>

      {/* Content grid */}
      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Recent orders */}
        <div className="lg:col-span-2">
          <Panel>
            <PanelHeader
              title="Pesanan Terbaru"
              action={
                <Link
                  href="/erp/orders"
                  className="flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                >
                  Lihat semua <ArrowRight className="h-4 w-4" />
                </Link>
              }
            />
            <Table>
              <THead>
                <tr>
                  <TH>No. Order</TH>
                  <TH>Pelanggan</TH>
                  <TH>Tanggal</TH>
                  <TH className="text-right">Total</TH>
                  <TH>Status</TH>
                </tr>
              </THead>
              <TBody>
                {recentOrders.length === 0 ? (
                  <EmptyRow colSpan={5} message="Belum ada pesanan" />
                ) : (
                  recentOrders.map((o) => (
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
                        {o.customer?.name ?? o.institution?.name ?? "Walk-in"}
                      </TD>
                      <TD>{formatDate(o.createdAt)}</TD>
                      <TD className="text-right font-medium">
                        {formatCurrency(o.totalAmount.toString())}
                      </TD>
                      <TD>
                        <StatusBadge status={o.status} />
                      </TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </Panel>
        </div>

        {/* Top products */}
        <div>
          <Panel>
            <PanelHeader title="Produk Terlaris" description="30 hari terakhir" />
            <div className="space-y-3">
              {topProducts.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-400">
                  Belum ada data penjualan
                </p>
              ) : (
                topProducts.map((p, i) => (
                  <div key={p.productId} className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-100 text-sm font-bold text-gray-500">
                      {i + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-gray-900">
                        {p.name}
                      </p>
                      <p className="text-xs text-gray-400">{p.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-gray-900">
                        {formatCurrency(p.revenue)}
                      </p>
                      <p className="text-xs text-gray-400">{p.qtySold} terjual</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
