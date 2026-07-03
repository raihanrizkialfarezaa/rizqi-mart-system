import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/services/notification.service";

export async function GET() {
  try {
    const now = new Date();
    let alertCount = 0;

    // 1. Check SOURCING deadline approaching (within 60 minutes)
    const ordersNearSourcing = await prisma.salesOrder.findMany({
      where: {
        status: { in: ["DIKONFIRMASI", "MENUNGGU_PENGADAAN"] },
        sourcingDeadline: {
          lte: new Date(now.getTime() + 60 * 60 * 1000),
          gte: now,
        },
        sourcingAlertSent: false,
      },
      include: { dapurIdentity: { select: { id: true, displayName: true } } },
    });

    for (const order of ordersNearSourcing) {
      const minutesLeft = Math.round(
        (order.sourcingDeadline!.getTime() - now.getTime()) / 60000
      );

      // Alert admin
      await createNotification({
        userId: order.createdById,
        type: "SOURCING_DEADLINE_APPROACHING",
        title: `⚠️ Deadline Sourcing: ${order.orderNumber}`,
        message: `Tersisa ${minutesLeft} menit untuk mencari barang sebelum deadline pengiriman!`,
        link: `/erp/orders/${order.id}`,
        priority: "URGENT",
        relatedOrderId: order.id,
      });

      // Alert customer
      if (order.dapurIdentityId) {
        await createNotification({
          dapurIdentityId: order.dapurIdentityId,
          type: "SOURCING_DEADLINE_APPROACHING",
          title: `Status Pesanan ${order.orderNumber}`,
          message: `Admin sedang mencari barang untuk pesanan Anda. ${minutesLeft} menit menuju deadline.`,
          link: `/portal/orders/${order.id}`,
          priority: "HIGH",
          relatedOrderId: order.id,
        });
      }

      await prisma.salesOrder.update({
        where: { id: order.id },
        data: { sourcingAlertSent: true, lastAlertSentAt: now },
      });

      alertCount++;
    }

    // 2. Check DELIVERY deadline approaching (within 24 hours)
    const ordersNearDelivery = await prisma.salesOrder.findMany({
      where: {
        status: { notIn: ["SELESAI", "DIBATALKAN", "DRAFT"] },
        deliveryDeadline: {
          lte: new Date(now.getTime() + 24 * 60 * 60 * 1000),
          gte: now,
        },
        deliveryAlertSent: false,
      },
      include: { dapurIdentity: { select: { id: true, displayName: true } } },
    });

    for (const order of ordersNearDelivery) {
      const hoursLeft = Math.round(
        (order.deliveryDeadline!.getTime() - now.getTime()) / 3600000
      );

      // Alert admin
      await createNotification({
        userId: order.createdById,
        type: "DELIVERY_DEADLINE_APPROACHING",
        title: `📦 Deadline Pengiriman: ${order.orderNumber}`,
        message: `Waktu pengiriman dalam ${hoursLeft} jam! Pastikan semua barang sudah siap.`,
        link: `/erp/orders/${order.id}`,
        priority: hoursLeft <= 3 ? "URGENT" : "HIGH",
        relatedOrderId: order.id,
      });

      // Alert customer
      if (order.dapurIdentityId) {
        await createNotification({
          dapurIdentityId: order.dapurIdentityId,
          type: "DELIVERY_DEADLINE_APPROACHING",
          title: `Pengiriman Pesanan ${order.orderNumber}`,
          message: `Pesanan Anda akan dikirim dalam ${hoursLeft} jam. Pastikan ada yang menerima.`,
          link: `/portal/orders/${order.id}`,
          priority: "MEDIUM",
          relatedOrderId: order.id,
        });
      }

      await prisma.salesOrder.update({
        where: { id: order.id },
        data: { deliveryAlertSent: true, lastAlertSentAt: now },
      });

      alertCount++;
    }

    // 3. Check PAST deadlines
    const ordersPastSourcing = await prisma.salesOrder.findMany({
      where: {
        status: "DIKONFIRMASI",
        sourcingDeadline: { lt: now },
        sourcingAlertSent: true,
      },
    });

    for (const order of ordersPastSourcing) {
      await prisma.salesOrder.update({
        where: { id: order.id },
        data: {
          status: "MENUNGGU_PENGADAAN",
          customerStatus: "SOURCING",
        },
      });

      await createNotification({
        userId: order.createdById,
        type: "SOURCING_DEADLINE_PASSED",
        title: `🔴 Deadline Sourcing Lewat: ${order.orderNumber}`,
        message: `Deadline pencarian telah lewat. Order masih perlu diproses.`,
        link: `/erp/orders/${order.id}`,
        priority: "HIGH",
        relatedOrderId: order.id,
      });

      await prisma.salesOrderStatusHistory.create({
        data: {
          salesOrderId: order.id,
          fromStatus: "DIKONFIRMASI",
          toStatus: "MENUNGGU_PENGADAAN",
          changedById: order.createdById,
          note: "Deadline sourcing terlewat (auto-update oleh sistem)",
          customerNote: "Admin masih dalam proses mencari barang untuk pesanan Anda",
          isVisibleToCustomer: true,
        },
      });

      alertCount++;
    }

    return NextResponse.json({
      checked: true,
      alertsCreated: alertCount,
      timestamp: now.toISOString(),
    });
  } catch (error) {
    console.error("[/api/cron/check-deadlines] Error:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
