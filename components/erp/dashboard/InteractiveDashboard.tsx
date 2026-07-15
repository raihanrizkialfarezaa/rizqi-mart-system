"use client";

import { useState } from "react";
import {
  Banknote,
  TrendingUp,
  ShoppingBag,
  AlertTriangle,
  Clock,
  PackageX,
  FileSignature,
  Wallet,
  HandCoins,
} from "lucide-react";
import StatCard from "@/components/erp/StatCard";
import RecentOrdersWidget from "./RecentOrdersWidget";
import TopProductsWidget from "./TopProductsWidget";
import SalesTrendChart from "./SalesTrendChart";
import AlertsDetailModal, { AlertType } from "./AlertsDetailModal";
import DashboardControls from "./DashboardControls";
import OrderPipelineWidget from "./OrderPipelineWidget";
import { formatCurrency } from "@/lib/utils/decimal";
import type {
  DashboardAlertsDetail,
  DashboardMetrics,
  DashboardRange,
  OrderStatusPipelineRow,
  RecentOrderRow,
  SalesTrendPoint,
  TopProductRow,
} from "@/lib/services/dashboard.service";

type InteractiveDashboardProps = {
  metrics: DashboardMetrics;
  recentOrders: RecentOrderRow[];
  topProducts: TopProductRow[];
  trendData: SalesTrendPoint[];
  alertsData: DashboardAlertsDetail;
  pipelineRows: OrderStatusPipelineRow[];
  activeRange: DashboardRange;
  periodLabel: string;
  error: boolean;
};

export default function InteractiveDashboard({
  metrics,
  recentOrders = [],
  topProducts = [],
  trendData = [],
  alertsData,
  pipelineRows = [],
  activeRange,
  periodLabel,
  error,
}: InteractiveDashboardProps) {
  const [activeAlert, setActiveAlert] = useState<AlertType>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const openAlertDetail = (type: Exclude<AlertType, null>) => {
    setActiveAlert(type);
    setIsModalOpen(true);
  };

  return (
    <div>
      <DashboardControls activeRange={activeRange} />

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 animate-pulse">
          <AlertTriangle className="h-4 w-4" />
          Database belum terhubung — menampilkan nilai kosong. Jalankan migrasi &
          seed untuk data live.
        </div>
      )}

      {/* Primary metrics */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
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
        <StatCard
          title="Piutang Belum Dibayar"
          value={formatCurrency(metrics.unpaidReceivables)}
          subtitle="belum/sebagian dibayar"
          icon={HandCoins}
          accent="red"
        />
      </div>

      {/* Alerts row with cursor-pointer and hover animations */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div onClick={() => openAlertDetail("lowStock")} className="cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200">
          <StatCard
            title="Stok Menipis"
            value={String(metrics.lowStockCount)}
            subtitle="Klik untuk lihat detail"
            icon={PackageX}
            accent="red"
          />
        </div>
        <div onClick={() => openAlertDetail("expiring")} className="cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200">
          <StatCard
            title="Akan Kadaluwarsa"
            value={String(metrics.expiringSoonCount)}
            subtitle="Klik untuk lihat detail"
            icon={Clock}
            accent="amber"
          />
        </div>
        <div onClick={() => openAlertDetail("pendingPayments")} className="cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200">
          <StatCard
            title="Validasi Pembayaran"
            value={String(metrics.pendingPaymentValidations)}
            subtitle="Klik untuk lihat detail"
            icon={AlertTriangle}
            accent="red"
          />
        </div>
        <div onClick={() => openAlertDetail("pendingSignatures")} className="cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200">
          <StatCard
            title="Menunggu TTD"
            value={String(metrics.pendingSignatures)}
            subtitle="Klik untuk lihat detail"
            icon={FileSignature}
            accent="blue"
          />
        </div>
      </div>

      {/* Charts & Top performance Row */}
      <div className="mt-6 grid gap-6 xl:grid-cols-4">
        <div className="xl:col-span-2">
          <SalesTrendChart data={trendData} periodLabel={periodLabel} />
        </div>
        <div>
          <TopProductsWidget initialProducts={topProducts} periodLabel={periodLabel} />
        </div>
        <div>
          <OrderPipelineWidget rows={pipelineRows} />
        </div>
      </div>

      {/* Content grid - Recent Orders */}
      <div className="mt-6">
        <RecentOrdersWidget initialOrders={recentOrders} />
      </div>

      {/* Detail Modals for alerts */}
      <AlertsDetailModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        type={activeAlert}
        data={alertsData}
      />
    </div>
  );
}
