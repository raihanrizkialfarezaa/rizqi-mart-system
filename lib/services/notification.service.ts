import { prisma } from "@/lib/prisma";

type CreateNotificationParams = {
  userId?: string | null;
  dapurIdentityId?: string | null;
  type: string;
  title: string;
  message: string;
  link?: string | null;
  priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  relatedOrderId?: string | null;
};

export async function createNotification(params: CreateNotificationParams) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: params.userId ?? null,
        dapurIdentityId: params.dapurIdentityId ?? null,
        type: params.type,
        title: params.title,
        message: params.message,
        link: params.link ?? null,
        priority: params.priority ?? "MEDIUM",
        relatedOrderId: params.relatedOrderId ?? null,
      },
      select: { id: true },
    });
    return notification;
  } catch (error) {
    console.error("[createNotification] Failed:", error);
    return null;
  }
}

export async function createOrderStatusNotification(
  orderId: string,
  orderNumber: string,
  oldStatus: string | null,
  newStatus: string,
  createdById: string,
  dapurIdentityId?: string | null,
) {
  const statusLabels: Record<string, string> = {
    MENUNGGU_KONFIRMASI: "Menunggu Konfirmasi",
    DIKONFIRMASI: "Dikonfirmasi",
    MENUNGGU_PENGADAAN: "Menunggu Pengadaan",
    SIAP_KIRIM: "Siap Kirim",
    DALAM_PENGIRIMAN: "Dalam Pengiriman",
    SELESAI: "Selesai",
    DIBATALKAN: "Dibatalkan",
  };

  const label = statusLabels[newStatus] || newStatus;

  // Notify admin
  await createNotification({
    userId: createdById,
    type: "ORDER_STATUS_CHANGED",
    title: `Status Pesanan: ${orderNumber}`,
    message: `Pesanan ${orderNumber} berubah menjadi "${label}"`,
    link: `/erp/orders/${orderId}`,
    priority: "MEDIUM",
    relatedOrderId: orderId,
  });

  // Notify customer
  if (dapurIdentityId) {
    await createNotification({
      dapurIdentityId,
      type: "ORDER_STATUS_CHANGED",
      title: `Update Pesanan ${orderNumber}`,
      message: `Status pesanan Anda telah berubah menjadi "${label}"`,
      link: `/portal/orders/${orderId}`,
      priority: "MEDIUM",
      relatedOrderId: orderId,
    });
  }
}
