import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function generateOrderNumber() {
  const date = new Date().toISOString().slice(2, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SO-PORTAL-${date}-${rand}`;
}

export async function POST(req: NextRequest) {
  try {
    const identityId = req.cookies.get("dapur_identity")?.value;
    if (!identityId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const {
      institutionId,
      deliveryAddress,
      requestedDeliveryDate,
      deliveryTimeSlot,
      requestedDeliveryTime,
      items,
      productRequests,
    } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Minimal satu item diperlukan" }, { status: 400 });
    }

    const identity = await prisma.dapurIdentity.findUnique({
      where: { id: identityId, isActive: true },
    });
    if (!identity) {
      return NextResponse.json({ error: "Identity not found" }, { status: 404 });
    }

    const adminUser = await prisma.user.findFirst({ where: { role: "ADMIN_TOKO" } });
    const createdById = adminUser?.id || "portal_system";

    // Calculate deadlines
    const deliveryDate = requestedDeliveryDate ? new Date(requestedDeliveryDate) : null;
    let deliveryDeadline: Date | null = null;
    let sourcingDeadline: Date | null = null;

    if (deliveryDate) {
      if (deliveryTimeSlot === "CUSTOM" && requestedDeliveryTime) {
        const [hours, minutes] = requestedDeliveryTime.split(":").map(Number);
        deliveryDeadline = new Date(deliveryDate);
        deliveryDeadline.setHours(hours, minutes, 0, 0);
      } else if (deliveryTimeSlot === "PAGI") {
        deliveryDeadline = new Date(deliveryDate);
        deliveryDeadline.setHours(12, 0, 0, 0);
      } else if (deliveryTimeSlot === "SIANG") {
        deliveryDeadline = new Date(deliveryDate);
        deliveryDeadline.setHours(17, 0, 0, 0);
      } else if (deliveryTimeSlot === "SORE") {
        deliveryDeadline = new Date(deliveryDate);
        deliveryDeadline.setHours(20, 0, 0, 0);
      } else {
        deliveryDeadline = new Date(deliveryDate);
        deliveryDeadline.setHours(17, 0, 0, 0);
      }

      sourcingDeadline = new Date(deliveryDeadline.getTime() - 60 * 60 * 1000);
    }

    const order = await prisma.$transaction(async (tx) => {
      const salesOrder = await tx.salesOrder.create({
        data: {
          orderNumber: generateOrderNumber(),
          channel: "WHATSAPP_B2B",
          orderType: "B2B_GROSIR",
          institutionId: institutionId || null,
          dapurIdentityId: identityId,
          entryMethod: "CUSTOMER_PORTAL",
          deliveryMethod: "DELIVERY",
          deliveryAddressText: deliveryAddress || identity.deliveryAddress,
          status: "MENUNGGU_KONFIRMASI",
          fulfillmentStatus: "BELUM_DIPROSES",
          paymentStatus: "BELUM_BAYAR",
          customerStatus: "PENDING_REVIEW",
          requestedDeliveryDate: deliveryDate,
          deliveryTimeSlot: deliveryTimeSlot || null,
          requestedDeliveryTime: requestedDeliveryTime || null,
          deliveryDeadline,
          sourcingDeadline,
          subtotal: 0,
          totalAmount: 0,
          totalCostAmount: 0,
          totalMarginAmount: 0,
          createdById,
          statusHistory: {
            create: {
              fromStatus: null,
              toStatus: "MENUNGGU_KONFIRMASI",
              changedById: createdById,
              note: "Pesanan dibuat via portal customer",
              customerNote: "Pesanan Anda sedang ditinjau oleh admin",
              isVisibleToCustomer: true,
            },
          },
        },
      });

      let subtotal = 0;
      for (const item of items) {
        const unitSellPrice = item.unitSellPrice || 0;
        const itemSubtotal = Number(item.qty) * Number(unitSellPrice);
        subtotal += itemSubtotal;

        await tx.salesOrderItem.create({
          data: {
            salesOrderId: salesOrder.id,
            productId: item.productId,
            unitId: item.unitId,
            qty: item.qty,
            unitSellPrice,
            unitCostPrice: 0,
            subtotalSell: itemSubtotal,
            subtotalCost: 0,
            marginAmount: itemSubtotal,
            isAvailableFromStock: false,
          },
        });
      }

      await tx.salesOrder.update({
        where: { id: salesOrder.id },
        data: {
          subtotal,
          totalAmount: subtotal,
        },
      });

      if (productRequests && productRequests.length > 0) {
        for (const req of productRequests) {
          await tx.productRequest.create({
            data: {
              dapurIdentityId: identityId,
              salesOrderId: salesOrder.id,
              productName: req.productName,
              requestedQty: req.requestedQty || 1,
              requestedUnit: req.requestedUnit || "PCS",
              notes: req.notes || null,
              status: "PENDING",
            },
          });
        }
      }

      return tx.salesOrder.findUnique({
        where: { id: salesOrder.id },
        include: {
          items: {
            include: {
              product: { select: { name: true } },
              unit: { select: { code: true } },
            },
          },
          productRequests: true,
        },
      });
    });

    return NextResponse.json({ data: order }, { status: 201 });
  } catch (error) {
    console.error("[/api/portal/orders] Error:", error);
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }
}
