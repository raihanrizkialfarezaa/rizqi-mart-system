import { prisma } from "@/lib/prisma";
import { toDecimal, addDecimal } from "@/lib/utils/decimal";

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
  minStockAlert: string;
  isLow: boolean;
  batchCount: number;
  nearestExpiry: Date | null;
};

export async function getProductStockLevels(): Promise<ProductStockRow[]> {
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

    return {
      id: p.id,
      sku: p.sku,
      name: p.name,
      categoryName: p.category.name,
      baseUnitCode: p.baseUnit.code,
      totalStock: total.toString(),
      minStockAlert: p.minStockAlert.toString(),
      isLow: total.lte(toDecimal(p.minStockAlert)),
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
