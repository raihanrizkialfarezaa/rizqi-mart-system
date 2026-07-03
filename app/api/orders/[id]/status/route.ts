import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
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
    const session = await getSession();
    if (!session) {
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

    await updateOrderStatus(params.id, newStatus, session.id, note);

    return NextResponse.json({ success: true, status: newStatus });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Gagal update status";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
