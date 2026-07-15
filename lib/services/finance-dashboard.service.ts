import { prisma } from "@/lib/prisma";
import { OrderStatus, PaymentStatus } from "@prisma/client";
import { addDecimal, subtractDecimal, toDecimal } from "@/lib/utils/decimal";

const RECEIVABLE_STATUSES = [PaymentStatus.BELUM_BAYAR, PaymentStatus.SEBAGIAN];
const PAID_PAYMENT_STATUSES = [PaymentStatus.LUNAS];

export type FinanceRange = "7d" | "30d" | "month" | "90d";

export type FinanceDateRange = {
  key: FinanceRange;
  label: string;
  days: number;
  from: Date;
  to: Date;
};

export type FinanceSummary = {
  revenueMonth: string;
  cogsMonth: string;
  grossMarginMonth: string;
  operationalCostMonth: string;
  netMarginMonth: string;
  totalReceivables: string;
  receivablesCount: number;
  cashIn: string;
  cashOut: string;
  netCashMovement: string;
  pendingPaymentValidations: number;
  pendingPaymentValidationAmount: string;
  pendingDisbursements: number;
  pendingDisbursementAmount: string;
  payablesToSuppliers: string;
  payablesCount: number;
  overdueReceivablesAmount: string;
  overdueReceivablesCount: number;
};

export type ReceivableInstitutionRow = {
  institutionId: string;
  name: string;
  total: string;
  count: number;
  oldestDays: number;
  bucket: "0-7" | "8-14" | "15-30" | ">30";
  href: string;
  orders: Array<{
    id: string;
    orderNumber: string;
    totalAmount: string;
    paidAmount: string;
    outstandingAmount: string;
    createdAt: string;
    ageDays: number;
    paymentStatus: string;
    href: string;
  }>;
};

export type FinanceTrendPoint = {
  date: string;
  revenue: number;
  cogs: number;
  grossMargin: number;
  operationalCost: number;
  netMargin: number;
  cashIn: number;
  cashOut: number;
};

export type BreakdownRow = {
  key: string;
  label: string;
  amount: string;
  count: number;
};

export type PendingPaymentValidationRow = {
  id: string;
  paymentNumber: string;
  orderNumber: string;
  customerName: string;
  method: string;
  amount: string;
  createdAt: string;
  ageDays: number;
  proofFileUrl: string | null;
  href: string;
};

export type PendingDisbursementRow = {
  id: string;
  documentNumber: string;
  orderNumber: string;
  institutionName: string;
  totalAmount: string;
  signedAt: string | null;
  ageDays: number;
  href: string;
};

export type PayableSupplierRow = {
  supplierId: string;
  supplierName: string;
  total: string;
  count: number;
  oldestDays: number;
  href: string;
  purchaseOrders: Array<{
    id: string;
    poNumber: string;
    totalAmount: string;
    createdAt: string;
    ageDays: number;
    status: string;
    href: string;
  }>;
};

export type FinanceDashboardData = {
  summary: FinanceSummary;
  receivables: ReceivableInstitutionRow[];
  trend: FinanceTrendPoint[];
  operationalCostBreakdown: BreakdownRow[];
  paymentMethodBreakdown: BreakdownRow[];
  pendingValidations: PendingPaymentValidationRow[];
  pendingDisbursements: PendingDisbursementRow[];
  payables: PayableSupplierRow[];
};

const startOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

function ageDays(date: Date) {
  return Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
}

function bucketFromAge(days: number): ReceivableInstitutionRow["bucket"] {
  if (days <= 7) return "0-7";
  if (days <= 14) return "8-14";
  if (days <= 30) return "15-30";
  return ">30";
}

export function getFinanceDateRange(range: string | undefined): FinanceDateRange {
  const key: FinanceRange =
    range === "7d" || range === "30d" || range === "90d" || range === "month" ? range : "month";
  const now = new Date();

  if (key === "month") {
    return { key, label: "Bulan ini", days: Math.max(1, now.getDate()), from: startOfMonth(), to: now };
  }

  const days = key === "7d" ? 7 : key === "90d" ? 90 : 30;
  const from = new Date(now);
  from.setDate(from.getDate() - (days - 1));
  from.setHours(0, 0, 0, 0);

  return {
    key,
    label: key === "7d" ? "7 hari" : key === "30d" ? "30 hari" : "90 hari",
    days,
    from,
    to: now,
  };
}

async function getOutstandingOrders() {
  const orders = await prisma.salesOrder.findMany({
    where: {
      paymentStatus: { in: RECEIVABLE_STATUSES },
      status: { not: OrderStatus.DIBATALKAN },
    },
    select: {
      id: true,
      orderNumber: true,
      totalAmount: true,
      createdAt: true,
      paymentStatus: true,
      institution: { select: { id: true, name: true } },
      payments: {
        where: { status: { in: PAID_PAYMENT_STATUSES } },
        select: { amount: true },
      },
    },
  });

  return orders
    .map((order) => {
      const paidAmount = order.payments.reduce((sum, payment) => addDecimal(sum, payment.amount), toDecimal(0));
      const outstandingAmount = subtractDecimal(order.totalAmount, paidAmount);
      return { ...order, paidAmount, outstandingAmount };
    })
    .filter((order) => order.outstandingAmount.gt(0));
}

export async function getReceivablesByInstitution(): Promise<ReceivableInstitutionRow[]> {
  const orders = await getOutstandingOrders();
  const map = new Map<string, ReceivableInstitutionRow>();

  for (const order of orders) {
    if (!order.institution) continue;
    const orderAge = ageDays(order.createdAt);
    const existing = map.get(order.institution.id);
    const orderRow = {
      id: order.id,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount.toString(),
      paidAmount: order.paidAmount.toString(),
      outstandingAmount: order.outstandingAmount.toString(),
      createdAt: order.createdAt.toISOString(),
      ageDays: orderAge,
      paymentStatus: order.paymentStatus,
      href: `/erp/orders/${order.id}`,
    };

    if (existing) {
      existing.total = addDecimal(existing.total, order.outstandingAmount).toString();
      existing.count += 1;
      existing.oldestDays = Math.max(existing.oldestDays, orderAge);
      existing.bucket = bucketFromAge(existing.oldestDays);
      existing.orders.push(orderRow);
    } else {
      map.set(order.institution.id, {
        institutionId: order.institution.id,
        name: order.institution.name,
        total: order.outstandingAmount.toString(),
        count: 1,
        oldestDays: orderAge,
        bucket: bucketFromAge(orderAge),
        href: `/erp/orders?institutionId=${order.institution.id}`,
        orders: [orderRow],
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => Number(b.total) - Number(a.total));
}

export async function getFinanceDashboardData(range: FinanceDateRange): Promise<FinanceDashboardData> {
  const [ordersInRange, opCosts, paymentsInRange, unpaidOrders, pendingPayments, pendingInvoices, unpaidPos] = await Promise.all([
    prisma.salesOrder.findMany({
      where: { createdAt: { gte: range.from, lte: range.to }, status: { not: OrderStatus.DIBATALKAN } },
      select: { createdAt: true, totalAmount: true, totalCostAmount: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.operationalCost.findMany({
      where: { incurredAt: { gte: range.from, lte: range.to } },
      select: { category: true, amount: true, incurredAt: true },
      orderBy: { incurredAt: "asc" },
    }),
    prisma.payment.findMany({
      where: { status: PaymentStatus.LUNAS, paidAt: { gte: range.from, lte: range.to } },
      select: { method: true, amount: true, paidAt: true },
      orderBy: { paidAt: "asc" },
    }),
    getOutstandingOrders(),
    prisma.payment.findMany({
      where: { status: PaymentStatus.MENUNGGU_VALIDASI, requiresValidation: true },
      include: {
        salesOrder: {
          select: {
            id: true,
            orderNumber: true,
            customer: { select: { name: true } },
            institution: { select: { name: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    }),
    prisma.invoice.findMany({
      where: { status: "SELESAI", disbursementStatus: "BELUM_CAIR" },
      include: {
        salesOrder: { select: { id: true, orderNumber: true, institution: { select: { name: true } } } },
      },
      orderBy: { headOfficeSignedAt: "asc" },
    }),
    prisma.purchaseOrder.findMany({
      where: { paymentStatus: "BELUM_BAYAR" },
      include: { supplier: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  let revenue = toDecimal(0);
  let cogs = toDecimal(0);
  for (const order of ordersInRange) {
    revenue = addDecimal(revenue, order.totalAmount);
    cogs = addDecimal(cogs, order.totalCostAmount);
  }

  const operationalCost = opCosts.reduce((sum, cost) => addDecimal(sum, cost.amount), toDecimal(0));
  const grossMargin = subtractDecimal(revenue, cogs);
  const netMargin = subtractDecimal(grossMargin, operationalCost);
  const cashIn = paymentsInRange.reduce((sum, payment) => addDecimal(sum, payment.amount), toDecimal(0));
  const poCashOut = await prisma.purchaseOrder.aggregate({
    where: { paymentStatus: "LUNAS", paidAt: { gte: range.from, lte: range.to } },
    _sum: { totalAmount: true },
  });
  const cashOut = addDecimal(operationalCost, poCashOut._sum.totalAmount ?? 0);
  const netCashMovement = subtractDecimal(cashIn, cashOut);
  const totalReceivables = unpaidOrders.reduce((sum, order) => addDecimal(sum, order.outstandingAmount), toDecimal(0));
  const overdueOrders = unpaidOrders.filter((order) => ageDays(order.createdAt) > 30);
  const overdueReceivablesAmount = overdueOrders.reduce((sum, order) => addDecimal(sum, order.outstandingAmount), toDecimal(0));
  const pendingPaymentValidationAmount = pendingPayments.reduce((sum, payment) => addDecimal(sum, payment.amount), toDecimal(0));
  const pendingDisbursementAmount = pendingInvoices.reduce((sum, invoice) => addDecimal(sum, invoice.totalAmount), toDecimal(0));
  const payablesToSuppliers = unpaidPos.reduce((sum, po) => addDecimal(sum, po.totalAmount), toDecimal(0));

  const operationalCostMap = new Map<string, { amount: ReturnType<typeof toDecimal>; count: number }>();
  for (const cost of opCosts) {
    const current = operationalCostMap.get(cost.category) ?? { amount: toDecimal(0), count: 0 };
    current.amount = addDecimal(current.amount, cost.amount);
    current.count += 1;
    operationalCostMap.set(cost.category, current);
  }

  const paymentMethodMap = new Map<string, { amount: ReturnType<typeof toDecimal>; count: number }>();
  for (const payment of paymentsInRange) {
    const current = paymentMethodMap.get(payment.method) ?? { amount: toDecimal(0), count: 0 };
    current.amount = addDecimal(current.amount, payment.amount);
    current.count += 1;
    paymentMethodMap.set(payment.method, current);
  }

  const trendMap = new Map<string, FinanceTrendPoint>();
  for (let i = range.days - 1; i >= 0; i--) {
    const d = new Date(range.to);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    trendMap.set(key, {
      date: d.toLocaleDateString("id-ID", { day: "numeric", month: "short" }),
      revenue: 0,
      cogs: 0,
      grossMargin: 0,
      operationalCost: 0,
      netMargin: 0,
      cashIn: 0,
      cashOut: 0,
    });
  }

  for (const order of ordersInRange) {
    const key = order.createdAt.toISOString().split("T")[0];
    const row = trendMap.get(key);
    if (!row) continue;
    row.revenue += Number(order.totalAmount);
    row.cogs += Number(order.totalCostAmount);
    row.grossMargin = row.revenue - row.cogs;
    row.netMargin = row.grossMargin - row.operationalCost;
  }

  for (const cost of opCosts) {
    const key = cost.incurredAt.toISOString().split("T")[0];
    const row = trendMap.get(key);
    if (!row) continue;
    row.operationalCost += Number(cost.amount);
    row.cashOut += Number(cost.amount);
    row.netMargin = row.grossMargin - row.operationalCost;
  }

  for (const payment of paymentsInRange) {
    if (!payment.paidAt) continue;
    const key = payment.paidAt.toISOString().split("T")[0];
    const row = trendMap.get(key);
    if (!row) continue;
    row.cashIn += Number(payment.amount);
  }

  const payablesMap = new Map<string, PayableSupplierRow>();
  for (const po of unpaidPos) {
    const poAge = ageDays(po.createdAt);
    const row = {
      id: po.id,
      poNumber: po.poNumber,
      totalAmount: po.totalAmount.toString(),
      createdAt: po.createdAt.toISOString(),
      ageDays: poAge,
      status: po.status,
      href: "/erp/procurement/purchase-orders",
    };
    const existing = payablesMap.get(po.supplierId);
    if (existing) {
      existing.total = addDecimal(existing.total, po.totalAmount).toString();
      existing.count += 1;
      existing.oldestDays = Math.max(existing.oldestDays, poAge);
      existing.purchaseOrders.push(row);
    } else {
      payablesMap.set(po.supplierId, {
        supplierId: po.supplierId,
        supplierName: po.supplier.name,
        total: po.totalAmount.toString(),
        count: 1,
        oldestDays: poAge,
        href: "/erp/procurement/purchase-orders",
        purchaseOrders: [row],
      });
    }
  }

  return {
    summary: {
      revenueMonth: revenue.toString(),
      cogsMonth: cogs.toString(),
      grossMarginMonth: grossMargin.toString(),
      operationalCostMonth: operationalCost.toString(),
      netMarginMonth: netMargin.toString(),
      totalReceivables: totalReceivables.toString(),
      receivablesCount: unpaidOrders.length,
      cashIn: cashIn.toString(),
      cashOut: cashOut.toString(),
      netCashMovement: netCashMovement.toString(),
      pendingPaymentValidations: pendingPayments.length,
      pendingPaymentValidationAmount: pendingPaymentValidationAmount.toString(),
      pendingDisbursements: pendingInvoices.length,
      pendingDisbursementAmount: pendingDisbursementAmount.toString(),
      payablesToSuppliers: payablesToSuppliers.toString(),
      payablesCount: unpaidPos.length,
      overdueReceivablesAmount: overdueReceivablesAmount.toString(),
      overdueReceivablesCount: overdueOrders.length,
    },
    receivables: await getReceivablesByInstitution(),
    trend: Array.from(trendMap.values()),
    operationalCostBreakdown: Array.from(operationalCostMap.entries())
      .map(([key, value]) => ({ key, label: key.replace(/_/g, " "), amount: value.amount.toString(), count: value.count }))
      .sort((a, b) => Number(b.amount) - Number(a.amount)),
    paymentMethodBreakdown: Array.from(paymentMethodMap.entries())
      .map(([key, value]) => ({ key, label: key.replace(/_/g, " "), amount: value.amount.toString(), count: value.count }))
      .sort((a, b) => Number(b.amount) - Number(a.amount)),
    pendingValidations: pendingPayments.map((payment) => ({
      id: payment.id,
      paymentNumber: payment.paymentNumber,
      orderNumber: payment.salesOrder.orderNumber,
      customerName: payment.salesOrder.customer?.name ?? payment.salesOrder.institution?.name ?? "Walk-in",
      method: payment.method,
      amount: payment.amount.toString(),
      createdAt: payment.createdAt.toISOString(),
      ageDays: ageDays(payment.createdAt),
      proofFileUrl: payment.proofFileUrl,
      href: `/erp/orders/${payment.salesOrder.id}`,
    })),
    pendingDisbursements: pendingInvoices.map((invoice) => ({
      id: invoice.id,
      documentNumber: invoice.documentNumber,
      orderNumber: invoice.salesOrder.orderNumber,
      institutionName: invoice.salesOrder.institution?.name ?? "—",
      totalAmount: invoice.totalAmount.toString(),
      signedAt: invoice.headOfficeSignedAt?.toISOString() ?? null,
      ageDays: invoice.headOfficeSignedAt ? ageDays(invoice.headOfficeSignedAt) : 0,
      href: `/erp/orders/${invoice.salesOrder.id}`,
    })),
    payables: Array.from(payablesMap.values()).sort((a, b) => Number(b.total) - Number(a.total)),
  };
}

export async function getFinanceSummary(): Promise<FinanceSummary> {
  return (await getFinanceDashboardData(getFinanceDateRange("month"))).summary;
}
