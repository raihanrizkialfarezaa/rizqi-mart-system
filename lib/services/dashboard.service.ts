import { prisma } from "@/lib/prisma";
import { OrderStatus, PaymentStatus, SourcingStatus } from "@prisma/client";
import { toDecimal, addDecimal } from "@/lib/utils/decimal";

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

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const today = startOfToday();
  const monthStart = startOfMonth();
  const in7Days = new Date();
  in7Days.setDate(in7Days.getDate() + 7);

  const [
    salesTodayAgg,
    monthOrders,
    pendingOrders,
    lowStockProducts,
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
            OrderStatus.MENUNGGU_KONFIRMASI,
            OrderStatus.DIKONFIRMASI,
            OrderStatus.MENUNGGU_PENGADAAN,
            OrderStatus.SIAP_KIRIM,
            OrderStatus.DALAM_PENGIRIMAN,
            OrderStatus.TERKIRIM_MENUNGGU_TTD,
          ],
        },
      },
    }),
    // Produk dengan total stok <= minStockAlert
    prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        minStockAlert: true,
        stockBatches: {
          where: { qtyRemainingBase: { gt: 0 } },
          select: { qtyRemainingBase: true },
        },
      },
    }),
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
  const lowStockCount = lowStockProducts.filter((p) => {
    const total = p.stockBatches.reduce(
      (sum, b) => addDecimal(sum, b.qtyRemainingBase),
      toDecimal(0)
    );
    return total.lte(toDecimal(p.minStockAlert));
  }).length;

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
export async function getRecentOrders(limit = 8) {
  return prisma.salesOrder.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      customer: { select: { name: true } },
      institution: { select: { name: true } },
    },
  });
}

/**
 * Top produk berdasarkan qty terjual (30 hari terakhir)
 */
export async function getTopProducts(limit = 5) {
  const since = new Date();
  since.setDate(since.getDate() - 30);

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
