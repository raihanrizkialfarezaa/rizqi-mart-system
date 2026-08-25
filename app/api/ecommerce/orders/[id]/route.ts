import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

/**
 * GET /api/ecommerce/orders/[id]
 * Fetch order detail in real-time
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const order = await prisma.salesOrder.findUnique({
      where: { id },
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getSession();
    const body = await req.json();
    const { action, proofUrl } = body;

    const order = await prisma.salesOrder.findUnique({
      where: { id },
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
          where: { id },
          data: {
            status: "DIBATALKAN",
          },
        });

        await tx.salesOrderStatusHistory.create({
          data: {
            salesOrderId: id,
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

      // ── Unified gate: payment must be LUNAS (COD needs admin LUNAS) + fulfillment eligible ──
      // This prevents COD from being self-approved and blocks prepaid before validation.
      const ELIGIBLE_STATUSES = ["SIAP_KIRIM", "DALAM_PENGIRIMAN", "TERKIRIM_MENUNGGU_TTD"];
      const isPickupEligible = order.deliveryMethod === "PICKUP" && order.status === "DIKONFIRMASI" && order.paymentStatus === "LUNAS";
      const isEligibleStatus = ELIGIBLE_STATUSES.includes(order.status) || isPickupEligible;

      if (!isEligibleStatus) {
        return NextResponse.json(
          { error: "Pesanan belum siap untuk dikonfirmasi. Menunggu admin memproses & mengirimkan pesanan (status harus SIAP_KIRIM / DALAM_PENGIRIMAN / TERKIRIM_MENUNGGU_TTD)." },
          { status: 400 }
        );
      }

      if (order.paymentStatus !== "LUNAS") {
        const primaryMethod = order.payments[0]?.method || null;
        const isCOD = primaryMethod === "CASH";
        const msg = isCOD
          ? "Pembayaran COD belum dikonfirmasi kurir/admin. Pesanan COD hanya dapat diselesaikan setelah kurir verifikasi tunai dan status pembayaran menjadi Lunas."
          : order.paymentStatus === "MENUNGGU_VALIDASI"
            ? "Pembayaran menunggu validasi admin. Harap tunggu hingga status menjadi Lunas."
            : "Pembayaran belum lunas. Selesaikan pembayaran terlebih dahulu sebelum konfirmasi.";
        return NextResponse.json({ error: msg }, { status: 402 });
      }

      // Validate state machine transition SELESAI only from eligible
      // (mirrors lib/services/sales-order.service.ts isValidStatusTransition)
      const validPredecessors = ["SIAP_KIRIM", "DALAM_PENGIRIMAN", "TERKIRIM_MENUNGGU_TTD", "DIKONFIRMASI"];
      if (!validPredecessors.includes(order.status)) {
        return NextResponse.json(
          { error: `Transisi status tidak valid dari ${order.status} ke SELESAI` },
          { status: 400 }
        );
      }

      const updated = await prisma.$transaction(async (tx) => {
        const so = await tx.salesOrder.update({
          where: { id },
          data: {
            status: "SELESAI",
            fulfillmentStatus: "LENGKAP",
          },
        });

        await tx.salesOrderStatusHistory.create({
          data: {
            salesOrderId: id,
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

      // COD (CASH) should not use transfer proof flow — payment is cash on delivery via courier
      if (primaryPayment && primaryPayment.method === "CASH") {
        return NextResponse.json(
          { error: "Pesanan COD (Bayar di Tempat) tidak memerlukan bukti transfer. Pembayaran akan dikonfirmasi kurir saat pengantaran." },
          { status: 400 }
        );
      }

      // Determine if this cashless amount requires validation (<500k) or can auto-LUNAS (>=500k with proof)
      const CASHLESS_THRESHOLD = parseFloat(process.env.CASHLESS_VALIDATION_THRESHOLD || "500000");
      const amountNum = Number(order.totalAmount);
      const isSmallCashless = amountNum < CASHLESS_THRESHOLD;

      if (primaryPayment) {
        // For small cashless (<500k) => MENUNGGU_VALIDASI, for >=500k => LUNAS directly (per payment.service.ts:66-72)
        const newStatus = isSmallCashless ? "MENUNGGU_VALIDASI" : "LUNAS";
        // Use raw SQL for proofFileUrl to bypass Prisma String(191) validation — column is now TEXT in DB but client still validates as VARCHAR until `prisma generate` succeeds
        const paidAtVal = newStatus === "LUNAS" ? new Date() : null;
        // Update payment via raw to handle large base64 (up to several MB)
        await prisma.$executeRawUnsafe(
          "UPDATE `Payment` SET `proofFileUrl` = ?, `status` = ?, `requiresValidation` = ?, `paidAt` = ? WHERE `id` = ?",
          proofUrl,
          newStatus,
          isSmallCashless ? 1 : 0,
          paidAtVal,
          primaryPayment.id
        );
        const updatedOrder = await prisma.salesOrder.update({
          where: { id },
          data: {
            paymentStatus: newStatus as any,
          },
        });
        return NextResponse.json({
          success: true,
          data: updatedOrder,
          message:
            newStatus === "LUNAS"
              ? "Bukti pembayaran diterima — pembayaran otomatis terverifikasi (nominal >= Rp500.000)."
              : "Bukti pembayaran berhasil diunggah. Menunggu konfirmasi admin toko.",
        });
      } else {
        // Legacy order without Payment row (should not happen after fix, but handle for robustness)
        const newStatus = isSmallCashless ? "MENUNGGU_VALIDASI" : "LUNAS";
        const paidAtVal = newStatus === "LUNAS" ? new Date() : null;
        const newId = `pay_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
        // Use raw INSERT to bypass length validation for proofFileUrl TEXT
        await prisma.$executeRawUnsafe(
          "INSERT INTO `Payment` (`id`, `paymentNumber`, `salesOrderId`, `method`, `amount`, `status`, `requiresValidation`, `proofFileUrl`, `paidAt`, `createdAt`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())",
          newId,
          `PAY-${Date.now()}`,
          order.id,
          "TRANSFER_BANK",
          Number(order.totalAmount),
          newStatus,
          isSmallCashless ? 1 : 0,
          proofUrl,
          paidAtVal
        );
        const updatedOrder = await prisma.salesOrder.update({
          where: { id },
          data: {
            paymentStatus: newStatus as any,
          },
        });
        return NextResponse.json({
          success: true,
          data: updatedOrder,
          message:
            newStatus === "LUNAS"
              ? "Bukti pembayaran diterima — pembayaran otomatis terverifikasi."
              : "Bukti pembayaran berhasil diunggah. Menunggu konfirmasi admin toko.",
        });
      }
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
