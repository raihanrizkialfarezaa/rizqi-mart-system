import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const requests = await prisma.productRequest.findMany({
      include: {
        dapurIdentity: {
          select: { id: true, displayName: true, primaryContact: true },
        },
        salesOrder: {
          select: { id: true, orderNumber: true },
        },
        createdProduct: { select: { id: true, name: true, sku: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });

    return NextResponse.json({ data: requests });
  } catch (error) {
    console.error("[/api/product-requests] Error:", error);
    return NextResponse.json({ error: "Failed to fetch requests" }, { status: 500 });
  }
}
