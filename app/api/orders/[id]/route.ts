import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

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
    const {
      deliveryAddressText,
      requestedDeliveryDate,
      deliveryTimeSlot,
      requestedDeliveryTime,
      customerNote,
      status,
      paymentStatus,
    } = body;

    const order = await prisma.salesOrder.findUnique({
      where: { id: params.id },
    });

    if (!order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });
    }

    // Update the order details
    const updated = await prisma.salesOrder.update({
      where: { id: params.id },
      data: {
        ...(deliveryAddressText !== undefined && { deliveryAddressText }),
        ...(requestedDeliveryDate !== undefined && { requestedDeliveryDate: requestedDeliveryDate ? new Date(requestedDeliveryDate) : null }),
        ...(deliveryTimeSlot !== undefined && { deliveryTimeSlot }),
        ...(requestedDeliveryTime !== undefined && { requestedDeliveryTime }),
        ...(customerNote !== undefined && { customerNote }),
        ...(status !== undefined && { status }),
        ...(paymentStatus !== undefined && { paymentStatus }),
      },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error("[PATCH /api/orders/[id]] Error:", error);
    return NextResponse.json({ error: error.message || "Gagal mengubah pesanan" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const order = await prisma.salesOrder.findUnique({
      where: { id: params.id },
    });

    if (!order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });
    }

    // Delete related records first
    await prisma.$transaction([
      prisma.salesOrderItem.deleteMany({ where: { salesOrderId: params.id } }),
      prisma.salesOrderStatusHistory.deleteMany({ where: { salesOrderId: params.id } }),
      prisma.productRequest.deleteMany({ where: { salesOrderId: params.id } }),
      prisma.notification.deleteMany({ where: { relatedOrderId: params.id } }),
      prisma.salesOrder.delete({ where: { id: params.id } }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[DELETE /api/orders/[id]] Error:", error);
    return NextResponse.json({ error: error.message || "Gagal menghapus pesanan" }, { status: 500 });
  }
}
