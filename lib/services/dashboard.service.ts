import { prisma } from "@/lib/prisma";
import { OrderStatus, PaymentStatus, SourcingStatus } from "@prisma/client";
import { toDecimal, addDecimal } from "@/lib/utils/decimal";
import { getProductStockLevels } from "@/lib/services/inventory-dashboard.service";

/**
 * Dashboard Service
 * Agregasi metrik untuk ERP dashboard overview.
 * Read-only, aman dipanggil dari Server Component.
 */

const startOfToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const startOfMonth = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

export type DashboardRange = "7d" | "30d" | "month" | "90d";

export type DashboardDateRange = {
  key: DashboardRange;
  label: string;
  days: number;
  from: Date;
  to: Date;
};

export function getDashboardDateRange(range: string | undefined): DashboardDateRange {
  const key: DashboardRange =
    range === "7d" || range === "month" || range === "90d" ? range : "30d";
  const now = new Date();

  if (key === "month") {
    return {
      key,
      label: "Bulan ini",
      days: Math.max(1, now.getDate()),
      from: startOfMonth(),
      to: now,
    };
  }

  const days = key === "7d" ? 7 : key === "90d" ? 90 : 30;
  const from = new Date(now);
  from.setDate(from.getDate() - (days - 1));
  from.setHours(0, 0, 0, 0);

  return {
    key,
    label: key === "7d" ? "7 hari" : key === "90d" ? "90 hari" : "30 hari",
    days,
    from,
    to: now,
  };
}

const ACTIVE_ORDER_STATUSES = [
  OrderStatus.MENUNGGU_KONFIRMASI,
  OrderStatus.DIKONFIRMASI,
  OrderStatus.MENUNGGU_PENGADAAN,
  OrderStatus.SIAP_KIRIM,
  OrderStatus.DALAM_PENGIRIMAN,
  OrderStatus.TERKIRIM_MENUNGGU_TTD,
];

const ORDER_STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  MENUNGGU_KONFIRMASI: "Review",
  DIKONFIRMASI: "Dikonfirmasi",
  MENUNGGU_PENGADAAN: "Pengadaan",
  SIAP_KIRIM: "Siap Kirim",
  DALAM_PENGIRIMAN: "Pengiriman",
  TERKIRIM_MENUNGGU_TTD: "Menunggu TTD",
  SELESAI: "Selesai",
  DIBATALKAN: "Batal",
};

export type DashboardMetrics = {
  salesToday: string;
  salesTodayCount: number;
  revenueMonth: string;
  marginMonth: string;
  pendingOrders: number;
  lowStockCount: number;
  expiringSoonCount: number;
  pendingPaymentValidations: number;
  pendingSignatures: number;
  unpaidReceivables: string;
};

export type RecentOrderRow = {
  id: string;
  orderNumber: string;
  createdAt: string;
  totalAmount: string;
  status: string;
  customer: { name: string } | null;
  institution: { name: string } | null;
};

export type TopProductRow = {
  productId: string;
  name: string;
  sku: string;
  qtySold: string;
  revenue: string;
};

export type SalesTrendPoint = {
  date: string;
  revenue: number;
  margin: number;
};

export type OrderStatusPipelineRow = {
  status: string;
  label: string;
  count: number;
  href: string;
};

export type DashboardAlertsDetail = {
  lowStock: Array<{
    id: string;
    sku: string;
    name: string;
    minStockAlert: string;
    totalStock: string;
    baseUnitCode: string;
    href: string;
  }>;
  expiring: Array<{
    id: string;
    batchNumber: string;
    qtyRemaining: string;
    expiryDate: string;
    productName: string;
    productSku: string;
    href: string;
  }>;
  pendingPayments: Array<{
    id: string;
    paymentNumber: string;
    amount: number;
    method: string;
    orderNumber: string;
    customerName: string;
    href: string;
  }>;
  pendingSignatures: Array<{
    id: string;
    deliveryNoteNumber: string;
    status: string;
    orderNumber: string;
    institutionName: string;
    href: string;
  }>;
};

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const today = startOfToday();
  const monthStart = startOfMonth();
  const in7Days = new Date();
  in7Days.setDate(in7Days.getDate() + 7);

  const [
    salesTodayAgg,
    monthOrders,
    pendingOrders,
    stockLevels,
    expiringBatches,
    pendingValidations,
    pendingSignatures,
    unpaidOrders,
  ] = await Promise.all([
    prisma.salesOrder.aggregate({
      where: { createdAt: { gte: today }, status: { not: OrderStatus.DIBATALKAN } },
      _sum: { totalAmount: true },
      _count: true,
    }),
    prisma.salesOrder.findMany({
      where: { createdAt: { gte: monthStart }, status: { not: OrderStatus.DIBATALKAN } },
      select: { totalAmount: true, totalMarginAmount: true },
    }),
    prisma.salesOrder.count({
      where: {
        status: {
          in: [
            ...ACTIVE_ORDER_STATUSES,
          ],
        },
      },
    }),
    getProductStockLevels(),
    prisma.stockBatch.count({
      where: {
        qtyRemainingBase: { gt: 0 },
        expiryDate: { gte: new Date(), lte: in7Days },
      },
    }),
    prisma.payment.count({
      where: { status: PaymentStatus.MENUNGGU_VALIDASI },
    }),
    prisma.deliveryNote.count({
      where: { status: { in: ["DITERBITKAN", "DITANDATANGANI_DAPUR"] } },
    }),
    prisma.salesOrder.findMany({
      where: {
        paymentStatus: { in: [PaymentStatus.BELUM_BAYAR, PaymentStatus.SEBAGIAN] },
        status: { not: OrderStatus.DIBATALKAN },
      },
      select: { totalAmount: true },
    }),
  ]);

  // Revenue & margin bulan berjalan
  let revenueMonth = toDecimal(0);
  let marginMonth = toDecimal(0);
  for (const o of monthOrders) {
    revenueMonth = addDecimal(revenueMonth, o.totalAmount);
    marginMonth = addDecimal(marginMonth, o.totalMarginAmount);
  }

  // Low stock count
  const lowStockCount = stockLevels.filter((p) => p.isLow).length;

  // Piutang belum dibayar
  let unpaid = toDecimal(0);
  for (const o of unpaidOrders) {
    unpaid = addDecimal(unpaid, o.totalAmount);
  }

  return {
    salesToday: (salesTodayAgg._sum.totalAmount ?? 0).toString(),
    salesTodayCount: salesTodayAgg._count,
    revenueMonth: revenueMonth.toString(),
    marginMonth: marginMonth.toString(),
    pendingOrders,
    lowStockCount,
    expiringSoonCount: expiringBatches,
    pendingPaymentValidations: pendingValidations,
    pendingSignatures,
    unpaidReceivables: unpaid.toString(),
  };
}

/**
 * Order terbaru untuk widget dashboard
 */
export async function getRecentOrders(limit = 8): Promise<RecentOrderRow[]> {
  const orders = await prisma.salesOrder.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { name: true } },
      institution: { select: { name: true } },
    },
  });

  return orders.map((order) => ({
    id: order.id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt.toISOString(),
    totalAmount: order.totalAmount.toString(),
    status: order.status,
    customer: order.customer,
    institution: order.institution,
  }));
}

/**
 * Top produk berdasarkan qty terjual (30 hari terakhir)
 */
export async function getTopProducts(limit = 5, days = 30): Promise<TopProductRow[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const grouped = await prisma.salesOrderItem.groupBy({
    by: ["productId"],
    where: { createdAt: { gte: since } },
    _sum: { qty: true, subtotalSell: true },
    orderBy: { _sum: { subtotalSell: "desc" } },
    take: limit,
  });

  const productIds = grouped.map((g) => g.productId);
  const products = await prisma.product.findMany({
    where: { id: { in: productIds } },
    select: { id: true, name: true, sku: true },
  });
  const productMap = new Map(products.map((p) => [p.id, p]));

  return grouped.map((g) => ({
    productId: g.productId,
    name: productMap.get(g.productId)?.name ?? "—",
    sku: productMap.get(g.productId)?.sku ?? "",
    qtySold: (g._sum.qty ?? 0).toString(),
    revenue: (g._sum.subtotalSell ?? 0).toString(),
  }));
}

export type SourcingAlert = {
  count: number;
};

export async function getActiveSourcingCount(): Promise<number> {
  return prisma.sourcingRequest.count({
    where: {
      status: {
        in: [
          SourcingStatus.DIBUTUHKAN,
          SourcingStatus.SEDANG_DIBANDINGKAN,
          SourcingStatus.DIPUTUSKAN,
        ],
      },
    },
  });
}

/**
 * Mendapatkan data tren penjualan (revenue & profit) per hari dalam 30 hari terakhir
 */
export async function getSalesAndMarginTrend(days = 30): Promise<SalesTrendPoint[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  since.setHours(0, 0, 0, 0);

  const orders = await prisma.salesOrder.findMany({
    where: {
      createdAt: { gte: since },
      status: { not: OrderStatus.DIBATALKAN },
    },
    select: {
      createdAt: true,
      totalAmount: true,
      totalMarginAmount: true,
    },
    orderBy: { createdAt: "asc" },
  });

  // Group by date
  const groups: Record<string, { date: string; revenue: number; margin: number }> = {};
  
  // Pre-fill last N days with 0
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const dateStr = d.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
    const key = d.toISOString().split("T")[0];
    groups[key] = { date: dateStr, revenue: 0, margin: 0 };
  }

  for (const o of orders) {
    const key = o.createdAt.toISOString().split("T")[0];
    if (groups[key]) {
      groups[key].revenue += Number(o.totalAmount);
      groups[key].margin += Number(o.totalMarginAmount);
    }
  }

  return Object.keys(groups)
    .sort()
    .map((k) => groups[k]);
}

export async function getOrderStatusPipeline(): Promise<OrderStatusPipelineRow[]> {
  const grouped = await prisma.salesOrder.groupBy({
    by: ["status"],
    where: { status: { not: OrderStatus.DIBATALKAN } },
    _count: true,
  });

  const countMap = new Map(grouped.map((row) => [row.status, row._count]));

  return ACTIVE_ORDER_STATUSES.map((status) => ({
    status,
    label: ORDER_STATUS_LABELS[status] ?? status.replace(/_/g, " "),
    count: countMap.get(status) ?? 0,
    href: `/erp/orders?status=${status}`,
  }));
}

/**
 * Mendapatkan detail item-item alerts untuk dashboard modal detail
 */
export async function getDashboardAlertsDetail(expiringWithinDays = 7): Promise<DashboardAlertsDetail> {
  const in7Days = new Date();
  in7Days.setDate(in7Days.getDate() + expiringWithinDays);

  const [stockLevels, expiringBatches, pendingPayments, pendingSignatures] = await Promise.all([
    getProductStockLevels(),
    // Expiring batches in 7 days
    prisma.stockBatch.findMany({
      where: {
        qtyRemainingBase: { gt: 0 },
        expiryDate: { gte: new Date(), lte: in7Days },
      },
      include: {
        product: { select: { name: true, sku: true } },
      },
      orderBy: { expiryDate: "asc" },
    }),
    // Pending payment validations
    prisma.payment.findMany({
      where: { status: PaymentStatus.MENUNGGU_VALIDASI },
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
    // Pending signatures
    prisma.deliveryNote.findMany({
      where: { status: { in: ["DITERBITKAN", "DITANDATANGANI_DAPUR"] } },
      include: {
        salesOrder: {
          select: {
            id: true,
            orderNumber: true,
            institution: { select: { name: true } },
          },
        },
      },
      orderBy: { issuedAt: "asc" },
    }),
  ]);

  const lowStock = stockLevels
    .filter((p) => p.isLow)
    .map((p) => ({
      id: p.id,
      sku: p.sku,
      name: p.name,
      minStockAlert: p.minStockAlert,
      totalStock: p.b2cStock,
      baseUnitCode: p.baseUnitCode,
      href: `/erp/inventory?search=${encodeURIComponent(p.sku)}`,
    }));

  return {
    lowStock,
    expiring: expiringBatches.map((b) => ({
      id: b.id,
      batchNumber: b.batchCode,
      qtyRemaining: b.qtyRemainingBase.toString(),
      expiryDate: (b.expiryDate ?? new Date()).toISOString(),
      productName: b.product.name,
      productSku: b.product.sku,
      href: `/erp/inventory/batches?search=${encodeURIComponent(b.batchCode)}`,
    })),
    pendingPayments: pendingPayments.map((p) => ({
      id: p.id,
      paymentNumber: p.paymentNumber,
      amount: Number(p.amount),
      method: p.method,
      orderNumber: p.salesOrder.orderNumber,
      customerName: p.salesOrder.customer?.name ?? p.salesOrder.institution?.name ?? "Walk-in",
      href: `/erp/orders/${p.salesOrder.id}`,
    })),
    pendingSignatures: pendingSignatures.map((d) => ({
      id: d.id,
      deliveryNoteNumber: d.documentNumber,
      status: d.status,
      orderNumber: d.salesOrder.orderNumber,
      institutionName: d.salesOrder.institution?.name ?? "—",
      href: `/erp/orders/${d.salesOrder.id}`,
    })),
  };
}
