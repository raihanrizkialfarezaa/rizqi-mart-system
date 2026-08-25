import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSalesOrder, CreateSalesOrderInput } from "@/lib/services/sales-order.service";
import { SalesChannel, OrderType, DeliveryMethod, PaymentMethod, PaymentStatus } from "@prisma/client";

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
      paymentMethod: rawPaymentMethod,
    } = body;

    if (!customerName) {
      return NextResponse.json({ error: "Nama pembeli diperlukan" }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Minimal satu item diperlukan" }, { status: 400 });
    }

    const cleanPhone = phone?.trim() || "";
    const cleanEmail = email?.trim() || null;

    // 1. Find or create the Customer (B2C)
    let customer = null;
    if (cleanPhone) {
      customer = await prisma.customer.findFirst({
        where: { phone: cleanPhone },
      });
    }

    if (!customer && cleanEmail) {
      customer = await prisma.customer.findFirst({
        where: { email: cleanEmail },
      });
    }

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          name: customerName.trim(),
          phone: cleanPhone || `NO_PHONE_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          email: cleanEmail,
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

    // 4. Create initial Payment row — critical for COD vs prepaid gating
    //    - COD (CASH): starts BELUM_BAYAR, only admin/kurir can set LUNAS on cash collection (prevents user self-approval)
    //    - TRANSFER_BANK / QRIS: starts BELUM_BAYAR, becomes MENUNGGU_VALIDASI after user uploads proof, then LUNAS after admin validation
    //    This fixes legacy bug where paymentMethod was discarded and order stayed BELUM_BAYAR without Payment row.
    try {
      const methodRaw = String(rawPaymentMethod || "TRANSFER_BANK").toUpperCase();
      const method: PaymentMethod =
        methodRaw === "CASH" ? PaymentMethod.CASH : methodRaw === "QRIS" ? PaymentMethod.QRIS : PaymentMethod.TRANSFER_BANK;

      const totalAmt = Number(order.totalAmount);
      const CASHLESS_THRESHOLD = parseFloat(process.env.CASHLESS_VALIDATION_THRESHOLD || "500000");
      const requiresValidation = (method === PaymentMethod.TRANSFER_BANK || method === PaymentMethod.QRIS) && totalAmt < CASHLESS_THRESHOLD;

      // Always start BELUM_BAYAR for ecommerce (user must complete payment step); CASH COD will remain BELUM_BAYAR until courier confirms.
      await prisma.payment.create({
        data: {
          paymentNumber: `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`,
          salesOrderId: order.id,
          method,
          amount: totalAmt,
          status: PaymentStatus.BELUM_BAYAR,
          requiresValidation,
        },
      });
      // Ensure SalesOrder.paymentStatus is in sync (createSalesOrder defaults to BELUM_BAYAR anyway)
      if (order.paymentStatus !== PaymentStatus.BELUM_BAYAR) {
        await prisma.salesOrder.update({ where: { id: order.id }, data: { paymentStatus: PaymentStatus.BELUM_BAYAR } });
      }
    } catch (payErr) {
      console.error("[/api/ecommerce/orders] create payment failed (non-fatal):", payErr);
      // Do not fail order creation if payment row fails — order is still valid, payment can be created later via admin panel
    }

    // Re-fetch order with payments for response consistency
    const orderWithPayment = await prisma.salesOrder.findUnique({
      where: { id: order.id },
      include: { payments: true, items: { include: { product: true, unit: true } } },
    });

    return NextResponse.json({ success: true, data: orderWithPayment || order }, { status: 201 });
  } catch (error: any) {
    console.error("[/api/ecommerce/orders] Error:", error);
    return NextResponse.json({ error: error.message || "Gagal membuat pesanan" }, { status: 500 });
  }
}
