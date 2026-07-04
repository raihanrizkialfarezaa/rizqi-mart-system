import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const raw = await prisma.sourcingRequest.findUnique({
      where: { id: params.id },
      include: {
        product: { select: { name: true, sku: true } },
        unit: { select: { code: true, name: true } },
        salesOrderItem: {
          include: {
            salesOrder: {
              select: {
                id: true,
                orderNumber: true,
                institution: { select: { name: true } },
              },
            },
          },
        },
        chosenSupplierProduct: {
          include: {
            supplier: { select: { name: true } },
          },
        },
        priceQuotes: {
          include: {
            supplierProduct: {
              include: {
                supplier: { select: { id: true, name: true } },
              },
            },
          },
          orderBy: { price: "asc" },
        },
      },
    });

    if (!raw) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const data = {
      id: raw.id,
      productId: raw.productId,
      qtyNeeded: Number(raw.qtyNeeded),
      deadline: raw.deadline.toISOString(),
      status: raw.status,
      product: raw.product,
      unit: raw.unit,
      salesOrderItem: {
        salesOrder: {
          id: raw.salesOrderItem.salesOrder.id,
          orderNumber: raw.salesOrderItem.salesOrder.orderNumber,
          institution: raw.salesOrderItem.salesOrder.institution,
        },
      },
      chosenSupplierProduct: raw.chosenSupplierProduct
        ? {
            supplier: { name: raw.chosenSupplierProduct.supplier.name },
          }
        : null,
      decisionReason: raw.decisionReason,
      decidedAt: raw.decidedAt ? raw.decidedAt.toISOString() : null,
      priceQuotes: raw.priceQuotes.map((q) => ({
        id: q.id,
        price: Number(q.price),
        isPromo: q.isPromo,
        checkedAt: q.checkedAt.toISOString(),
        validUntil: q.validUntil ? q.validUntil.toISOString() : null,
        notes: q.notes,
        supplierProduct: {
          id: q.supplierProduct.id,
          supplier: q.supplierProduct.supplier,
        },
      })),
    };

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error("[GET /api/procurement/sourcing-requests/[id]] Error:", error);
    return NextResponse.json({ error: "Failed to fetch sourcing request" }, { status: 500 });
  }
}
