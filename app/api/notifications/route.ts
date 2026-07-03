import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const notifications = await prisma.notificationLog.findMany({
      take: 10,
      orderBy: { sentAt: "desc" },
    });
    return NextResponse.json(notifications);
  } catch {
    return NextResponse.json([], { status: 500 });
  }
}
