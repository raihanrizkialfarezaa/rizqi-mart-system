import { prisma } from "@/lib/prisma";
import { toDecimal, addDecimal, multiplyDecimal } from "@/lib/utils/decimal";
import { Decimal } from "decimal.js";

/**
 * Inventory Dashboard Service
 * Query agregat untuk halaman inventori ERP (read-only).
 */

export type ProductStockRow = {
  id: string;
  sku: string;
  name: string;
  categoryName: string;
  baseUnitCode: string;
  totalStock: string;
  bookedStock: string;
  b2cStock: string;
  minStockAlert: string;
  isLow: boolean;
  batchCount: number;
  nearestExpiry: Date | null;
};

export async function getProductStockLevels(): Promise<ProductStockRow[]> {
  const activeB2BItems = await prisma.salesOrderItem.findMany({
    where: {
      salesOrder: {
        orderType: "B2B_GROSIR",
        status: { notIn: ["SELESAI", "DIBATALKAN"] },
      },
    },
    include: {
      product: { select: { baseUnitId: true } },
    },
  });

  const bookedStockMap: Record<string, Decimal> = {};
  for (const item of activeB2BItems) {
    let factor = 1;
    if (item.unitId !== item.product.baseUnitId) {
      const conv = await prisma.productUnitConversion.findUnique({
        where: {
          productId_unitId: {
            productId: item.productId,
            unitId: item.unitId,
          },
        },
      });
      if (conv) {
        factor = Number(conv.conversionToBase);
      }
    }
    const qtyBase = toDecimal(item.qty).times(factor);
    if (!bookedStockMap[item.productId]) {
      bookedStockMap[item.productId] = toDecimal(0);
    }
    bookedStockMap[item.productId] = bookedStockMap[item.productId].add(qtyBase);
  }

  const products = await prisma.product.findMany({
    where: { isActive: true },
    include: {
      category: { select: { name: true } },
      baseUnit: { select: { code: true } },
      stockBatches: {
        where: { qtyRemainingBase: { gt: 0 } },
        select: { qtyRemainingBase: true, expiryDate: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return products.map((p) => {
    const total = p.stockBatches.reduce(
      (sum, b) => addDecimal(sum, b.qtyRemainingBase),
      toDecimal(0)
    );
    const expiries = p.stockBatches
      .map((b) => b.expiryDate)
      .filter((d): d is Date => d !== null)
      .sort((a, b) => a.getTime() - b.getTime());

    const booked = bookedStockMap[p.id] || toDecimal(0);
    const b2cStock = Decimal.max(0, total.minus(booked));

    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      categoryName: p.category.name,
      baseUnitCode: p.baseUnit.code,
      totalStock: total.toString(),
      bookedStock: booked.toString(),
      b2cStock: b2cStock.toString(),
      minStockAlert: p.minStockAlert.toString(),
      isLow: b2cStock.lte(toDecimal(p.minStockAlert)), // low if eceran is below alert!
      batchCount: p.stockBatches.length,
      nearestExpiry: expiries[0] ?? null,
    };
  });
}

export async function getAllBatches() {
  return prisma.stockBatch.findMany({
    where: { qtyRemainingBase: { gt: 0 } },
    include: {
      product: { select: { name: true, sku: true, baseUnit: { select: { code: true } } } },
    },
    orderBy: [{ expiryDate: "asc" }, { receivedAt: "desc" }],
    take: 200,
  });
}

export async function getRecentMovements(limit = 100) {
  return prisma.stockMovement.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      product: { select: { name: true, sku: true } },
      stockBatch: { select: { batchCode: true } },
    },
  });
}
