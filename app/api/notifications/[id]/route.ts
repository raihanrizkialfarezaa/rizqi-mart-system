import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.notification.update({
      where: { id },
      data: { isRead: true, readAt: new Date() },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
