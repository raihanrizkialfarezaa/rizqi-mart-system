import { prisma } from "@/lib/prisma";
import { SourcingStatus, Prisma } from "@prisma/client";
import { Decimal } from "decimal.js";
import { toDecimal, compareDecimal } from "@/lib/utils/decimal";
import { generateDocumentNumber } from "@/lib/utils/document-numbering";
import { createNotification } from "./notification.service";

/**
 * Procurement Service
 * Handles sourcing requests, supplier price comparison, and purchase orders
 * Per spec Section 6.1: Dynamic procurement untuk B2B orders
 */

export type PriceComparisonResult = {
  supplierProductId: string;
  supplierId: string;
  supplierName: string;
  productName: string;
  price: Decimal;
  isPromo: boolean;
  checkedAt: Date;
  validUntil?: Date;
  notes?: string;
};

/**
 * Create sourcing request (called dari inventory service saat stok tidak cukup)
 */
export async function createSourcingRequest(input: {
  salesOrderItemId: string;
  productId: string;
  unitId: string;
  qtyNeeded: Decimal | number;
  deadline: Date;
}): Promise<string> {
  const { salesOrderItemId, productId, unitId, qtyNeeded, deadline } = input;

  const request = await prisma.sourcingRequest.create({
    data: {
      salesOrderItemId,
      productId,
      unitId,
      qtyNeeded: toDecimal(qtyNeeded).toNumber(),
      deadline,
      status: SourcingStatus.DIBUTUHKAN,
    },
  });

  return request.id;
}

/**
 * Record supplier price quote
 * Admin mencatat harga dari berbagai supplier untuk perbandingan
 */
export async function recordPriceQuote(input: {
  supplierProductId: string;
  price: Decimal | number;
  isPromo?: boolean;
  checkedById: string;
  validUntil?: Date;
  sourcingRequestId?: string;
  notes?: string;
}): Promise<string> {
  const {
    supplierProductId,
    price,
    isPromo,
    checkedById,
    validUntil,
    sourcingRequestId,
    notes,
  } = input;

  const quote = await prisma.supplierPriceQuote.create({
    data: {
      supplierProductId,
      price: toDecimal(price).toNumber(),
      isPromo: isPromo ?? false,
      checkedById,
      validUntil,
      sourcingRequestId,
      notes,
    },
  });

  // Update sourcing request status
  if (sourcingRequestId) {
    await prisma.sourcingRequest.update({
      where: { id: sourcingRequestId },
      data: { status: SourcingStatus.SEDANG_DIBANDINGKAN },
    });
  }

  return quote.id;
}

/**
 * Compare prices untuk sourcing request
 * Returns sorted list (termurah duluan)
 */
export async function comparePricesForSourcing(
  sourcingRequestId: string
): Promise<PriceComparisonResult[]> {
  const request = await prisma.sourcingRequest.findUniqueOrThrow({
    where: { id: sourcingRequestId },
    include: {
      product: true,
      priceQuotes: {
        include: {
          supplierProduct: {
            include: {
              supplier: true,
              product: true,
            },
          },
        },
        orderBy: { price: "asc" }, // termurah duluan
      },
    },
  });

  return request.priceQuotes.map((quote) => ({
    supplierProductId: quote.supplierProductId,
    supplierId: quote.supplierProduct.supplierId,
    supplierName: quote.supplierProduct.supplier.name,
    productName: quote.supplierProduct.product.name,
    price: toDecimal(quote.price),
    isPromo: quote.isPromo,
    checkedAt: quote.checkedAt,
    validUntil: quote.validUntil || undefined,
    notes: quote.notes || undefined,
  }));
}

/**
 * Make sourcing decision
 * Admin memilih supplier mana yang akan digunakan
 */
export async function decideSourcingSupplier(input: {
  sourcingRequestId: string;
  chosenSupplierProductId: string;
  decisionReason: string;
}): Promise<void> {
  const { sourcingRequestId, chosenSupplierProductId, decisionReason } = input;

  await prisma.sourcingRequest.update({
    where: { id: sourcingRequestId },
    data: {
      chosenSupplierProductId,
      decisionReason,
      status: SourcingStatus.DIPUTUSKAN,
      decidedAt: new Date(),
    },
  });

  // Trigger notification
  try {
    const req = await prisma.sourcingRequest.findUnique({
      where: { id: sourcingRequestId },
      include: {
        product: { select: { name: true } },
        unit: { select: { code: true } },
        salesOrderItem: {
          include: {
            salesOrder: { select: { id: true, createdById: true } },
          },
        },
      },
    });
    if (req?.salesOrderItem?.salesOrder) {
      await createNotification({
        userId: req.salesOrderItem.salesOrder.createdById,
        type: "SOURCING_DECISION",
        title: `Sourcing Diputuskan: ${req.product.name}`,
        message: `Keputusan sourcing telah dibuat untuk ${req.product.name} (${req.qtyNeeded} ${req.unit.code}). Alasan: ${decisionReason}`,
        link: `/erp/orders/${req.salesOrderItem.salesOrderId}`,
        priority: "MEDIUM",
        relatedOrderId: req.salesOrderItem.salesOrderId,
      });
    }
  } catch (err) {
    console.error("[decideSourcingSupplier] Notification trigger failed:", err);
  }
}

/**
 * Create purchase order
 */
export async function createPurchaseOrder(input: {
  supplierId: string;
  purpose: string;
  items: Array<{
    productId: string;
    unitId: string;
    qty: Decimal | number;
    unitCost: Decimal | number;
    sourcingRequestId?: string;
  }>;
  createdById: string;
}): Promise<string> {
  const { supplierId, purpose, items, createdById } = input;

  const poNumber = await generateDocumentNumber("PURCHASE_ORDER");

  const po = await prisma.$transaction(async (tx) => {
    // Calculate total
    const totalAmount = items.reduce(
      (sum, item) => sum.add(toDecimal(item.qty).times(toDecimal(item.unitCost))),
      toDecimal(0)
    );

    // Create PO
    const purchaseOrder = await tx.purchaseOrder.create({
      data: {
        poNumber,
        supplierId,
        purpose,
        status: "DRAFT",
        totalAmount: totalAmount.toNumber(),
        createdById,
      },
    });

    // Create PO items
    for (const item of items) {
      const subtotal = toDecimal(item.qty).times(toDecimal(item.unitCost));

      await tx.purchaseOrderItem.create({
        data: {
          purchaseOrderId: purchaseOrder.id,
          productId: item.productId,
          unitId: item.unitId,
          qty: toDecimal(item.qty).toNumber(),
          unitCost: toDecimal(item.unitCost).toNumber(),
          subtotal: subtotal.toNumber(),
          sourcingRequestId: item.sourcingRequestId,
        },
      });
    }

    return purchaseOrder;
  });

  // Trigger notification
  try {
    await createNotification({
      userId: createdById,
      type: "PROCUREMENT_EVENT",
      title: `Purchase Order Dibuat: ${poNumber}`,
      message: `Purchase Order ${poNumber} tujuan supplier telah berhasil dibuat.`,
      link: `/erp/procurement`,
      priority: "MEDIUM",
    });
  } catch (err) {
    console.error("[createPurchaseOrder] Notification trigger failed:", err);
  }

  return po.id;
}

/**
 * Receive goods (penerimaan barang) dan create stock batches
 */
export async function receiveGoods(input: {
  purchaseOrderId: string;
  receivedById: string;
  items: Array<{
    purchaseOrderItemId: string;
    batchCode: string;
    qtyReceivedBase: Decimal | number;
    unitCostBase: Decimal | number;
    expiryDate?: Date;
  }>;
  notes?: string;
}): Promise<string> {
  const { purchaseOrderId, receivedById, items, notes } = input;

  const receipt = await prisma.$transaction(async (tx) => {
    // Create goods receipt
    const goodsReceipt = await tx.goodsReceipt.create({
      data: {
        purchaseOrderId,
        receivedById,
        notes,
      },
    });

    // Get PO items to get productId
    const poItems = await tx.purchaseOrderItem.findMany({
      where: {
        id: { in: items.map((i) => i.purchaseOrderItemId) },
      },
    });

    // Create stock batches
    for (const item of items) {
      const poItem = poItems.find((pi) => pi.id === item.purchaseOrderItemId);
      if (!poItem) continue;

      await tx.stockBatch.create({
        data: {
          productId: poItem.productId,
          goodsReceiptId: goodsReceipt.id,
          batchCode: item.batchCode,
          qtyReceivedBase: toDecimal(item.qtyReceivedBase).toNumber(),
          qtyRemainingBase: toDecimal(item.qtyReceivedBase).toNumber(),
          unitCostBase: toDecimal(item.unitCostBase).toNumber(),
          expiryDate: item.expiryDate,
        },
      });

      // Update sourcing request status jika ada
      if (poItem.sourcingRequestId) {
        await tx.sourcingRequest.update({
          where: { id: poItem.sourcingRequestId },
          data: { status: SourcingStatus.DIBELI },
        });

        // Update sales order item availability
        const sourcingRequest = await tx.sourcingRequest.findUnique({
          where: { id: poItem.sourcingRequestId },
        });

        if (sourcingRequest) {
          await tx.salesOrderItem.update({
            where: { id: sourcingRequest.salesOrderItemId },
            data: { isAvailableFromStock: true },
          });
        }
      }
    }

    // Update PO status
    await tx.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: {
        status: "RECEIVED",
        purchasedAt: new Date(),
      },
    });

    return goodsReceipt;
  });

  // Trigger notification
  try {
    const po = await prisma.purchaseOrder.findUnique({
      where: { id: purchaseOrderId },
      include: { supplier: { select: { name: true } } },
    });
    await createNotification({
      userId: receivedById,
      type: "STOCK_ALERT",
      title: `Penerimaan Barang & Re-stock`,
      message: `Penerimaan barang untuk PO ${po?.poNumber || ""} dari ${po?.supplier.name || ""} berhasil diproses. Stok telah diperbarui.`,
      link: `/erp/inventory`,
      priority: "MEDIUM",
    });
  } catch (err) {
    console.error("[receiveGoods] Notification trigger failed:", err);
  }

  return receipt.id;
}

/**
 * Get daftar purchase order untuk halaman ERP
 */
export async function getPurchaseOrders(limit = 100) {
  return prisma.purchaseOrder.findMany({
    take: limit,
    orderBy: { createdAt: "desc" },
    include: {
      supplier: { select: { name: true } },
      items: { select: { id: true } },
    },
  });
}

/**
 * Get satu sourcing request by ID dengan relasi lengkap (untuk halaman detail)
 */
export async function getSourcingRequestById(id: string) {
  return prisma.sourcingRequest.findUnique({
    where: { id },
    include: {
      product: true,
      unit: true,
      salesOrderItem: {
        include: {
          salesOrder: {
            select: {
              id: true,
              orderNumber: true,
              institution: { select: { name: true } },
            },
          },
        },
      },
      chosenSupplierProduct: {
        include: { supplier: true },
      },
      priceQuotes: {
        include: {
          supplierProduct: { include: { supplier: true } },
        },
        orderBy: { price: "asc" },
      },
    },
  });
}

/**
 * Get sourcing requests dengan filters
 */
export async function getSourcingRequests(filters: {
  status?: SourcingStatus;
  productId?: string;
  deadlineBefore?: Date;
  limit?: number;
}) {
  const where: Prisma.SourcingRequestWhereInput = {};

  if (filters.status) where.status = filters.status;
  if (filters.productId) where.productId = filters.productId;
  if (filters.deadlineBefore) where.deadline = { lte: filters.deadlineBefore };

  return prisma.sourcingRequest.findMany({
    where,
    include: {
      product: true,
      unit: true,
      salesOrderItem: {
        include: {
          salesOrder: {
            select: {
              orderNumber: true,
              institution: {
                select: { name: true },
              },
            },
          },
        },
      },
      priceQuotes: {
        include: {
          supplierProduct: {
            include: {
              supplier: true,
            },
          },
        },
      },
    },
    orderBy: { deadline: "asc" },
    take: filters.limit || 50,
  });
}
