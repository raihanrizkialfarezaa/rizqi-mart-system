import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validatePriceCeiling } from "@/lib/services/sales-order-calculations";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = _req.nextUrl;
    const productId = searchParams.get("productId");
    const unitId = searchParams.get("unitId");
    const price = searchParams.get("price");

    if (!productId || !unitId) {
      return NextResponse.json({ error: "productId dan unitId required" }, { status: 400 });
    }

    if (price) {
      const result = await validatePriceCeiling(
        id,
        productId,
        unitId,
        Number(price)
      );
      return NextResponse.json({ data: result });
    }

    const agreement = await prisma.customerProductAgreement.findFirst({
      where: {
        institutionId: id,
        productId,
        unitId,
        effectiveFrom: { lte: new Date() },
        OR: [{ effectiveUntil: null }, { effectiveUntil: { gte: new Date() } }],
      },
      orderBy: { effectiveFrom: "desc" },
    });

    return NextResponse.json({
      data: agreement
        ? {
            isValid: true,
            priceCeiling: Number(agreement.priceCeiling),
            agreementId: agreement.id,
          }
        : null,
    });
  } catch {
    return NextResponse.json({ data: null });
  }
}
