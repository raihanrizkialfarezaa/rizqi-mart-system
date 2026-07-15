import { PageHeader } from "@/components/erp/Panel";
import FinanceDashboardClient from "@/components/erp/finance/FinanceDashboardClient";
import {
  getFinanceDashboardData,
  getFinanceDateRange,
  type FinanceDashboardData,
  type FinanceRange,
} from "@/lib/services/finance-dashboard.service";

export const dynamic = "force-dynamic";

const EMPTY_DATA: FinanceDashboardData = {
  summary: {
    revenueMonth: "0",
    cogsMonth: "0",
    grossMarginMonth: "0",
    operationalCostMonth: "0",
    netMarginMonth: "0",
    totalReceivables: "0",
    receivablesCount: 0,
    cashIn: "0",
    cashOut: "0",
    netCashMovement: "0",
    pendingPaymentValidations: 0,
    pendingPaymentValidationAmount: "0",
    pendingDisbursements: 0,
    pendingDisbursementAmount: "0",
    payablesToSuppliers: "0",
    payablesCount: 0,
    overdueReceivablesAmount: "0",
    overdueReceivablesCount: 0,
  },
  receivables: [],
  trend: [],
  operationalCostBreakdown: [],
  paymentMethodBreakdown: [],
  pendingValidations: [],
  pendingDisbursements: [],
  payables: [],
};

async function loadFinance(rangeParam?: string) {
  const range = getFinanceDateRange(rangeParam);
  try {
    const data = await getFinanceDashboardData(range);
    return { data, activeRange: range.key, periodLabel: range.label, error: false };
  } catch (error) {
    console.error("Failed to load finance dashboard:", error);
    return { data: EMPTY_DATA, activeRange: range.key, periodLabel: range.label, error: true };
  }
}

export default async function FinancePage({ searchParams }: { searchParams?: { range?: FinanceRange } }) {
  const { data, activeRange, periodLabel, error } = await loadFinance(searchParams?.range);

  return (
    <div>
      <PageHeader
        title="Keuangan"
        description="Monitoring pendapatan, margin, piutang, pencairan, cashflow, dan hutang supplier."
      />

      <FinanceDashboardClient
        data={data}
        activeRange={activeRange}
        periodLabel={periodLabel}
        error={error}
      />
    </div>
  );
}
