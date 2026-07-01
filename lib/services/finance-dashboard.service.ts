import { prisma } from "@/lib/prisma";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { toDecimal, addDecimal, subtractDecimal } from "@/lib/utils/decimal";

/**
 * Finance Dashboard Service
 * Agregasi keuangan untuk halaman finance ERP (read-only).
 * Ringkasan cepat; laporan double-entry penuh (neraca/laba-rugi) dari
 * JournalEntry menyusul di Fase lanjutan.
 */

const startOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

export type FinanceSummary = {
  revenueMonth: string;
  cogsMonth: string;
  grossMarginMonth: string;
  operationalCostMonth: string;
  netMarginMonth: string;
  totalReceivables: string;
  receivablesCount: number;
};

export async function getFinanceSummary(): Promise<FinanceSummary> {
  const monthStart = startOfMonth();

  const [monthOrders, opCosts, unpaidOrders] = await Promise.all([
    prisma.salesOrder.findMany({
      where: {
        createdAt: { gte: monthStart },
        status: { not: OrderStatus.DIBATALKAN },
      },
      select: { totalAmount: true, totalCostAmount: true },
    }),
    prisma.operationalCost.aggregate({
      where: { incurredAt: { gte: monthStart } },
      _sum: { amount: true },
    }),
    prisma.salesOrder.findMany({
      where: {
        paymentStatus: { in: [PaymentStatus.BELUM_BAYAR, PaymentStatus.SEBAGIAN] },
        status: { not: OrderStatus.DIBATALKAN },
      },
      select: { totalAmount: true },
    }),
  ]);

  let revenue = toDecimal(0);
  let cogs = toDecimal(0);
  for (const o of monthOrders) {
    revenue = addDecimal(revenue, o.totalAmount);
    cogs = addDecimal(cogs, o.totalCostAmount);
  }

  const operationalCost = toDecimal(opCosts._sum.amount ?? 0);
  const grossMargin = subtractDecimal(revenue, cogs);
  const netMargin = subtractDecimal(grossMargin, operationalCost);

  let receivables = toDecimal(0);
  for (const o of unpaidOrders) {
    receivables = addDecimal(receivables, o.totalAmount);
  }

  return {
    revenueMonth: revenue.toString(),
    cogsMonth: cogs.toString(),
    grossMarginMonth: grossMargin.toString(),
    operationalCostMonth: operationalCost.toString(),
    netMarginMonth: netMargin.toString(),
    totalReceivables: receivables.toString(),
    receivablesCount: unpaidOrders.length,
  };
}

/**
 * Piutang per institusi (aging ringkas B2B)
 */
export async function getReceivablesByInstitution() {
  const orders = await prisma.salesOrder.findMany({
    where: {
      paymentStatus: { in: [PaymentStatus.BELUM_BAYAR, PaymentStatus.SEBAGIAN] },
      status: { not: OrderStatus.DIBATALKAN },
      institutionId: { not: null },
    },
    select: {
      totalAmount: true,
      createdAt: true,
      institution: { select: { id: true, name: true } },
    },
  });

  const map = new Map<
    string,
    { name: string; total: ReturnType<typeof toDecimal>; count: number; oldest: Date }
  >();

  for (const o of orders) {
    if (!o.institution) continue;
    const key = o.institution.id;
    const existing = map.get(key);
    if (existing) {
      existing.total = addDecimal(existing.total, o.totalAmount);
      existing.count += 1;
      if (o.createdAt < existing.oldest) existing.oldest = o.createdAt;
    } else {
      map.set(key, {
        name: o.institution.name,
        total: toDecimal(o.totalAmount),
        count: 1,
        oldest: o.createdAt,
      });
    }
  }

  return Array.from(map.values())
    .map((v) => ({
      name: v.name,
      total: v.total.toString(),
      count: v.count,
      oldestDays: Math.floor((Date.now() - v.oldest.getTime()) / 86400000),
    }))
    .sort((a, b) => Number(b.total) - Number(a.total));
}
