import { prisma } from "@/lib/prisma";

export type NotificationItem = {
  id: string;
  templateName: string;
  message: string;
  channel: string;
  recipientPhone: string;
  relatedSalesOrderId: string | null;
  status: string;
  sentAt: Date;
};

export async function getRecentNotifications(limit = 10): Promise<NotificationItem[]> {
  return prisma.notificationLog.findMany({
    take: limit,
    orderBy: { sentAt: "desc" },
  });
}
