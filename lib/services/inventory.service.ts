import { prisma } from "@/lib/prisma";
import { Prisma, StockMovementType, SourcingStatus } from "@prisma/client";
import { Decimal } from "decimal.js";
import { toDecimal, multiplyDecimal, divideDecimal, addDecimal } from "@/lib/utils/decimal";

/**
 * Inventory Service
 * Handles stock allocation, batch management, and stock movements
 * Implements FIFO/EFO (Expiry-First-Out) strategy untuk sembako
 */

export type AllocateStockResult = {
  success: boolean;
  allocated: boolean;
  unitCostPrice: Decimal;
  totalCost: Decimal;
  batchesUsed: Array<{
    batchId: string;
    qtyTaken: Decimal;
    unitCost: Decimal;
  }>;
  remainingQty: Decimal;
  needsSourcing: boolean;
};

export type StockAllocationInput = {
  productId: string;
  qtyNeeded: Decimal | number;
  salesOrderItemId: string;
  actorId: string;
  baseUnitConversion: Decimal | number; // untuk convert dari unit jual ke base unit
};

/**
 * Allocate stock menggunakan strategi EFO (Expiry-First-Out)
 * Produk dengan expiry date terdekat dikeluarkan duluan
 */
export async function allocateStock(
  input: StockAllocationInput,
  tx?: Prisma.TransactionClient
): Promise<AllocateStockResult> {
  const { productId, qtyNeeded, salesOrderItemId, actorId, baseUnitConversion } = input;
  const client = tx || prisma;

  // Convert qty ke base unit
  const qtyNeededBase = multiplyDecimal(qtyNeeded, baseUnitConversion);
  
  let remainingQty = toDecimal(qtyNeededBase);
  let totalCost = toDecimal(0);
  const batchesUsed: Array<{
    batchId: string;
    qtyTaken: Decimal;
    unitCost: Decimal;
  }> = [];

  // Query available batches dengan EFO strategy
  // Order: expiryDate ASC (yg paling cepat expired keluar duluan), lalu receivedAt ASC
  const availableBatches = await client.stockBatch.findMany({
    where: {
      productId,
      qtyRemainingBase: {
        gt: 0,
      },
    },
    orderBy: [
      { expiryDate: "asc" },
      { receivedAt: "asc" },
    ],
  });

  // Allocate dari batch yang tersedia
  for (const batch of availableBatches) {
    if (remainingQty.lte(0)) break;

    const batchQtyRemaining = toDecimal(batch.qtyRemainingBase);
    const qtyToTake = Decimal.min(remainingQty, batchQtyRemaining);
    const batchUnitCost = toDecimal(batch.unitCostBase);
    const costFromThisBatch = multiplyDecimal(qtyToTake, batchUnitCost);

    batchesUsed.push({
      batchId: batch.id,
      qtyTaken: qtyToTake,
      unitCost: batchUnitCost,
    });

    totalCost = addDecimal(totalCost, costFromThisBatch);
    remainingQty = remainingQty.minus(qtyToTake);
  }

  // Hitung weighted average unit cost price
  const unitCostPrice = qtyNeededBase.gt(remainingQty)
    ? divideDecimal(totalCost, qtyNeededBase.minus(remainingQty))
    : toDecimal(0);

  const fullyAllocated = remainingQty.lte(0);
  const anyAllocated = batchesUsed.length > 0;
  const needsSourcing = !fullyAllocated;

  // Commit stock movements untuk batch apapun yang terpakai
  // (partial allocation: ambil yang tersedia, sourcing untuk sisanya)
  if (batchesUsed.length > 0) {
    for (const batch of batchesUsed) {
      await client.stockBatch.update({
        where: { id: batch.batchId },
        data: {
          qtyRemainingBase: {
            decrement: batch.qtyTaken.toNumber(),
          },
        },
      });

      await client.stockMovement.create({
        data: {
          productId,
          stockBatchId: batch.batchId,
          type: StockMovementType.KELUAR_PENJUALAN,
          qtyBase: batch.qtyTaken.neg().toNumber(),
          relatedSalesOrderItemId: salesOrderItemId,
          actorId,
          notes: `Alokasi stok untuk order item ${salesOrderItemId}`,
        },
      });
    }
  }

  return {
    success: true,
    allocated: anyAllocated,
    unitCostPrice,
    totalCost,
    batchesUsed,
    remainingQty,
    needsSourcing,
  };
}

/**
 * Create sourcing request untuk qty yang tidak tersedia di stok
 */
export async function createSourcingRequestForShortage(
  salesOrderItemId: string,
  productId: string,
  unitId: string,
  qtyNeeded: Decimal | number,
  deadline: Date,
  tx?: Prisma.TransactionClient
): Promise<string> {
  const client = tx || prisma;
  const sourcingRequest = await client.sourcingRequest.create({
    data: {
      salesOrderItemId,
      productId,
      unitId,
      qtyNeeded: toDecimal(qtyNeeded).toNumber(),
      deadline,
      status: SourcingStatus.DIBUTUHKAN,
    },
  });

  return sourcingRequest.id;
}

/**
 * Create stock batch dari goods receipt (penerimaan barang)
 */
export async function createStockBatch(input: {
  productId: string;
  goodsReceiptId: string;
  batchCode: string;
  qtyReceivedBase: Decimal | number;
  unitCostBase: Decimal | number;
  expiryDate?: Date;
}): Promise<string> {
  const { productId, goodsReceiptId, batchCode, qtyReceivedBase, unitCostBase, expiryDate } =
    input;

  const qtyDecimal = toDecimal(qtyReceivedBase);
  const costDecimal = toDecimal(unitCostBase);

  const batch = await prisma.stockBatch.create({
    data: {
      productId,
      goodsReceiptId,
      batchCode,
      qtyReceivedBase: qtyDecimal.toNumber(),
      qtyRemainingBase: qtyDecimal.toNumber(),
      unitCostBase: costDecimal.toNumber(),
      expiryDate,
    },
  });

  return batch.id;
}

/**
 * Record stock movement manual (adjustment, retur, expired, dll)
 */
export async function recordStockMovement(input: {
  productId: string;
  stockBatchId?: string;
  type: StockMovementType;
  qtyBase: Decimal | number;
  actorId: string;
  notes?: string;
  relatedSalesOrderItemId?: string;
}): Promise<string> {
  const { productId, stockBatchId, type, qtyBase, actorId, notes, relatedSalesOrderItemId } =
    input;

  const qtyDecimal = toDecimal(qtyBase);

  const movement = await prisma.stockMovement.create({
    data: {
      productId,
      stockBatchId,
      type,
      qtyBase: qtyDecimal.toNumber(),
      actorId,
      notes,
      relatedSalesOrderItemId,
    },
  });

  // Jika ada stockBatchId dan tipe adalah keluar (negative), update batch
  if (
    stockBatchId &&
    (type === StockMovementType.KELUAR_PENJUALAN ||
      type === StockMovementType.KELUAR_RETUR ||
      type === StockMovementType.KELUAR_PENYESUAIAN ||
      type === StockMovementType.KELUAR_KADALUWARSA)
  ) {
    await prisma.stockBatch.update({
      where: { id: stockBatchId },
      data: {
        qtyRemainingBase: {
          decrement: Math.abs(qtyDecimal.toNumber()),
        },
      },
    });
  }

  // Jika tipe adalah masuk (positive), update batch
  if (
    stockBatchId &&
    (type === StockMovementType.MASUK_PEMBELIAN ||
      type === StockMovementType.MASUK_RETUR ||
      type === StockMovementType.MASUK_PENYESUAIAN)
  ) {
    await prisma.stockBatch.update({
      where: { id: stockBatchId },
      data: {
        qtyRemainingBase: {
          increment: Math.abs(qtyDecimal.toNumber()),
        },
      },
    });
  }

  return movement.id;
}

/**
 * Get available stock untuk produk (sum dari semua batch)
 */
export async function getAvailableStock(productId: string): Promise<Decimal> {
  const batches = await prisma.stockBatch.findMany({
    where: {
      productId,
      qtyRemainingBase: {
        gt: 0,
      },
    },
    select: {
      qtyRemainingBase: true,
    },
  });

  const total = batches.reduce(
    (sum, batch) => sum.add(toDecimal(batch.qtyRemainingBase)),
    toDecimal(0)
  );

  return total;
}

/**
 * Check expiring stock (akan kadaluwarsa dalam N hari)
 */
export async function getExpiringStock(withinDays: number = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + withinDays);

  return prisma.stockBatch.findMany({
    where: {
      expiryDate: {
        lte: futureDate,
        gte: new Date(),
      },
      qtyRemainingBase: {
        gt: 0,
      },
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
        },
      },
    },
    orderBy: {
      expiryDate: "asc",
    },
  });
}

/**
 * Check expired stock (sudah lewat expiry date)
 */
export async function getExpiredStock() {
  return prisma.stockBatch.findMany({
    where: {
      expiryDate: {
        lt: new Date(),
      },
      qtyRemainingBase: {
        gt: 0,
      },
    },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          sku: true,
        },
      },
    },
    orderBy: {
      expiryDate: "asc",
    },
  });
}
