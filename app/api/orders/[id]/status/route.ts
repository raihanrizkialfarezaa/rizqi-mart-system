import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { OrderStatus } from "@prisma/client";
import { updateOrderStatus } from "@/lib/services/sales-order.service";
import { prisma } from "@/lib/prisma";

/**
 * PATCH /api/orders/[id]/status
 * Update status pesanan dengan validasi state machine (service layer).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const newStatus = body.status as OrderStatus;
    const note = body.note as string | undefined;

    if (!newStatus || !(newStatus in OrderStatus)) {
      return NextResponse.json(
        { error: "Status tidak valid" },
        { status: 400 }
      );
    }

    // Resolve internal user id dari clerkId
    const user = await prisma.user.findUnique({
      where: { clerkId: userId },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json(
        { error: "User tidak ditemukan" },
        { status: 403 }
      );
    }

    await updateOrderStatus(params.id, newStatus, user.id, note);

    return NextResponse.json({ success: true, status: newStatus });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal update status";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
