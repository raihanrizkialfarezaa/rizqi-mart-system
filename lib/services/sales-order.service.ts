import { prisma } from "@/lib/prisma";
import {
  SalesChannel,
  OrderType,
  OrderStatus,
  FulfillmentStatus,
  PaymentStatus,
  DeliveryMethod,
  Prisma,
} from "@prisma/client";
import { Decimal } from "decimal.js";
import { toDecimal, addDecimal, multiplyDecimal } from "@/lib/utils/decimal";
import { generateDocumentNumber } from "@/lib/utils/document-numbering";
import { allocateStock, createSourcingRequestForShortage } from "./inventory.service";
import { validatePriceCeiling } from "./sales-order-calculations";
import { createNotification, createOrderStatusNotification } from "./notification.service";
import { formatCurrency } from "@/lib/utils/decimal";

/**
 * Sales Order Service
 * Handles order creation, status updates, and order lifecycle management
 * Supports both B2C (ecer) and B2B (grosir SPPG) orders
 */

export type CreateSalesOrderInput = {
  channel: SalesChannel;
  orderType: OrderType;
  customerId?: string;
  institutionId?: string;
  deliveryMethod: DeliveryMethod;
  deliveryAddressText?: string;
  deliveryLatitude?: number;
  deliveryLongitude?: number;
  isFreeDelivery?: boolean;
  requestedDeadline?: Date;
  requestedDeliveryDate?: Date;
  requestedDeliveryTime?: string;
  deliveryTimeSlot?: "PAGI" | "SIANG" | "SORE" | "CUSTOM";
  entryMethod?: "ADMIN_INPUT" | "CUSTOMER_PORTAL";
  dapurIdentityId?: string;
  customerNote?: string;
  items: Array<{
    productId: string;
    unitId: string;
    qty: number;
    unitSellPrice: number;
    baseUnitConversion: number;
  }>;
  createdById: string;
};

export type SalesOrderWithItems = Prisma.SalesOrderGetPayload<{
  include: {
    items: {
      include: {
        product: true;
        unit: true;
      };
    };
    customer: true;
    institution: true;
    createdBy: true;
  };
}>;

/**
 * Create new sales order dengan alokasi stok otomatis
 */
export async function createSalesOrder(
  input: CreateSalesOrderInput
): Promise<SalesOrderWithItems> {
  const {
    channel,
    orderType,
    customerId,
    institutionId,
    deliveryMethod,
    deliveryAddressText,
    deliveryLatitude,
    deliveryLongitude,
    isFreeDelivery,
    requestedDeadline,
    requestedDeliveryDate,
    requestedDeliveryTime,
    deliveryTimeSlot,
    entryMethod,
    dapurIdentityId,
    customerNote,
    items,
    createdById,
  } = input;

  // Generate order number
  const orderNumber = await generateDocumentNumber("SALES_ORDER");

  // PAGU validation untuk B2B orders
  if (institutionId && orderType === "B2B_GROSIR") {
    const paguErrors: Array<{
      productId: string;
      unitSellPrice: number;
      priceCeiling?: number;
      exceedsBy?: number;
    }> = [];

    for (const item of items) {
      const result = await validatePriceCeiling(
        institutionId,
        item.productId,
        item.unitId,
        item.unitSellPrice
      );

      if (!result.isValid) {
        paguErrors.push({
          productId: item.productId,
          unitSellPrice: item.unitSellPrice,
          priceCeiling: result.priceCeiling?.toNumber(),
          exceedsBy: result.exceedsBy?.toNumber(),
        });
      }
    }

    if (paguErrors.length > 0) {
      const details = paguErrors
        .map(
          (e) =>
            `Product ${e.productId}: harga Rp${e.unitSellPrice} melebihi pagu Rp${e.priceCeiling} (kelebihan Rp${e.exceedsBy})`
        )
        .join("; ");
      throw new Error(`PAGU validation failed: ${details}`);
    }
  }

  // Compute delivery deadlines
  let deliveryDeadline: Date | null = null;
  let sourcingDeadline: Date | null = null;

  if (requestedDeliveryDate) {
    const deliveryDate = new Date(requestedDeliveryDate);
    if (deliveryTimeSlot === "CUSTOM" && requestedDeliveryTime) {
      const [hours, minutes] = requestedDeliveryTime.split(":").map(Number);
      deliveryDeadline = new Date(deliveryDate);
      deliveryDeadline.setHours(hours, minutes, 0, 0);
    } else if (deliveryTimeSlot === "PAGI") {
      deliveryDeadline = new Date(deliveryDate);
      deliveryDeadline.setHours(12, 0, 0, 0);
    } else if (deliveryTimeSlot === "SIANG") {
      deliveryDeadline = new Date(deliveryDate);
      deliveryDeadline.setHours(17, 0, 0, 0);
    } else if (deliveryTimeSlot === "SORE") {
      deliveryDeadline = new Date(deliveryDate);
      deliveryDeadline.setHours(20, 0, 0, 0);
    } else {
      deliveryDeadline = new Date(deliveryDate);
      deliveryDeadline.setHours(17, 0, 0, 0);
    }

    sourcingDeadline = new Date(deliveryDeadline.getTime() - 60 * 60 * 1000);
  }

  // Create order dalam transaction
  const order = await prisma.$transaction(
    async (tx) => {
    // 1. Create SalesOrder
    const newOrder = await tx.salesOrder.create({
      data: {
        orderNumber,
        channel,
        orderType,
        customerId,
        institutionId,
        dapurIdentityId,
        entryMethod: entryMethod || "ADMIN_INPUT",
        requestedDeliveryDate,
        requestedDeliveryTime,
        deliveryTimeSlot,
        deliveryDeadline,
        sourcingDeadline,
        customerStatus: entryMethod === "CUSTOMER_PORTAL" ? "PENDING_REVIEW" : undefined,
        customerNote,
        deliveryMethod,
        deliveryAddressText,
        deliveryLatitude,
        deliveryLongitude,
        isFreeDelivery: isFreeDelivery ?? false,
        requestedDeadline,
        status: OrderStatus.DRAFT,
        fulfillmentStatus: FulfillmentStatus.BELUM_DIPROSES,
        paymentStatus: PaymentStatus.BELUM_BAYAR,
        subtotal: 0,
        discountAmount: 0,
        totalAmount: 0,
        totalCostAmount: 0,
        totalMarginAmount: 0,
        createdById,
      },
    });

    let subtotal = toDecimal(0);
    let totalCost = toDecimal(0);
    let allItemsAvailable = true;

    // 2. Create order items dan allocate stock
    for (const item of items) {
      const itemSubtotal = multiplyDecimal(item.qty, item.unitSellPrice);
      subtotal = addDecimal(subtotal, itemSubtotal);

      // Create sales order item
      const orderItem = await tx.salesOrderItem.create({
        data: {
          salesOrderId: newOrder.id,
          productId: item.productId,
          unitId: item.unitId,
          qty: item.qty,
          unitSellPrice: item.unitSellPrice,
          subtotalSell: itemSubtotal.toNumber(),
          unitCostPrice: 0,
          subtotalCost: 0,
          marginAmount: 0,
          isAvailableFromStock: false, // will be updated by allocation
        },
      });

      // Allocate stock
      const allocationResult = await allocateStock({
        productId: item.productId,
        qtyNeeded: item.qty,
        salesOrderItemId: orderItem.id,
        actorId: createdById,
        baseUnitConversion: item.baseUnitConversion,
      }, tx);

      // Update order item dengan cost info
      const marginAmount = multiplyDecimal(item.qty, item.unitSellPrice).minus(
        allocationResult.totalCost
      );

      await tx.salesOrderItem.update({
        where: { id: orderItem.id },
        data: {
          unitCostPrice: allocationResult.unitCostPrice.toNumber(),
          subtotalCost: allocationResult.totalCost.toNumber(),
          marginAmount: marginAmount.toNumber(),
          isAvailableFromStock: allocationResult.allocated,
        },
      });

      totalCost = addDecimal(totalCost, allocationResult.totalCost);

      // Jika tidak fully tersedia, buat sourcing request untuk sisa
      if (allocationResult.needsSourcing) {
        allItemsAvailable = false;

        // Create sourcing request
        const deadline = requestedDeadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        await createSourcingRequestForShortage(
          orderItem.id,
          item.productId,
          item.unitId,
          allocationResult.remainingQty,
          deadline,
          tx
        );
      }
    }

    // 3. Update order totals
    const totalAmount = subtotal; // bisa dikurangi discount jika ada
    const totalMargin = subtotal.minus(totalCost);

    await tx.salesOrder.update({
      where: { id: newOrder.id },
      data: {
        subtotal: subtotal.toNumber(),
        totalAmount: totalAmount.toNumber(),
        totalCostAmount: totalCost.toNumber(),
        totalMarginAmount: totalMargin.toNumber(),
        status: allItemsAvailable ? OrderStatus.MENUNGGU_KONFIRMASI : OrderStatus.DRAFT,
      },
    });

    // 4. Create status history
    await tx.salesOrderStatusHistory.create({
      data: {
        salesOrderId: newOrder.id,
        fromStatus: null,
        toStatus: allItemsAvailable ? OrderStatus.MENUNGGU_KONFIRMASI : OrderStatus.DRAFT,
        changedById: createdById,
        note: "Order created",
      },
    });

    // Return order dengan relasi
    return tx.salesOrder.findUniqueOrThrow({
      where: { id: newOrder.id },
      include: {
        items: {
          include: {
            product: true,
            unit: true,
          },
        },
        customer: true,
        institution: true,
        createdBy: true,
      },
    });
  },
  { timeout: 30000 });

  // Trigger notifications
  try {
    if (order.channel === "ECOMMERCE" || order.orderType === "B2C_ECER") {
      await createNotification({
        userId: order.createdById,
        type: "ORDER_STATUS_CHANGED",
        title: `Pesanan B2C Baru: ${order.orderNumber}`,
        message: `Pesanan ecer B2C ${order.orderNumber} dengan total ${formatCurrency(order.totalAmount.toString())} baru saja masuk.`,
        link: `/erp/orders/${order.id}`,
        priority: "MEDIUM",
        relatedOrderId: order.id,
      });
    } else if (order.entryMethod === "CUSTOMER_PORTAL") {
      await createNotification({
        userId: order.createdById,
        type: "ORDER_STATUS_CHANGED",
        title: `Pesanan B2B Baru: ${order.orderNumber}`,
        message: `Dapur ${order.institution?.name || ""} telah mengajukan pesanan baru ${order.orderNumber} yang memerlukan peninjauan.`,
        link: `/erp/orders/${order.id}`,
        priority: "HIGH",
        relatedOrderId: order.id,
      });
    }
  } catch (err) {
    console.error("[createSalesOrder] Notification trigger failed:", err);
  }

  return order;
}

/**
 * Update order status dengan validasi state machine
 */
export async function updateOrderStatus(
  orderId: string,
  newStatus: OrderStatus,
  changedById: string,
  note?: string
): Promise<void> {
  const order = await prisma.salesOrder.findUniqueOrThrow({
    where: { id: orderId },
  });

  // Validate state transition
  if (!isValidStatusTransition(order.status, newStatus)) {
    throw new Error(
      `Invalid status transition from ${order.status} to ${newStatus}`
    );
  }

  await prisma.$transaction(async (tx) => {
    // Update order status
    await tx.salesOrder.update({
      where: { id: orderId },
      data: { status: newStatus },
    });

    // Record status history
    await tx.salesOrderStatusHistory.create({
      data: {
        salesOrderId: orderId,
        fromStatus: order.status,
        toStatus: newStatus,
        changedById,
        note,
      },
    });
  });

  // Trigger status update notifications
  try {
    await createOrderStatusNotification(
      order.id,
      order.orderNumber,
      order.status,
      newStatus,
      changedById,
      order.dapurIdentityId
    );
  } catch (err) {
    console.error("[updateOrderStatus] Notification trigger failed:", err);
  }
}

/**
 * Validate status transitions berdasarkan state machine (Section 7.1 spec)
 */
function isValidStatusTransition(from: OrderStatus, to: OrderStatus): boolean {
  const validTransitions: Record<OrderStatus, OrderStatus[]> = {
    [OrderStatus.DRAFT]: [OrderStatus.MENUNGGU_KONFIRMASI, OrderStatus.DIBATALKAN],
    [OrderStatus.MENUNGGU_KONFIRMASI]: [OrderStatus.DIKONFIRMASI, OrderStatus.DIBATALKAN],
    [OrderStatus.DIKONFIRMASI]: [
      OrderStatus.MENUNGGU_PENGADAAN,
      OrderStatus.SIAP_KIRIM,
      OrderStatus.DIBATALKAN,
    ],
    [OrderStatus.MENUNGGU_PENGADAAN]: [OrderStatus.SIAP_KIRIM],
    [OrderStatus.SIAP_KIRIM]: [OrderStatus.DALAM_PENGIRIMAN],
    [OrderStatus.DALAM_PENGIRIMAN]: [OrderStatus.TERKIRIM_MENUNGGU_TTD, OrderStatus.SELESAI],
    [OrderStatus.TERKIRIM_MENUNGGU_TTD]: [OrderStatus.SELESAI],
    [OrderStatus.SELESAI]: [],
    [OrderStatus.DIBATALKAN]: [],
  };

  return validTransitions[from]?.includes(to) ?? false;
}

/**
 * Update fulfillment status
 */
export async function updateFulfillmentStatus(
  orderId: string,
  status: FulfillmentStatus
): Promise<void> {
  await prisma.salesOrder.update({
    where: { id: orderId },
    data: { fulfillmentStatus: status },
  });
}

/**
 * Update payment status
 */
export async function updatePaymentStatus(
  orderId: string,
  status: PaymentStatus
): Promise<void> {
  await prisma.salesOrder.update({
    where: { id: orderId },
    data: { paymentStatus: status },
  });
}

/**
 * Get order by ID dengan semua relasi
 */
export async function getSalesOrderById(orderId: string): Promise<SalesOrderWithItems | null> {
  return prisma.salesOrder.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: true,
          unit: true,
          sourcingRequest: true,
        },
      },
      customer: true,
      institution: true,
      createdBy: true,
      statusHistory: {
        orderBy: { changedAt: "desc" },
      },
      deliveryNote: true,
      invoice: true,
      payments: true,
      operationalCosts: true,
    },
  });
}

/**
 * Get orders by filters
 */
export async function getSalesOrders(filters: {
  status?: OrderStatus;
  orderType?: OrderType;
  customerId?: string;
  institutionId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  limit?: number;
  offset?: number;
}) {
  const where: Prisma.SalesOrderWhereInput = {};

  if (filters.status) where.status = filters.status;
  if (filters.orderType) where.orderType = filters.orderType;
  if (filters.customerId) where.customerId = filters.customerId;
  if (filters.institutionId) where.institutionId = filters.institutionId;
  if (filters.dateFrom || filters.dateTo) {
    where.createdAt = {};
    if (filters.dateFrom) where.createdAt.gte = filters.dateFrom;
    if (filters.dateTo) where.createdAt.lte = filters.dateTo;
  }

  const [orders, total] = await Promise.all([
    prisma.salesOrder.findMany({
      where,
      include: {
        customer: true,
        institution: true,
        items: {
          select: {
            id: true,
            qty: true,
            unitSellPrice: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: filters.limit || 50,
      skip: filters.offset || 0,
    }),
    prisma.salesOrder.count({ where }),
  ]);

  return { orders, total };
}
