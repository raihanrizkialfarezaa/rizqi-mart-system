import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSalesOrder, CreateSalesOrderInput } from "@/lib/services/sales-order.service";
import { SalesChannel, OrderType, DeliveryMethod } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      customerName,
      phone,
      email,
      deliveryMethod,
      address,
      kecamatan,
      items,
      customerNote,
      discountAmount,
    } = body;

    if (!customerName || !phone) {
      return NextResponse.json({ error: "Nama dan Nomor HP diperlukan" }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Minimal satu item diperlukan" }, { status: 400 });
    }

    // 1. Find or create the Customer (B2C)
    let customer = await prisma.customer.findFirst({
      where: { phone: phone.trim() },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: customerName.trim(),
          phone: phone.trim(),
          email: email?.trim() || null,
        },
      });
    }

    // Resolve units for each item from the product records in the database
    const resolvedItems = [];
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: {
          sellingPrices: {
            where: { customerType: "RETAIL", isActive: true },
            orderBy: { effectiveFrom: "desc" },
            take: 1,
          },
        },
      });

      if (!product) {
        return NextResponse.json({ error: `Produk dengan ID ${item.productId} tidak ditemukan` }, { status: 400 });
      }

      // Use selling price unit, or fallback to base unit
      const unitId = product.sellingPrices[0]?.unitId || product.baseUnitId;
      const unitPrice = product.sellingPrices[0] ? Number(product.sellingPrices[0].price) : item.price;

      resolvedItems.push({
        productId: product.id,
        unitId,
        qty: item.quantity,
        unitSellPrice: unitPrice,
        baseUnitConversion: 1,
      });
    }

    // 2. Prepare sales order input
    const input: CreateSalesOrderInput = {
      channel: SalesChannel.ECOMMERCE,
      orderType: OrderType.B2C_ECER,
      customerId: customer.id,
      deliveryMethod: deliveryMethod === "PICKUP" ? DeliveryMethod.PICKUP : DeliveryMethod.DELIVERY,
      deliveryAddressText: address ? `${address}${kecamatan ? `, Kecamatan ${kecamatan}` : ""}` : "Ambil di Toko (Pickup)",
      isFreeDelivery: true,
      entryMethod: "CUSTOMER_PORTAL",
      customerNote: customerNote || undefined,
      discountAmount: typeof discountAmount === "number" ? discountAmount : 0,
      items: resolvedItems,
      createdById: "admin_toko_cuid", // fallback to seed admin ID
    };

    // 3. Create sales order (triggers stock allocation)
    const order = await createSalesOrder(input);

    return NextResponse.json({ success: true, data: order }, { status: 201 });
  } catch (error: any) {
    console.error("[/api/ecommerce/orders] Error:", error);
    return NextResponse.json({ error: error.message || "Gagal membuat pesanan" }, { status: 500 });
  }
}
