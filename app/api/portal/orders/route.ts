import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSalesOrder, CreateSalesOrderInput } from "@/lib/services/sales-order.service";

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

    const input: CreateSalesOrderInput = {
      channel: "WHATSAPP_B2B",
      orderType: "B2B_GROSIR",
      institutionId: institutionId || undefined,
      dapurIdentityId: identityId,
      entryMethod: "CUSTOMER_PORTAL",
      requestedDeliveryDate: requestedDeliveryDate ? new Date(requestedDeliveryDate) : undefined,
      requestedDeliveryTime: requestedDeliveryTime || undefined,
      deliveryTimeSlot: deliveryTimeSlot || undefined,
      deliveryMethod: "DELIVERY",
      deliveryAddressText: deliveryAddress || identity.deliveryAddress,
      isFreeDelivery: false,
      items: items.map((item: any) => ({
        productId: item.productId,
        unitId: item.unitId,
        qty: item.qty,
        unitSellPrice: item.unitSellPrice,
        baseUnitConversion: 1, // Will be resolved dynamically by the service
      })),
      createdById,
    };

    const order = await createSalesOrder(input);

    if (productRequests && productRequests.length > 0) {
      for (const req of productRequests) {
        if (req.productName) {
          await prisma.productRequest.create({
            data: {
              dapurIdentityId: identityId,
              salesOrderId: order.id,
              productName: req.productName,
              requestedQty: req.requestedQty || 1,
              requestedUnit: req.requestedUnit || "PCS",
              notes: req.notes || null,
              status: "PENDING",
            },
          });
        }
      }
    }

    const populatedOrder = await prisma.salesOrder.findUnique({
      where: { id: order.id },
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

    return NextResponse.json({ data: populatedOrder }, { status: 201 });
  } catch (error: any) {
    console.error("[/api/portal/orders] Error:", error);
    return NextResponse.json({ error: error.message || "Failed to create order" }, { status: 500 });
  }
}
