import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

/**
 * GET /api/ecommerce/orders/[id]
 * Fetch order detail in real-time
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const order = await prisma.salesOrder.findUnique({
      where: { id: params.id },
      include: {
        items: {
          include: {
            product: true,
            unit: true,
          },
        },
        customer: true,
        statusHistory: {
          orderBy: { changedAt: "asc" },
        },
        payments: {
          orderBy: { createdAt: "desc" },
        },
        invoice: true,
        deliveryNote: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: order });
  } catch (error: any) {
    console.error("[GET /api/ecommerce/orders/[id]] Error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal mengambil data pesanan" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/ecommerce/orders/[id]
 * Perform order actions: CANCEL, MARK_RECEIVED, UPLOAD_PAYMENT_PROOF
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    const body = await req.json();
    const { action, proofUrl } = body;

    const order = await prisma.salesOrder.findUnique({
      where: { id: params.id },
      include: {
        payments: true,
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Pesanan tidak ditemukan" }, { status: 404 });
    }

    const userId = session?.id || order.createdById;

    if (action === "CANCEL") {
      if (order.status !== "DRAFT" && order.status !== "MENUNGGU_KONFIRMASI") {
        return NextResponse.json(
          { error: "Pesanan yang sudah diproses tidak dapat dibatalkan" },
          { status: 400 }
        );
      }

      const updated = await prisma.$transaction(async (tx) => {
        const so = await tx.salesOrder.update({
          where: { id: params.id },
          data: {
            status: "DIBATALKAN",
          },
        });

        await tx.salesOrderStatusHistory.create({
          data: {
            salesOrderId: params.id,
            fromStatus: order.status,
            toStatus: "DIBATALKAN",
            changedById: userId,
            note: "Pesanan dibatalkan oleh pembeli",
            customerNote: "Pesanan dibatalkan oleh pembeli",
          },
        });

        return so;
      });

      return NextResponse.json({ success: true, data: updated, message: "Pesanan berhasil dibatalkan" });
    }

    if (action === "MARK_RECEIVED") {
      if (order.status === "SELESAI" || order.status === "DIBATALKAN") {
        return NextResponse.json(
          { error: "Status pesanan tidak valid untuk diselesaikan" },
          { status: 400 }
        );
      }

      const updated = await prisma.$transaction(async (tx) => {
        const so = await tx.salesOrder.update({
          where: { id: params.id },
          data: {
            status: "SELESAI",
            fulfillmentStatus: "LENGKAP",
          },
        });

        await tx.salesOrderStatusHistory.create({
          data: {
            salesOrderId: params.id,
            fromStatus: order.status,
            toStatus: "SELESAI",
            changedById: userId,
            note: "Pesanan telah diterima oleh pembeli",
            customerNote: "Pesanan telah diterima oleh pembeli",
          },
        });

        return so;
      });

      return NextResponse.json({ success: true, data: updated, message: "Pesanan telah dikonfirmasi selesai" });
    }

    if (action === "UPLOAD_PAYMENT_PROOF") {
      if (!proofUrl) {
        return NextResponse.json({ error: "URL bukti transfer/pembayaran wajib disertakan" }, { status: 400 });
      }

      let primaryPayment = order.payments[0];

      if (primaryPayment) {
        await prisma.payment.update({
          where: { id: primaryPayment.id },
          data: {
            proofFileUrl: proofUrl,
            status: "MENUNGGU_VALIDASI",
            requiresValidation: true,
          },
        });
      } else {
        await prisma.payment.create({
          data: {
            paymentNumber: `PAY-${Date.now()}`,
            salesOrderId: order.id,
            method: "TRANSFER_BANK",
            amount: order.totalAmount,
            status: "MENUNGGU_VALIDASI",
            requiresValidation: true,
            proofFileUrl: proofUrl,
          },
        });
      }

      const updatedOrder = await prisma.salesOrder.update({
        where: { id: params.id },
        data: {
          paymentStatus: "MENUNGGU_VALIDASI",
        },
      });

      return NextResponse.json({
        success: true,
        data: updatedOrder,
        message: "Bukti pembayaran berhasil diunggah. Menunggu konfirmasi admin toko.",
      });
    }

    return NextResponse.json({ error: "Aksi tidak dikenal" }, { status: 400 });
  } catch (error: any) {
    console.error("[PATCH /api/ecommerce/orders/[id]] Error:", error);
    return NextResponse.json(
      { error: error.message || "Gagal memperbarui pesanan" },
      { status: 500 }
    );
  }
}
