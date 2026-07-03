import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    let dapurIdentityId = searchParams.get("dapurIdentityId");
    const userId = searchParams.get("userId");
    const unreadOnly = searchParams.get("unread") === "true";

    // If dapurIdentityId is "current", read from cookie
    if (dapurIdentityId === "current") {
      dapurIdentityId = req.cookies.get("dapur_identity")?.value || null;
    }

    const where: Record<string, unknown> = {};

    if (dapurIdentityId) {
      where.dapurIdentityId = dapurIdentityId;
    } else if (userId) {
      where.userId = userId;
    }

    if (unreadOnly) {
      where.isRead = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        link: true,
        priority: true,
        isRead: true,
        createdAt: true,
        relatedOrderId: true,
      },
    });

    const unreadCount = await prisma.notification.count({
      where: { ...where, isRead: false },
    });

    return NextResponse.json({ data: notifications, unreadCount });
  } catch (error) {
    console.error("[/api/notifications] Error:", error);
    return NextResponse.json({ data: [], unreadCount: 0 }, { status: 500 });
  }
}
