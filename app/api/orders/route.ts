import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { createSalesOrder, CreateSalesOrderInput } from "@/lib/services/sales-order.service";
import { SalesChannel, OrderType, DeliveryMethod } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();

    const channel = body.channel as SalesChannel;
    const orderType = body.orderType as OrderType;
    const deliveryMethod = body.deliveryMethod as DeliveryMethod;

    if (!channel || !(channel in SalesChannel)) {
      return NextResponse.json({ error: "Channel tidak valid" }, { status: 400 });
    }
    if (!orderType || !(orderType in OrderType)) {
      return NextResponse.json({ error: "Tipe pesanan tidak valid" }, { status: 400 });
    }
    if (!deliveryMethod || !(deliveryMethod in DeliveryMethod)) {
      return NextResponse.json({ error: "Metode pengiriman tidak valid" }, { status: 400 });
    }
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: "Minimal satu item diperlukan" }, { status: 400 });
    }

    let dapurIdentityId = body.dapurIdentityId;
    if (!dapurIdentityId && body.institutionId) {
      const identity = await prisma.dapurIdentity.findUnique({
        where: { institutionId: body.institutionId }
      });
      dapurIdentityId = identity?.id || undefined;
    }

    const input: CreateSalesOrderInput = {
      channel,
      orderType,
      customerId: body.customerId || undefined,
      institutionId: body.institutionId || undefined,
      dapurIdentityId,
      entryMethod: body.entryMethod || "ADMIN_INPUT",
      requestedDeliveryDate: body.requestedDeliveryDate ? new Date(body.requestedDeliveryDate) : undefined,
      requestedDeliveryTime: body.requestedDeliveryTime || undefined,
      deliveryTimeSlot: body.deliveryTimeSlot || undefined,
      customerNote: body.customerNote || undefined,
      deliveryMethod,
      deliveryAddressText: body.deliveryAddressText || undefined,
      deliveryLatitude: body.deliveryLatitude || undefined,
      deliveryLongitude: body.deliveryLongitude || undefined,
      isFreeDelivery: body.isFreeDelivery ?? false,
      requestedDeadline: body.requestedDeadline ? new Date(body.requestedDeadline) : undefined,
      items: body.items.map((item: any) => ({
        productId: item.productId,
        unitId: item.unitId,
        qty: item.qty,
        unitSellPrice: item.unitSellPrice,
        baseUnitConversion: item.baseUnitConversion || 1,
      })),
      createdById: session.id,
    };

    const order = await createSalesOrder(input);

    if (body.productRequests && Array.isArray(body.productRequests)) {
      for (const req of body.productRequests) {
        if (req.productName) {
          await prisma.productRequest.create({
            data: {
              salesOrderId: order.id,
              dapurIdentityId,
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

    return NextResponse.json({ success: true, data: order }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Gagal membuat pesanan";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
