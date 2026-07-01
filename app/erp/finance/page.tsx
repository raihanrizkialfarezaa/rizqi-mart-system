import {
  TrendingUp,
  Wallet,
  Fuel,
  PiggyBank,
  HandCoins,
  AlertTriangle,
} from "lucide-react";
import StatCard from "@/components/erp/StatCard";
import { Panel, PanelHeader, PageHeader } from "@/components/erp/Panel";
import { Table, THead, TH, TBody, TR, TD, EmptyRow } from "@/components/erp/Table";
import { formatCurrency } from "@/lib/utils/decimal";
import {
  getFinanceSummary,
  getReceivablesByInstitution,
  type FinanceSummary,
} from "@/lib/services/finance-dashboard.service";

export const dynamic = "force-dynamic";

const EMPTY: FinanceSummary = {
  revenueMonth: "0",
  cogsMonth: "0",
  grossMarginMonth: "0",
  operationalCostMonth: "0",
  netMarginMonth: "0",
  totalReceivables: "0",
  receivablesCount: 0,
};

async function loadFinance() {
  try {
    const [summary, receivables] = await Promise.all([
      getFinanceSummary(),
      getReceivablesByInstitution(),
    ]);
    return { summary, receivables, error: false };
  } catch {
    return { summary: EMPTY, receivables: [], error: true };
  }
}

export default async function FinancePage() {
  const { summary, receivables, error } = await loadFinance();

  return (
    <div>
      <PageHeader
        title="Keuangan"
        description="Ringkasan pendapatan, margin & piutang bulan berjalan."
      />

      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4" />
          Database belum terhubung — menampilkan nilai kosong.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="Pendapatan (Bulan Ini)"
          value={formatCurrency(summary.revenueMonth)}
          icon={TrendingUp}
          accent="blue"
        />
        <StatCard
          title="HPP / COGS"
          value={formatCurrency(summary.cogsMonth)}
          icon={Wallet}
          accent="amber"
        />
        <StatCard
          title="Margin Kotor"
          value={formatCurrency(summary.grossMarginMonth)}
          icon={PiggyBank}
          accent="green"
        />
        <StatCard
          title="Biaya Operasional"
          value={formatCurrency(summary.operationalCostMonth)}
          subtitle="bensin, parkir, dll"
          icon={Fuel}
          accent="red"
        />
        <StatCard
          title="Margin Bersih"
          value={formatCurrency(summary.netMarginMonth)}
          subtitle="setelah biaya operasional"
          icon={PiggyBank}
          accent="purple"
        />
        <StatCard
          title="Total Piutang"
          value={formatCurrency(summary.totalReceivables)}
          subtitle={`${summary.receivablesCount} order belum lunas`}
          icon={HandCoins}
          accent="red"
        />
      </div>

      <div className="mt-6">
        <Panel>
          <PanelHeader
            title="Piutang per Institusi"
            description="Order B2B yang belum/sebagian dibayar"
          />
          <Table>
            <THead>
              <tr>
                <TH>Institusi</TH>
                <TH className="text-center">Jumlah Order</TH>
                <TH className="text-right">Total Piutang</TH>
                <TH className="text-right">Umur Tertua</TH>
              </tr>
            </THead>
            <TBody>
              {receivables.length === 0 ? (
                <EmptyRow colSpan={4} message="Tidak ada piutang" />
              ) : (
                receivables.map((r) => (
                  <TR key={r.name}>
                    <TD className="font-medium">{r.name}</TD>
                    <TD className="text-center">{r.count}</TD>
                    <TD className="text-right font-semibold">
                      {formatCurrency(r.total)}
                    </TD>
                    <TD className="text-right">
                      <span
                        className={
                          r.oldestDays > 30
                            ? "font-medium text-red-600"
                            : "text-gray-600"
                        }
                      >
                        {r.oldestDays} hari
                      </span>
                    </TD>
                  </TR>
                ))
              )}
            </TBody>
          </Table>
        </Panel>
      </div>

      <p className="mt-4 text-xs text-gray-400">
        Catatan: Laporan keuangan lengkap (Neraca, Laba Rugi, Arus Kas) dari
        double-entry <code>JournalEntry</code> akan ditambahkan pada iterasi
        berikutnya.
      </p>
    </div>
  );
}
