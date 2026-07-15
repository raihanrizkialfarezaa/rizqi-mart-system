"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, Banknote, Download, ExternalLink, Fuel, HandCoins, PiggyBank, Search, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import StatCard from "@/components/erp/StatCard";
import StatusBadge from "@/components/erp/StatusBadge";
import { formatCurrency } from "@/lib/utils/decimal";
import { formatDate } from "@/lib/utils/date";
import type { FinanceDashboardData, FinanceRange } from "@/lib/services/finance-dashboard.service";

type Props = {
  data: FinanceDashboardData;
  activeRange: FinanceRange;
  periodLabel: string;
  error: boolean;
};

const ranges: Array<{ value: FinanceRange; label: string }> = [
  { value: "7d", label: "7 Hari" },
  { value: "30d", label: "30 Hari" },
  { value: "month", label: "Bulan Ini" },
  { value: "90d", label: "90 Hari" },
];

function csvEscape(value: string | number) {
  const text = String(value ?? "");
  return '"' + text.replace(/"/g, '""') + '"';
}

function exportCsv(filename: string, rows: Array<Record<string, string | number>>) {
  if (rows.length === 0) return;
  const headers = Object.keys(rows[0]);
  const csv = [
    headers.map(csvEscape).join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function axisMoney(value: number) {
  if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(0)}k`;
  return String(value);
}

export default function FinanceDashboardClient({ data, activeRange, periodLabel, error }: Props) {
  const [receivableQuery, setReceivableQuery] = useState("");
  const [receivableBucket, setReceivableBucket] = useState("ALL");
  const [receivableSort, setReceivableSort] = useState<"total" | "oldestDays" | "name">("total");
  const [payableQuery, setPayableQuery] = useState("");

  const receivables = useMemo(() => {
    const query = receivableQuery.toLowerCase().trim();
    return [...data.receivables]
      .filter((row) => (receivableBucket === "ALL" || row.bucket === receivableBucket) && row.name.toLowerCase().includes(query))
      .sort((a, b) => {
        if (receivableSort === "name") return a.name.localeCompare(b.name);
        if (receivableSort === "oldestDays") return b.oldestDays - a.oldestDays;
        return Number(b.total) - Number(a.total);
      });
  }, [data.receivables, receivableBucket, receivableQuery, receivableSort]);

  const payables = useMemo(() => {
    const query = payableQuery.toLowerCase().trim();
    return data.payables.filter((row) => row.supplierName.toLowerCase().includes(query));
  }, [data.payables, payableQuery]);

  const chartTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="rounded-lg border bg-white p-3 text-xs shadow-lg">
        <p className="mb-1 font-semibold text-gray-700">{label}</p>
        {payload.map((item: any) => (
          <p key={item.dataKey} style={{ color: item.color }}>
            {item.name}: <span className="font-bold">{formatCurrency(item.value)}</span>
          </p>
        ))}
      </div>
    );
  };

  return (
    <div>
      {error && (
        <div className="mb-6 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
          <AlertTriangle className="h-4 w-4" />
          Sebagian data keuangan gagal dimuat. Menampilkan fallback kosong.
        </div>
      )}

      <div className="mb-6 flex flex-col gap-3 rounded-xl border bg-white p-3 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {ranges.map((range) => (
            <Link key={range.value} href={`/erp/finance?range=${range.value}`} className={activeRange === range.value ? "rounded-lg bg-primary px-3 py-1.5 text-sm font-semibold text-white" : "rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-sm font-semibold text-gray-600 hover:bg-white"}>
              {range.label}
            </Link>
          ))}
        </div>
        <span className="text-xs font-medium text-gray-500">Periode aktif: {periodLabel}</span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Pendapatan" value={formatCurrency(data.summary.revenueMonth)} subtitle={periodLabel} icon={TrendingUp} accent="blue" />
        <StatCard title="HPP / COGS" value={formatCurrency(data.summary.cogsMonth)} subtitle={periodLabel} icon={Wallet} accent="amber" />
        <StatCard title="Margin Bersih" value={formatCurrency(data.summary.netMarginMonth)} subtitle="setelah biaya operasional" icon={PiggyBank} accent="green" />
        <StatCard title="Piutang Outstanding" value={formatCurrency(data.summary.totalReceivables)} subtitle={`${data.summary.receivablesCount} order belum lunas`} icon={HandCoins} accent="red" />
        <StatCard title="Kas Masuk" value={formatCurrency(data.summary.cashIn)} subtitle="pembayaran lunas" icon={Banknote} accent="green" />
        <StatCard title="Kas Keluar" value={formatCurrency(data.summary.cashOut)} subtitle="PO lunas + operasional" icon={TrendingDown} accent="red" />
        <StatCard title="Pending Validasi" value={String(data.summary.pendingPaymentValidations)} subtitle={formatCurrency(data.summary.pendingPaymentValidationAmount)} icon={AlertTriangle} accent="amber" />
        <StatCard title="Hutang Supplier" value={formatCurrency(data.summary.payablesToSuppliers)} subtitle={`${data.summary.payablesCount} PO belum bayar`} icon={Fuel} accent="purple" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="rounded-xl border bg-white p-5 shadow-sm xl:col-span-2">
          <h3 className="text-base font-bold text-gray-900">Trend Revenue, Margin & Cashflow</h3>
          <p className="mb-4 text-xs text-gray-500">Performa harian berdasarkan periode aktif.</p>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trend} margin={{ left: -20, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="date" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis tickFormatter={axisMoney} fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip content={chartTooltip} />
                <Area name="Revenue" type="monotone" dataKey="revenue" stroke="#2563eb" fill="#2563eb" fillOpacity={0.12} />
                <Area name="Net Margin" type="monotone" dataKey="netMargin" stroke="#10b981" fill="#10b981" fillOpacity={0.12} />
                <Area name="Cash In" type="monotone" dataKey="cashIn" stroke="#f59e0b" fill="#f59e0b" fillOpacity={0.1} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <h3 className="text-base font-bold text-gray-900">Breakdown Biaya Operasional</h3>
          <p className="mb-4 text-xs text-gray-500">Kategori biaya pada periode aktif.</p>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.operationalCostBreakdown} layout="vertical" margin={{ left: 10, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                <XAxis type="number" tickFormatter={axisMoney} fontSize={10} />
                <YAxis type="category" dataKey="label" width={95} fontSize={10} />
                <Tooltip content={chartTooltip} />
                <Bar name="Biaya" dataKey={(row: any) => Number(row.amount)} fill="#ef4444" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section id="receivables" className="scroll-mt-24 rounded-xl border bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h3 className="text-base font-bold text-gray-900">Piutang per Institusi</h3>
              <p className="text-xs text-gray-500">Outstanding dihitung dari total order dikurangi pembayaran lunas.</p>
            </div>
            <button onClick={() => exportCsv("piutang-institusi.csv", receivables.map((r) => ({ institusi: r.name, total: r.total, order: r.count, oldestDays: r.oldestDays, bucket: r.bucket })))} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white">
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
          </div>
          <div className="mb-3 grid gap-2 md:grid-cols-3">
            <div className="relative md:col-span-1">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input value={receivableQuery} onChange={(e) => setReceivableQuery(e.target.value)} placeholder="Cari institusi..." className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm" />
            </div>
            <select value={receivableBucket} onChange={(e) => setReceivableBucket(e.target.value)} className="rounded-lg border px-3 py-2 text-sm">
              <option value="ALL">Semua aging</option><option value="0-7">0-7 hari</option><option value="8-14">8-14 hari</option><option value="15-30">15-30 hari</option><option value=">30">&gt;30 hari</option>
            </select>
            <select value={receivableSort} onChange={(e) => setReceivableSort(e.target.value as any)} className="rounded-lg border px-3 py-2 text-sm">
              <option value="total">Sort total</option><option value="oldestDays">Sort umur tertua</option><option value="name">Sort nama</option>
            </select>
          </div>
          <div className="max-h-[380px] overflow-auto rounded-lg border">
            <table className="w-full text-sm"><thead className="sticky top-0 bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-4 py-3 text-left">Institusi</th><th className="px-4 py-3 text-center">Order</th><th className="px-4 py-3 text-right">Outstanding</th><th className="px-4 py-3 text-right">Tertua</th><th className="px-4 py-3 text-center">Aksi</th></tr></thead><tbody className="divide-y">
              {receivables.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Tidak ada piutang.</td></tr> : receivables.map((r) => <tr key={r.institutionId} className="hover:bg-gray-50"><td className="px-4 py-3 font-medium text-gray-900">{r.name}<span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">{r.bucket}</span></td><td className="px-4 py-3 text-center">{r.count}</td><td className="px-4 py-3 text-right font-bold text-red-600">{formatCurrency(r.total)}</td><td className="px-4 py-3 text-right">{r.oldestDays} hari</td><td className="px-4 py-3 text-center"><Link href={r.orders[0]?.href ?? "/erp/orders"} className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-xs font-semibold text-primary"><ExternalLink className="h-3 w-3" /> Order</Link></td></tr>)}
            </tbody></table>
          </div>
        </section>

        <section id="actions" className="scroll-mt-24 rounded-xl border bg-white p-5 shadow-sm">
          <h3 className="text-base font-bold text-gray-900">Validasi Pembayaran & Pencairan</h3>
          <p className="mb-4 text-xs text-gray-500">Antrian pekerjaan finance yang perlu ditindaklanjuti.</p>
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between"><h4 className="text-sm font-semibold text-gray-700">Pembayaran menunggu validasi</h4><span className="text-xs text-gray-400">{data.pendingValidations.length} item</span></div>
              <div className="max-h-44 overflow-auto rounded-lg border"><table className="w-full text-sm"><tbody className="divide-y">{data.pendingValidations.length === 0 ? <tr><td className="px-4 py-6 text-center text-gray-400">Tidak ada pending validasi.</td></tr> : data.pendingValidations.map((p) => <tr key={p.id}><td className="px-4 py-3"><p className="font-semibold text-gray-900">{p.paymentNumber}</p><p className="text-xs text-gray-500">{p.orderNumber} - {p.customerName}</p></td><td className="px-4 py-3"><StatusBadge status={p.method} /></td><td className="px-4 py-3 text-right font-bold">{formatCurrency(p.amount)}</td><td className="px-4 py-3 text-right"><Link href={p.href} className="text-xs font-semibold text-primary">Buka</Link></td></tr>)}</tbody></table></div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between"><h4 className="text-sm font-semibold text-gray-700">Invoice siap cair</h4><span className="text-xs text-gray-400">{data.pendingDisbursements.length} item</span></div>
              <div className="max-h-44 overflow-auto rounded-lg border"><table className="w-full text-sm"><tbody className="divide-y">{data.pendingDisbursements.length === 0 ? <tr><td className="px-4 py-6 text-center text-gray-400">Tidak ada pencairan pending.</td></tr> : data.pendingDisbursements.map((i) => <tr key={i.id}><td className="px-4 py-3"><p className="font-semibold text-gray-900">{i.documentNumber}</p><p className="text-xs text-gray-500">{i.orderNumber} - {i.institutionName}</p></td><td className="px-4 py-3 text-xs text-gray-500">{i.signedAt ? formatDate(i.signedAt) : "—"}</td><td className="px-4 py-3 text-right font-bold">{formatCurrency(i.totalAmount)}</td><td className="px-4 py-3 text-right"><Link href={i.href} className="text-xs font-semibold text-primary">Buka</Link></td></tr>)}</tbody></table></div>
            </div>
          </div>
        </section>
      </div>

      <div id="payables" className="mt-6 scroll-mt-24 rounded-xl border bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div><h3 className="text-base font-bold text-gray-900">Hutang Supplier / PO Belum Bayar</h3><p className="text-xs text-gray-500">Monitoring cash-out procurement yang masih outstanding.</p></div>
          <div className="relative w-full md:w-72"><Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" /><input value={payableQuery} onChange={(e) => setPayableQuery(e.target.value)} placeholder="Cari supplier..." className="w-full rounded-lg border py-2 pl-9 pr-3 text-sm" /></div>
        </div>
        <div className="overflow-auto rounded-lg border"><table className="w-full text-sm"><thead className="bg-gray-50 text-xs uppercase text-gray-500"><tr><th className="px-4 py-3 text-left">Supplier</th><th className="px-4 py-3 text-center">PO</th><th className="px-4 py-3 text-right">Total Hutang</th><th className="px-4 py-3 text-right">Tertua</th><th className="px-4 py-3 text-center">Aksi</th></tr></thead><tbody className="divide-y">{payables.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">Tidak ada hutang supplier.</td></tr> : payables.map((p) => <tr key={p.supplierId} className="hover:bg-gray-50"><td className="px-4 py-3 font-medium text-gray-900">{p.supplierName}</td><td className="px-4 py-3 text-center">{p.count}</td><td className="px-4 py-3 text-right font-bold text-purple-700">{formatCurrency(p.total)}</td><td className="px-4 py-3 text-right">{p.oldestDays} hari</td><td className="px-4 py-3 text-center"><Link href={p.href} className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-xs font-semibold text-primary"><ExternalLink className="h-3 w-3" /> PO</Link></td></tr>)}</tbody></table></div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border bg-white p-5 shadow-sm"><h3 className="text-base font-bold text-gray-900">Metode Pembayaran</h3><div className="mt-4 space-y-3">{data.paymentMethodBreakdown.length === 0 ? <p className="py-6 text-center text-sm text-gray-400">Tidak ada pembayaran pada periode ini.</p> : data.paymentMethodBreakdown.map((row) => <div key={row.key} className="flex items-center justify-between rounded-lg bg-gray-50 p-3"><div><p className="font-semibold text-gray-900">{row.label}</p><p className="text-xs text-gray-500">{row.count} transaksi</p></div><p className="font-bold text-green-700">{formatCurrency(row.amount)}</p></div>)}</div></div>
        <div className="rounded-xl border bg-white p-5 shadow-sm"><h3 className="text-base font-bold text-gray-900">Aging Risk</h3><div className="mt-4 grid gap-3 sm:grid-cols-2"><div className="rounded-lg bg-red-50 p-4"><p className="text-xs font-semibold text-red-600">Piutang &gt;30 hari</p><p className="mt-1 text-xl font-bold text-red-700">{formatCurrency(data.summary.overdueReceivablesAmount)}</p><p className="text-xs text-red-500">{data.summary.overdueReceivablesCount} order</p></div><div className="rounded-lg bg-amber-50 p-4"><p className="text-xs font-semibold text-amber-600">Pending pencairan</p><p className="mt-1 text-xl font-bold text-amber-700">{formatCurrency(data.summary.pendingDisbursementAmount)}</p><p className="text-xs text-amber-500">{data.summary.pendingDisbursements} invoice</p></div></div></div>
      </div>
    </div>
  );
}
