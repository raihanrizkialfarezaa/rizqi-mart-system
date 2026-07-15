import { PageHeader } from "@/components/erp/Panel";
import InteractiveDashboard from "@/components/erp/dashboard/InteractiveDashboard";
import {
  getDashboardMetrics,
  getRecentOrders,
  getTopProducts,
  getSalesAndMarginTrend,
  getDashboardAlertsDetail,
  getDashboardDateRange,
  getOrderStatusPipeline,
  type DashboardMetrics,
  type DashboardAlertsDetail,
  type DashboardRange,
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

const EMPTY_ALERTS: DashboardAlertsDetail = {
  lowStock: [],
  expiring: [],
  pendingPayments: [],
  pendingSignatures: [],
};

async function loadData(rangeParam?: string) {
  const dateRange = getDashboardDateRange(rangeParam);
  try {
    const [metrics, recentOrders, topProducts, trendData, alertsData, pipelineRows] = await Promise.all([
      getDashboardMetrics(),
      getRecentOrders(8),
      getTopProducts(5, dateRange.days),
      getSalesAndMarginTrend(dateRange.days),
      getDashboardAlertsDetail(dateRange.key === "90d" ? 14 : 7),
      getOrderStatusPipeline(),
    ]);
    return {
      metrics,
      recentOrders,
      topProducts,
      trendData,
      alertsData,
      pipelineRows,
      activeRange: dateRange.key,
      periodLabel: dateRange.label,
      error: false,
    };
  } catch (e) {
    console.error("Failed to load dashboard data:", e);
    return {
      metrics: EMPTY_METRICS,
      recentOrders: [],
      topProducts: [],
      trendData: [],
      alertsData: EMPTY_ALERTS,
      pipelineRows: [],
      activeRange: dateRange.key,
      periodLabel: dateRange.label,
      error: true,
    };
  }
}

export default async function ErpDashboardPage({
  searchParams,
}: {
  searchParams?: { range?: DashboardRange };
}) {
  const {
    metrics,
    recentOrders,
    topProducts,
    trendData,
    alertsData,
    pipelineRows,
    activeRange,
    periodLabel,
    error,
  } = await loadData(searchParams?.range);

  return (
    <div>
      <PageHeader
        title="Dashboard"
        description="Ringkasan operasional & keuangan toko hari ini."
      />

      <InteractiveDashboard
        metrics={metrics}
        recentOrders={recentOrders}
        topProducts={topProducts}
        trendData={trendData}
        alertsData={alertsData}
        pipelineRows={pipelineRows}
        activeRange={activeRange}
        periodLabel={periodLabel}
        error={error}
      />
    </div>
  );
}
