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
import { toDecimal, addDecimal, multiplyDecimal, divideDecimal } from "@/lib/utils/decimal";
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
  discountAmount?: number;
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

export type SalesOrderDetail = Prisma.SalesOrderGetPayload<{
  include: {
    items: {
      include: {
        product: true;
        unit: true;
        sourcingRequest: true;
      };
    };
    customer: true;
    institution: true;
    createdBy: true;
    statusHistory: {
      orderBy: { changedAt: "desc" };
    };
    deliveryNote: true;
    invoice: true;
    payments: true;
    operationalCosts: true;
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
    discountAmount: inputDiscountAmount = 0,
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

      // Resolve conversion factor
      let conversionFactor = item.baseUnitConversion || 1;
      const product = await tx.product.findUnique({
        where: { id: item.productId },
        select: { baseUnitId: true }
      });
      if (product && product.baseUnitId !== item.unitId) {
        const conv = await tx.productUnitConversion.findUnique({
          where: {
            productId_unitId: {
              productId: item.productId,
              unitId: item.unitId,
            },
          },
        });
        if (conv) {
          conversionFactor = Number(conv.conversionToBase);
        }
      }

      const qtyNeededBase = multiplyDecimal(item.qty, conversionFactor);

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

      let allocationResult;

      if (orderType === "B2B_GROSIR") {
        // Calculate virtual booking
        // a. Get physical stock
        const batches = await tx.stockBatch.findMany({
          where: { productId: item.productId, qtyRemainingBase: { gt: 0 } },
          select: { qtyRemainingBase: true },
        });
        const physical = batches.reduce((sum, b) => sum.add(toDecimal(b.qtyRemainingBase)), toDecimal(0));

        // b. Get active B2B bookings (status not SELESAI or DIBATALKAN, excluding the current order)
        const activeB2BItems = await tx.salesOrderItem.findMany({
          where: {
            productId: item.productId,
            salesOrder: {
              orderType: "B2B_GROSIR",
              status: { notIn: ["SELESAI", "DIBATALKAN"] },
              id: { not: newOrder.id }
            }
          },
          include: { product: { select: { baseUnitId: true } } }
        });

        let booked = toDecimal(0);
        for (const activeItem of activeB2BItems) {
          let factor = 1;
          if (activeItem.unitId !== activeItem.product.baseUnitId) {
            const conv = await tx.productUnitConversion.findUnique({
              where: {
                productId_unitId: {
                  productId: activeItem.productId,
                  unitId: activeItem.unitId,
                },
              },
            });
            if (conv) {
              factor = Number(conv.conversionToBase);
            }
          }
          booked = booked.add(multiplyDecimal(activeItem.qty, factor));
        }

        const unbooked = Decimal.max(0, physical.minus(booked));
        const coveredBase = Decimal.min(qtyNeededBase, unbooked);
        const shortageBase = qtyNeededBase.minus(coveredBase);
        const shortageOrderUnit = divideDecimal(shortageBase, conversionFactor);

        allocationResult = {
          allocated: shortageBase.lte(0),
          totalCost: toDecimal(0),
          unitCostPrice: toDecimal(0),
          needsSourcing: shortageBase.gt(0),
          remainingQty: shortageOrderUnit,
        };
      } else {
        // Allocate stock for B2C
        allocationResult = await allocateStock({
          productId: item.productId,
          qtyNeeded: item.qty,
          salesOrderItemId: orderItem.id,
          actorId: createdById,
          baseUnitConversion: conversionFactor,
        }, tx);
      }

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
        const deadline = sourcingDeadline || requestedDeadline || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
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
    const discountDecimal = toDecimal(inputDiscountAmount || 0);
    const totalAmount = Decimal.max(0, subtotal.minus(discountDecimal));
    const totalMargin = totalAmount.minus(totalCost);
    const resolvedStatus = (orderType === "B2B_GROSIR" || allItemsAvailable)
      ? OrderStatus.MENUNGGU_KONFIRMASI
      : OrderStatus.DRAFT;

    await tx.salesOrder.update({
      where: { id: newOrder.id },
      data: {
        subtotal: subtotal.toNumber(),
        discountAmount: discountDecimal.toNumber(),
        totalAmount: totalAmount.toNumber(),
        totalCostAmount: totalCost.toNumber(),
        totalMarginAmount: totalMargin.toNumber(),
        status: resolvedStatus,
      },
    });

    // 4. Create status history
    await tx.salesOrderStatusHistory.create({
      data: {
        salesOrderId: newOrder.id,
        fromStatus: null,
        toStatus: resolvedStatus,
        changedById: createdById,
        note: "Order created",
        customerNote: orderType === "B2B_GROSIR" ? "Pesanan Anda sedang ditinjau oleh admin" : undefined,
        isVisibleToCustomer: orderType === "B2B_GROSIR",
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

  // Pre-validate stock for B2B orders before marking as completed
  if (newStatus === OrderStatus.SELESAI && order.orderType === OrderType.B2B_GROSIR) {
    const items = await prisma.salesOrderItem.findMany({
      where: { salesOrderId: orderId },
      include: { product: true }
    });

    for (const item of items) {
      let conversionFactor = 1;
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
          conversionFactor = Number(conv.conversionToBase);
        }
      }

      const qtyNeededBase = multiplyDecimal(item.qty, conversionFactor);

      const batches = await prisma.stockBatch.findMany({
        where: { productId: item.productId, qtyRemainingBase: { gt: 0 } },
        select: { qtyRemainingBase: true },
      });
      const physical = batches.reduce((sum, b) => sum.add(toDecimal(b.qtyRemainingBase)), toDecimal(0));

      if (physical.lt(qtyNeededBase)) {
        throw new Error(
          `Stok fisik produk '${item.product.name}' tidak mencukupi untuk menyelesaikan pesanan B2B. Kebutuhan: ${qtyNeededBase.toString()} unit base, Tersedia: ${physical.toString()} unit base. Silakan lakukan pengadaan barang terlebih dahulu.`
        );
      }
    }
  }

  await prisma.$transaction(async (tx) => {
    // If B2B order is transitioning to SELESAI, deduct stock physically
    if (newStatus === OrderStatus.SELESAI && order.orderType === OrderType.B2B_GROSIR) {
      const items = await tx.salesOrderItem.findMany({
        where: { salesOrderId: orderId },
        include: { product: true }
      });

      let totalCost = toDecimal(0);

      for (const item of items) {
        let conversionFactor = 1;
        if (item.unitId !== item.product.baseUnitId) {
          const conv = await tx.productUnitConversion.findUnique({
            where: {
              productId_unitId: {
                productId: item.productId,
                unitId: item.unitId,
              },
            },
          });
          if (conv) {
            conversionFactor = Number(conv.conversionToBase);
          }
        }

        const allocationResult = await allocateStock({
          productId: item.productId,
          qtyNeeded: item.qty,
          salesOrderItemId: item.id,
          actorId: changedById,
          baseUnitConversion: conversionFactor,
        }, tx);

        if (allocationResult.needsSourcing) {
          throw new Error(
            `Gagal memotong stok produk '${item.product.name}'. Stok tidak mencukupi.`
          );
        }

        const marginAmount = multiplyDecimal(item.qty, item.unitSellPrice).minus(
          allocationResult.totalCost
        );

        await tx.salesOrderItem.update({
          where: { id: item.id },
          data: {
            unitCostPrice: allocationResult.unitCostPrice.toNumber(),
            subtotalCost: allocationResult.totalCost.toNumber(),
            marginAmount: marginAmount.toNumber(),
            isAvailableFromStock: true,
          },
        });

        totalCost = addDecimal(totalCost, allocationResult.totalCost);
      }

      // Update total cost and margin on order
      const currentOrder = await tx.salesOrder.findUniqueOrThrow({
        where: { id: orderId },
        select: { subtotal: true }
      });
      const subtotal = toDecimal(currentOrder.subtotal);
      const totalMargin = subtotal.minus(totalCost);

      await tx.salesOrder.update({
        where: { id: orderId },
        data: {
          totalCostAmount: totalCost.toNumber(),
          totalMarginAmount: totalMargin.toNumber(),
        }
      });
    }

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
export async function getSalesOrderById(orderId: string): Promise<SalesOrderDetail | null> {
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
